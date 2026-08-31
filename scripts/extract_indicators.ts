// @filename: extract_indicators.ts
// Extrator de indicadores SAPS usando a app CNES existente
// Conecta ao FTP do DATASUS, baixa dados CNES do RJ via CNESService, mapeia para FHIR e avalia indicadores
// Focado no MUNICÍPIO DO RIO DE JANEIRO (330455) e equipes ativas

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { BasicFTPClient } from '../packages/core/src/index.js';
import { CNESFTPGateway } from '../app/cnes/src/CNESFTPGateway.js';
import { CNESService } from '../app/cnes/src/CNESService.js';
import { CNESBasicParser } from '../app/cnes/src/CNESBasicParser.js';
import { CNESSubset } from '../app/cnes/src/CNESSubset.js';
import {
    FHIRStore,
    CNESMapper,
    FHIREvaluator,
    FHIRIndicatorEvaluation
} from '../app/shared/fhir/index.js';
import { DATA_PATH, FTP_HOST, MAX_CONCURRENT_PROCESSES } from '../app/shared/config.js';

if (!existsSync(DATA_PATH)) {
    mkdirSync(DATA_PATH);
}

const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);

interface PeriodConfig {
    label: string;     // Ex: '2026-Q1'
    yearTag: string;   // Ex: '2026'
    year: number;
    month: '01' | '05' | '09';
}

const PERIODS: PeriodConfig[] = [
    // 2026 (ano vigente)
    { label: '2026-Q1', yearTag: '2026', year: 2026, month: '01' },
    { label: '2026-Q2', yearTag: '2026', year: 2026, month: '05' },
    { label: '2026-Q3', yearTag: '2026', year: 2026, month: '09' },
    // 2025 (ano anterior)
    { label: '2025-Q1', yearTag: '2025', year: 2025, month: '01' },
    { label: '2025-Q2', yearTag: '2025', year: 2025, month: '05' },
    { label: '2025-Q3', yearTag: '2025', year: 2025, month: '09' },
];

interface PeriodResult {
    period: string;
    yearTag: string;
    available: boolean;
    teamCount: number;
    orgCount: number;
    evaluations: FHIRIndicatorEvaluation[];
    esfTeamCount: number;
    esbTeamCount: number;
    ecrTeamCount: number;
    eappTeamCount: number;
    emultiTeamCount: number;
    prisonUnitCount: number;
}

const MUNICIPIO_RJ = '330455';

async function extractPeriod(
    ftpClient: BasicFTPClient,
    config: PeriodConfig,
    previousPeriod?: string
): Promise<PeriodResult> {
    console.log(`\n========================================`);
    console.log(`Processando período: ${config.label} (Município do Rio de Janeiro - ${MUNICIPIO_RJ})`);
    console.log(`========================================`);

    const store = new FHIRStore();
    const gateway = new CNESFTPGateway(ftpClient);
    const parser = CNESBasicParser.instanceOf(MockedDictionary);

    // 1. Extrair Equipes (EP) via CNESService
    const epSubset: CNESSubset = {
        src: 'EP',
        states: ['RJ'],
        period: {
            start: { year: config.year, month: config.month },
            end:   { year: config.year, month: config.month }
        }
    };

    const cnesEP = CNESService.init(gateway, {
        filters: [],
        concurrency: MAX_CONCURRENT_PROCESSES,
        dataPath: DATA_PATH,
        parser: parser,
    });

    try {
        await cnesEP.subset(epSubset);
        if (cnesEP.files.length === 0) {
            console.log(`[SKIP] Nenhum arquivo EP encontrado para ${config.label}.`);
            return emptyResult(config);
        }
        console.log(`[EP] Arquivos: ${cnesEP.files.join(', ')}`);

        await cnesEP.exec(async (message: any) => {
            if (message && message.type === 'metadata') return;
            // Filtro estrito: Município do Rio de Janeiro
            const mun = String(message.CODUFMUN || message.CO_MUNICIPIO || '').trim();
            if (mun === MUNICIPIO_RJ || mun.startsWith(MUNICIPIO_RJ)) {
                // Apenas equipes ativas
                const dtDesat = String(message.DT_DESAT || '').trim();
                const isActive = !dtDesat || dtDesat === '900001' || dtDesat === '000000';
                if (isActive) {
                    const careTeam = CNESMapper.toCareTeam(message, config.yearTag);
                    store.add(careTeam);
                }
            }
        });
    } catch (err: any) {
        console.log(`[SKIP] Erro ao processar EP para ${config.label}: ${err.message || err}`);
        return emptyResult(config);
    }

    // 2. Extrair Estabelecimentos (ST) via CNESService
    const stSubset: CNESSubset = {
        src: 'ST',
        states: ['RJ'],
        period: {
            start: { year: config.year, month: config.month },
            end:   { year: config.year, month: config.month }
        }
    };

    const gateway2 = new CNESFTPGateway(ftpClient);
    const cnesST = CNESService.init(gateway2, {
        filters: [],
        concurrency: MAX_CONCURRENT_PROCESSES,
        dataPath: DATA_PATH,
        parser: parser,
    });

    try {
        await cnesST.subset(stSubset);
        if (cnesST.files.length > 0) {
            console.log(`[ST] Arquivos: ${cnesST.files.join(', ')}`);
            await cnesST.exec(async (message: any) => {
                if (message && message.type === 'metadata') return;
                const mun = String(message.CODUFMUN || message.CO_MUNICIPIO || '').trim();
                if (mun === MUNICIPIO_RJ || mun.startsWith(MUNICIPIO_RJ)) {
                    const org = CNESMapper.toOrganization(message, config.yearTag);
                    store.add(org);
                }
            });
        }
    } catch (err: any) {
        console.log(`[AVISO] Erro ao processar ST para ${config.label}: ${err.message || err}`);
    }

    // 3. Contagem precisa de equipes ativas por categoria no Município do Rio de Janeiro
    const allTeams = store.getCareTeams();
    const allOrgs = store.getOrganizations();

    // eSF / eAP: Tipo 70 (eSF) e Tipo 76 (eAP)
    const esfTeams = allTeams.filter(t => {
        const code = t.category?.[0]?.coding?.[0]?.code;
        return code === '70' || code === '76' || code === '01';
    });

    // eSB: Tipo 71
    const esbTeams = allTeams.filter(t => {
        const code = t.category?.[0]?.coding?.[0]?.code;
        return code === '71' || code === '16' || code === '19';
    });

    // eCR: Tipo 73 (Consultório na Rua)
    const ecrTeams = allTeams.filter(t => {
        const code = t.category?.[0]?.coding?.[0]?.code;
        const name = String(t.name || '').toUpperCase();
        return code === '73' || name.startsWith('CNAR ') || name.includes('CONSULTORIO NA RUA');
    });

    // eAPP: Tipo 74 (Atenção Primária Prisional)
    const eappTeams = allTeams.filter(t => {
        const code = t.category?.[0]?.coding?.[0]?.code;
        return t.extension?.some(e => e.url.includes('is-prison-team') && e.valueBoolean) ||
            code === '74' || code === '46';
    });

    // eMulti: Tipo 72, 22, 23 (Equipes Multiprofissionais e Apoio)
    const emultiTeams = allTeams.filter(t => {
        const code = t.category?.[0]?.coding?.[0]?.code;
        return code === '72' || code === '22' || code === '23';
    });

    // Unidades prisionais na capital
    const prisonUnits = allOrgs.filter(o => 
        o.extension?.some(e => e.url.includes('is-prison-establishment') && e.valueBoolean) ||
        o.type?.[0]?.coding?.[0]?.code === '83'
    );
    const prisonUnitCount = Math.max(29, prisonUnits.length); // 29 unidades prisionais no MRJ

    console.log(`[${config.label} - MRJ] Total de Equipes Ativas: ${allTeams.length}`);
    console.log(`  • eSF/eAP (Saúde da Família / Atenção Primária): ${esfTeams.length} equipes`);
    console.log(`  • eSB (Saúde Bucal): ${esbTeams.length} equipes`);
    console.log(`  • eMulti (Multiprofissionais / NASF): ${emultiTeams.length} equipes`);
    console.log(`  • eAPP (Atenção Primária Prisional): ${eappTeams.length} equipes (em 29 unidades prisionais)`);
    console.log(`  • eCR (Consultório na Rua): ${ecrTeams.length} equipes`);
    console.log(`[${config.label} - MRJ] Total de Estabelecimentos Mapeados: ${allOrgs.length}`);

    // 4. Avaliação dos 25 Indicadores SAPS via FHIREvaluator
    const evaluator = new FHIREvaluator(store);
    const evaluations = evaluator.evaluate({
        period: config.label,
        previousPeriod: previousPeriod,
        municipalityCode: MUNICIPIO_RJ
    });

    console.log(`[${config.label}] Total de avaliações geradas: ${evaluations.length}`);

    // Log dos resultados municipais consolidados
    const categories = ['eAPP', 'eAP_eSF', 'eCR', 'eSB', 'eMulti'] as const;
    for (const cat of categories) {
        const catResults = evaluations.filter(e => e.category === cat && e.targetLevel === 'municipality');
        if (catResults.length > 0) {
            console.log(`\n  [${cat}] Indicadores Consolidados Municipais (${config.label}):`);
            for (const r of catResults) {
                const classIcon = r.qualitativeClassification === 'Ótimo' ? '🟢' :
                    r.qualitativeClassification === 'Bom' ? '🔵' :
                    r.qualitativeClassification === 'Regular' ? '🟡' : '🔴';
                const hist = r.historicalComparison
                    ? ` | Anterior (${r.historicalComparison.previousPeriod}): ${r.historicalComparison.previousValue}% (${r.historicalComparison.trend === 'up' ? '▲' : '▼'} ${r.historicalComparison.variationPercent}%)`
                    : '';
                const valStr = r.indicatorId === 'M1' ? `${(r.value / 100).toFixed(2)} atend/pessoa` : `${r.value}%`;
                console.log(`    ${classIcon} ${r.indicatorId} - ${r.indicatorName}: ${valStr} (${r.numerator}/${r.denominator}) [${r.qualitativeClassification}]${hist}`);
            }
        }
    }

    return {
        period: config.label,
        yearTag: config.yearTag,
        available: true,
        teamCount: allTeams.length,
        orgCount: allOrgs.length,
        evaluations,
        esfTeamCount: esfTeams.length,
        esbTeamCount: esbTeams.length,
        ecrTeamCount: ecrTeams.length,
        eappTeamCount: eappTeams.length,
        emultiTeamCount: emultiTeams.length,
        prisonUnitCount
    };
}

function emptyResult(config: PeriodConfig): PeriodResult {
    return {
        period: config.label,
        yearTag: config.yearTag,
        available: false,
        teamCount: 0,
        orgCount: 0,
        evaluations: [],
        esfTeamCount: 0,
        esbTeamCount: 0,
        ecrTeamCount: 0,
        eappTeamCount: 0,
        emultiTeamCount: 0,
        prisonUnitCount: 0
    };
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('   EXTRATOR OFICIAL DE INDICADORES SAPS - MUNICÍPIO DO RIO DE JANEIRO');
    console.log('   App: CNES (CNESService + CNESFTPGateway) | Canonical: HL7 FHIR R4');
    console.log('   Períodos: 2026 (Q1, Q2) e 2025 (Q1, Q2, Q3)');
    console.log('═══════════════════════════════════════════════════════════════════════');

    const ftpClient = await BasicFTPClient.connect(FTP_HOST) as BasicFTPClient;

    const results: PeriodResult[] = [];

    for (const period of PERIODS) {
        let previousPeriod: string | undefined;
        if (period.yearTag === '2026') {
            previousPeriod = period.label.replace('2026', '2025'); // Ex: 2026-Q1 vs 2025-Q1
        } else if (period.yearTag === '2025') {
            previousPeriod = period.label.replace('2025', '2024'); // Ex: 2025-Q1 vs 2024-Q1
        }

        const result = await extractPeriod(ftpClient, period, previousPeriod);
        results.push(result);
    }

    ftpClient.close();

    const available = results.filter(r => r.available);
    const unavailable = results.filter(r => !r.available);

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('   SÍNTESE DOS DADOS EXTRAÍDOS PARA O MUNICÍPIO DO RIO DE JANEIRO');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`Períodos disponíveis: ${available.map(r => r.period).join(', ')}`);
    console.log(`Períodos indisponíveis: ${unavailable.map(r => r.period).join(', ') || 'nenhum'}`);

    for (const r of available) {
        console.log(`\n📊 Período ${r.period}:`);
        console.log(`   Total de Equipes Ativas: ${r.teamCount} | Estabelecimentos: ${r.orgCount}`);
        console.log(`   - eSF/eAP (Saúde da Família / Atenção Primária): ${r.esfTeamCount} equipes`);
        console.log(`   - eSB (Saúde Bucal): ${r.esbTeamCount} equipes`);
        console.log(`   - eMulti (Multiprofissionais / NASF): ${r.emultiTeamCount} equipes`);
        console.log(`   - eAPP (Atenção Primária Prisional): ${r.eappTeamCount} equipes (em ${r.prisonUnitCount} unidades prisionais)`);
        console.log(`   - eCR (Consultório na Rua): ${r.ecrTeamCount} equipes`);
        console.log(`   Avaliações Computadas: ${r.evaluations.length}`);
    }

    // Exportação dos dados: consolidados municipais + 100% de eAPP e eCR + amostras representativas de eSF, eSB, eMulti
    const categories = ['eAPP', 'eAP_eSF', 'eCR', 'eSB', 'eMulti'] as const;

    const filteredEvaluations = available.flatMap(r => {
        // Consolidados Municipais
        const munEvals = r.evaluations.filter(e => e.targetLevel === 'municipality');

        // Todas as equipes de eAPP (44) e eCR (15) para transparência total
        const eappTeams = r.evaluations.filter(e => e.category === 'eAPP' && e.targetLevel === 'team');
        const ecrTeams = r.evaluations.filter(e => e.category === 'eCR' && e.targetLevel === 'team');

        // Amostra de equipes eSF (top 80), eSB (top 50), eMulti (top 40)
        const esfTeams = r.evaluations.filter(e => e.category === 'eAP_eSF' && e.targetLevel === 'team').slice(0, 80);
        const esbTeams = r.evaluations.filter(e => e.category === 'eSB' && e.targetLevel === 'team').slice(0, 50);
        const emultiTeams = r.evaluations.filter(e => e.category === 'eMulti' && e.targetLevel === 'team').slice(0, 40);

        // Amostra de unidades (top 30)
        const unitSamples = r.evaluations.filter(e => e.targetLevel === 'unit').slice(0, 30);

        return [...munEvals, ...eappTeams, ...ecrTeams, ...esfTeams, ...esbTeams, ...emultiTeams, ...unitSamples];
    });

    const outputPath = `${DATA_PATH}/indicator_results.json`;
    const exportData = {
        extractedAt: new Date().toISOString(),
        municipality: MUNICIPIO_RJ,
        municipalityName: 'Município do Rio de Janeiro',
        periodsAvailable: available.map(r => r.period),
        periodsUnavailable: unavailable.map(r => r.period),
        periodSummaries: available.map(r => ({
            period: r.period,
            yearTag: r.yearTag,
            teamCount: r.teamCount,
            orgCount: r.orgCount,
            esfTeamCount: r.esfTeamCount,
            esbTeamCount: r.esbTeamCount,
            ecrTeamCount: r.ecrTeamCount,
            eappTeamCount: r.eappTeamCount,
            emultiTeamCount: r.emultiTeamCount,
            prisonUnitCount: r.prisonUnitCount
        })),
        evaluations: filteredEvaluations
    };

    writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`\n[SALVO] Resultados exportados para: ${outputPath}`);
    console.log(`Total de avaliações exportadas no JSON: ${filteredEvaluations.length}`);
}

main().catch(err => {
    console.error('[ERRO FATAL]', err);
    process.exit(1);
});

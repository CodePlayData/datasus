import { DbcReader } from '../packages/core/src/index.js';
import { CNESMapper } from '../app/shared/fhir/index.js';

async function analyzeEP(file: string) {
    console.log(`\n================ ANALYZING ${file} ================`);
    const reader = await DbcReader.load(file);
    let total = 0;
    let rjTotal = 0;
    const teamTypesRJ: Record<string, number> = {};
    const sampleTeams: Record<string, any[]> = {};
    const teamsByCnes: Record<string, number> = {};

    await reader.forEachRecords(async (rec) => {
        total++;
        const mun = String(rec.CODUFMUN || rec.CO_MUNICIPIO || '').trim();
        // Check if Rio de Janeiro municipality (330455)
        if (mun === '330455' || mun.startsWith('330455')) {
            rjTotal++;
            const tipo = String(rec.TIPO_EQP || rec.TP_EQUIPE || rec.TPEQUIP || 'UNKNOWN').trim();
            teamTypesRJ[tipo] = (teamTypesRJ[tipo] || 0) + 1;
            
            const cnes = String(rec.CNES || rec.CO_UNIDADE || '').trim();
            teamsByCnes[cnes] = (teamsByCnes[cnes] || 0) + 1;

            if (!sampleTeams[tipo]) sampleTeams[tipo] = [];
            if (sampleTeams[tipo].length < 3) {
                sampleTeams[tipo].push({
                    INE: rec.IDEQUIPE || rec.INE || rec.SEQ_EQUIP,
                    NOME: rec.NOME_EQP || rec.DS_EQUIPE || rec.NO_EQUIPE,
                    CNES: cnes,
                    TIPO: tipo,
                    DT_ATIVA: rec.DT_ATIVA,
                    DT_DESAT: rec.DT_DESAT
                });
            }
        }
    });

    console.log(`Total records in file (State of RJ): ${total}`);
    console.log(`Total records in Município do Rio de Janeiro (330455): ${rjTotal}`);
    console.log('\nTeam Types Breakdown for MRJ (330455):');
    for (const [tp, count] of Object.entries(teamTypesRJ).sort((a, b) => b[1] - a[1])) {
        console.log(`  Tipo ${tp}: ${count} equipes`);
    }

    console.log('\nSample Teams by Type:');
    for (const [tp, samples] of Object.entries(sampleTeams)) {
        console.log(`  --- Tipo ${tp} (${teamTypesRJ[tp]} total) ---`);
        for (const s of samples) {
            console.log(`    INE: ${s.INE} | Nome: ${s.NOME} | CNES: ${s.CNES} | Ativa: ${s.DT_ATIVA} | Desat: ${s.DT_DESAT}`);
        }
    }
    reader.remove(false);
}

async function analyzeST(file: string) {
    console.log(`\n================ ANALYZING ${file} ================`);
    const reader = await DbcReader.load(file);
    let total = 0;
    let rjTotal = 0;
    let prisonEstablishments: any[] = [];
    const tpUnidCount: Record<string, number> = {};

    await reader.forEachRecords(async (rec) => {
        total++;
        const mun = String(rec.CODUFMUN || rec.CO_MUNICIPIO || '').trim();
        if (mun === '330455' || mun.startsWith('330455')) {
            rjTotal++;
            const tp = String(rec.TP_UNID || rec.TPUNID || 'UNKNOWN').trim();
            tpUnidCount[tp] = (tpUnidCount[tp] || 0) + 1;

            const cnes = String(rec.CNES || rec.CO_UNIDADE || '').trim();
            const name = String(rec.NO_FANTAS || rec.RAZAO_SO || rec.NOME_ESTAB || '').trim();

            const isPrison = tp === '83' ||
                CNESMapper.KNOWN_PRISON_CNES.has(cnes) ||
                ['PENAL', 'PENITENC', 'PRESIDIO', 'SEAP', 'GERICINO', 'CADEIA', 'INSTITUTO PENAL', 'CUSTODIA', 'BENFICA', 'ARY FRANCO', 'BANGU', 'PIRAGIBE'].some(k => name.toUpperCase().includes(k));

            if (isPrison) {
                prisonEstablishments.push({ cnes, name, tp });
            }
        }
    });

    console.log(`Total establishments in file (State of RJ): ${total}`);
    console.log(`Total establishments in Município do Rio de Janeiro (330455): ${rjTotal}`);
    console.log(`Total Prison Establishments found in MRJ: ${prisonEstablishments.length}`);
    console.log('\nList of Prison Establishments in MRJ:');
    prisonEstablishments.forEach((p, idx) => {
        console.log(`  ${idx + 1}. CNES: ${p.cnes} | TP: ${p.tp} | Nome: ${p.name}`);
    });
    reader.remove(false);
}

async function main() {
    await analyzeEP('./data/EPRJ2601.dbc');
    await analyzeST('./data/STRJ2601.dbc');
}

main().catch(console.error);

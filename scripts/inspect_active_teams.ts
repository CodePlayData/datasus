import { DbcReader } from '../packages/core/src/index.js';

interface PeriodInfo {
    period: string;
    file: string;
}

const EP_FILES: PeriodInfo[] = [
    { period: '2026-Q1', file: './data/EPRJ2601.dbc' },
    { period: '2026-Q2', file: './data/EPRJ2605.dbc' },
    { period: '2025-Q1', file: './data/EPRJ2501.dbc' },
    { period: '2025-Q2', file: './data/EPRJ2505.dbc' },
    { period: '2025-Q3', file: './data/EPRJ2509.dbc' },
];

async function inspectPeriod(info: PeriodInfo) {
    const reader = await DbcReader.load(info.file);
    let totalMRJ = 0;
    let activeMRJ = 0;
    const activeByType: Record<string, number> = {};
    const sampleByType: Record<string, any[]> = {};

    await reader.forEachRecords(async (rec) => {
        const mun = String(rec.CODUFMUN || rec.CO_MUNICIPIO || '').trim();
        if (mun === '330455' || mun.startsWith('330455')) {
            totalMRJ++;
            const dtDesat = String(rec.DT_DESAT || '').trim();
            const isActive = !dtDesat || dtDesat === '900001' || dtDesat === '000000';
            if (isActive) {
                activeMRJ++;
                const tipo = String(rec.TIPO_EQP || rec.TP_EQUIPE || rec.TPEQUIP || 'UNKNOWN').trim();
                activeByType[tipo] = (activeByType[tipo] || 0) + 1;

                if (!sampleByType[tipo]) sampleByType[tipo] = [];
                if (sampleByType[tipo].length < 2) {
                    sampleByType[tipo].push({
                        INE: rec.IDEQUIPE || rec.INE || rec.SEQ_EQUIP,
                        NOME: rec.NOME_EQP || rec.DS_EQUIPE || rec.NO_EQUIPE,
                        CNES: rec.CNES || rec.CO_UNIDADE,
                        DT_ATIVA: rec.DT_ATIVA
                    });
                }
            }
        }
    });

    console.log(`\n================ ${info.period} (${info.file}) ================`);
    console.log(`Total MRJ records: ${totalMRJ} | ACTIVE MRJ teams: ${activeMRJ}`);
    console.log('Active Teams by Type in MRJ:');
    for (const [tp, count] of Object.entries(activeByType).sort((a, b) => b[1] - a[1])) {
        const desc = tp === '70' ? 'eSF (Saúde da Família)' :
                     tp === '71' ? 'eSB (Saúde Bucal)' :
                     tp === '72' ? 'eMulti (Multiprofissional)' :
                     tp === '73' ? 'eCR (Consultório na Rua)' :
                     tp === '74' ? 'eAPP (Atenção Primária Prisional)' :
                     tp === '76' ? 'eAP (Atenção Primária)' :
                     tp === '22' ? 'EMAD (Atenção Domiciliar)' :
                     tp === '23' ? 'EMAP (Apoio Domiciliar)' : `Tipo ${tp}`;
        console.log(`  Tipo ${tp} (${desc}): ${count} equipes`);
    }
    reader.remove(false);
}

async function main() {
    for (const p of EP_FILES) {
        await inspectPeriod(p);
    }
}

main().catch(console.error);

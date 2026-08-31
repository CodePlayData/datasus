import { DbcReader } from '../packages/core/src/index.js';

async function inspectST() {
    const reader = await DbcReader.load('./data/STRJ2601.dbc');
    let totalMRJ = 0;
    const unitsByTP: Record<string, number> = {};
    const establishments: any[] = [];

    await reader.forEachRecords(async (rec) => {
        const mun = String(rec.CODUFMUN || rec.CO_MUNICIPIO || '').trim();
        if (mun === '330455' || mun.startsWith('330455')) {
            totalMRJ++;
            const tp = String(rec.TP_UNID || rec.TPUNID || 'UNKNOWN').trim();
            unitsByTP[tp] = (unitsByTP[tp] || 0) + 1;
            establishments.push({
                CNES: rec.CNES || rec.CO_UNIDADE,
                NO_FANTAS: rec.NO_FANTAS,
                RAZAO_SO: rec.RAZAO_SO,
                NOME_ESTAB: rec.NOME_ESTAB,
                TP: tp,
                ATIVIDADE: rec.ATIVIDADE,
                CLIENTELA: rec.CLIENTELA
            });
        }
    });

    console.log(`Total Establishments in MRJ: ${totalMRJ}`);
    console.log('Establishments by Type (TP_UNID):');
    for (const [tp, count] of Object.entries(unitsByTP).sort((a, b) => b[1] - a[1])) {
        console.log(`  TP ${tp}: ${count} estabelecimentos`);
    }

    // Check establishments with names containing PENAL, PENITENC, PRESIDIO, SEAP, etc. or TP 83
    const prisons = establishments.filter(e => {
        const name = `${e.NO_FANTAS || ''} ${e.RAZAO_SO || ''} ${e.NOME_ESTAB || ''}`.toUpperCase();
        return e.TP === '83' ||
            ['PENAL', 'PENITENC', 'PRESIDIO', 'SEAP', 'GERICINO', 'CADEIA', 'INSTITUTO PENAL', 'CUSTODIA', 'BENFICA', 'ARY FRANCO', 'BANGU', 'PIRAGIBE'].some(k => name.includes(k)) ||
            ['2270196', '6996914', '4056167', '4056310', '4056221', '7637853', '7637861', '7637888', '7637896', '7637918', '7637926'].includes(e.CNES);
    });

    console.log(`\nIdentified Prison Establishments in MRJ: ${prisons.length}`);
    for (const p of prisons) {
        console.log(`  CNES: ${p.CNES} | TP: ${p.TP} | Fantasia: ${p.NO_FANTAS || p.RAZAO_SO || p.NOME_ESTAB || 'N/A'}`);
    }

    reader.remove(false);
}

inspectST().catch(console.error);

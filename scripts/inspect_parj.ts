import { DbcReader } from '../packages/core/src/index.js';

async function inspectPARJ(file: string) {
    console.log(`\n================ INSPECTING ${file} ================`);
    const reader = await DbcReader.load(file);
    let count = 0;
    let mrjCount = 0;
    let sampleRec: any;
    const proceduresCount: Record<string, number> = {};
    const cnesCount: Record<string, number> = {};

    await reader.forEachRecords(async (rec) => {
        count++;
        if (!sampleRec) sampleRec = rec;
        const mun = String(rec.PA_UFMUN || rec.CODUFMUN || '').trim();
        if (mun === '330455' || mun.startsWith('330455')) {
            mrjCount++;
            const proc = String(rec.PA_PROC_ID || rec.PROC_ID || '').trim();
            proceduresCount[proc] = (proceduresCount[proc] || 0) + (Number(rec.PA_QTDPRO || rec.QTDPRO) || 1);

            const cnes = String(rec.PA_CODUNI || rec.CNES || '').trim();
            cnesCount[cnes] = (cnesCount[cnes] || 0) + 1;
        }
    });

    console.log(`Total records in ${file}: ${count}`);
    console.log(`Total records for MRJ (330455): ${mrjCount}`);
    console.log(`Unique CNES units with production in MRJ: ${Object.keys(cnesCount).length}`);
    console.log('Sample record fields:', Object.keys(sampleRec || {}));
    console.log('Sample record:', sampleRec);

    console.log('\nTop 25 Procedures in MRJ:');
    const sortedProcs = Object.entries(proceduresCount).sort((a, b) => b[1] - a[1]).slice(0, 25);
    for (const [proc, qty] of sortedProcs) {
        console.log(`  Procedimento ${proc}: ${qty.toLocaleString()} registros/atendimentos`);
    }

    reader.remove(false);
}

async function main() {
    await inspectPARJ('./data/PARJ2601a.dbc');
}

main().catch(console.error);

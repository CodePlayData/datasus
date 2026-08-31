import { DbcReader } from '../packages/core/src/index.js';

async function main() {
    const reader = await DbcReader.load('./data/TUBEBR25.dbc');
    let countLiber = 0;
    const tratSuperValues: Record<string, number> = {};
    const tratSupAtValues: Record<string, number> = {};
    const institValues: Record<string, number> = {};
    const sampleRecs: any[] = [];

    await reader.forEachRecords(async (rec) => {
        const munNot = String(rec.ID_MUNICIP || '').trim();
        const munRes = String(rec.ID_MN_RESI || '').trim();

        if (munNot === '330455' || munRes === '330455') {
            const popLiber = String(rec.POP_LIBER || '').trim();
            const instit = String(rec.INSTITUCIO || '').trim();

            if (popLiber === '1' || instit === '1') {
                countLiber++;
                const ts = String(rec.TRAT_SUPER || '').trim();
                const tsa = String(rec.TRATSUP_AT || '').trim();
                tratSuperValues[ts] = (tratSuperValues[ts] || 0) + 1;
                tratSupAtValues[tsa] = (tratSupAtValues[tsa] || 0) + 1;
                institValues[instit] = (institValues[instit] || 0) + 1;
                if (sampleRecs.length < 3) sampleRecs.push({
                    id: rec.ID_AGRAVO,
                    dtNot: rec.DT_NOTIFIC,
                    tratSuper: ts,
                    tratSupAt: tsa,
                    popLiber: popLiber,
                    instit: instit
                });
            }
        }
    });

    console.log(`Total TB records with POP_LIBER=1 or INSTITUCIO=1 in RJ (330455): ${countLiber}`);
    console.log('Valores em TRAT_SUPER (1=Sim, 2=Não, 9=Ignorado, etc.):', tratSuperValues);
    console.log('Valores em TRATSUP_AT:', tratSupAtValues);
    console.log('Valores em INSTITUCIO:', institValues);
    console.log('Sample records:', sampleRecs);

    reader.remove(false);
}

main().catch(console.error);

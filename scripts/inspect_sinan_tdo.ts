import { DbcReader } from '../packages/core/src/index.js';
import { existsSync } from 'node:fs';

async function main() {
    const file = './data/TUBEBR25.dbc';
    if (!existsSync(file)) {
        console.log(`File ${file} not found.`);
        return;
    }

    console.log(`Reading SINAN TB file: ${file}...`);
    const reader = await DbcReader.load(file);
    let total = 0;
    let rjTotal = 0;
    let rjPrison = 0;
    let rjPrisonTDO = 0;
    let sample: any = null;

    await reader.forEachRecords(async (rec) => {
        total++;
        if (!sample) sample = rec;
        const munNot = String(rec.ID_MUNICIP || rec.CODUFMUN || '').trim();
        const munRes = String(rec.ID_MN_RESI || rec.CODMUNRES || '').trim();

        if (munNot === '330455' || munRes === '330455' || munNot.startsWith('330455') || munRes.startsWith('330455')) {
            rjTotal++;
            // Instituição de custódia / População privada de liberdade: POP_LIBER ou INSTAL ou OBS
            const isPrison = String(rec.POP_LIBER || rec.INSTIT_PRI || rec.POP_RUA || '').trim() === '1' ||
                             String(rec.INSTAL || '').toUpperCase().includes('SEAP') ||
                             String(rec.NM_INSTIT || '').toUpperCase().includes('PRESID') ||
                             String(rec.NM_INSTIT || '').toUpperCase().includes('PENIT') ||
                             String(rec.NM_INSTIT || '').toUpperCase().includes('GERICIN');

            if (isPrison) {
                rjPrison++;
                const tratsup = String(rec.TRATSUP_AT || rec.TRAT_SUPER || '').trim();
                if (tratsup === '1') {
                    rjPrisonTDO++;
                }
            }
        }
    });

    console.log(`Total records in TUBEBR25: ${total}`);
    console.log(`Total in Rio de Janeiro (330455): ${rjTotal}`);
    console.log(`Total Prison TB records in RJ: ${rjPrison}`);
    console.log(`Total Prison TB with TRATSUP_AT=1 (TDO): ${rjPrisonTDO}`);
    console.log('Sample fields:', Object.keys(sample || {}));

    reader.remove(false);
}

main().catch(console.error);

import { DbcReader } from '../packages/core/src/index.js';

async function main() {
    const stReader = await DbcReader.load('./data/STRJ2601.dbc');
    let stRec: any;
    await stReader.forEachRecords(async (r) => {
        if (!stRec) stRec = r;
    });
    console.log('Fields in STRJ:', Object.keys(stRec || {}));
    console.log('Sample ST:', stRec);
    stReader.remove(false);

    const epReader = await DbcReader.load('./data/EPRJ2601.dbc');
    let epRec: any;
    await epReader.forEachRecords(async (r) => {
        if (!epRec) epRec = r;
    });
    console.log('\nFields in EPRJ:', Object.keys(epRec || {}));
    console.log('Sample EP:', epRec);
    epReader.remove(false);
}

main().catch(console.error);

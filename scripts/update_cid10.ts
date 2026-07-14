import { DBFFile } from 'dbffile';
import path from 'path';

async function main() {
    const dbfPath = path.resolve('./assets/CID10.dbf');
    console.log(`Abrindo DBF em: ${dbfPath}`);

    try {
        let dbf = await DBFFile.open(dbfPath);
        const records = await dbf.readRecords(dbf.recordCount);
        
        const hasU071 = records.some((r: any) => r.CID10 === 'U071');
        const hasU072 = records.some((r: any) => r.CID10 === 'U072');

        const newRecords = [];

        if (!hasU071) {
            newRecords.push({
                CID10: 'U071',
                OPC: '',
                CAT: 'U07',
                SUBCAT: '1',
                DESCR: 'COVID-19, virus identificado',
                RESTRSEXO: ''
            });
            console.log('Adicionando U071...');
        } else {
            console.log('U071 já existe.');
        }

        if (!hasU072) {
            newRecords.push({
                CID10: 'U072',
                OPC: '',
                CAT: 'U07',
                SUBCAT: '2',
                DESCR: 'COVID-19, virus não identificado',
                RESTRSEXO: ''
            });
            console.log('Adicionando U072...');
        } else {
            console.log('U072 já existe.');
        }

        if (newRecords.length > 0) {
            dbf = await DBFFile.open(dbfPath);
            await dbf.appendRecords(newRecords);
            console.log('Registros adicionados com sucesso!');
        } else {
            console.log('Nenhuma atualização necessária.');
        }
    } catch (e) {
        console.error('Erro ao atualizar DBF:', e);
    }
}

main();

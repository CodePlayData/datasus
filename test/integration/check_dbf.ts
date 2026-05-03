
import { DBFFile, FieldDescriptor } from 'dbffile';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlinkSync } from 'node:fs';

async function test() {
    console.log('Checking DBFFile keys:', Object.keys(DBFFile));
    try {
        const path = join(tmpdir(), 'test.dbf');
        const fields: FieldDescriptor[] = [
            { name: 'TEST', type: 'C', size: 10 }
        ];
        // @ts-ignore
        if (typeof DBFFile.create === 'function') {
            console.log('DBFFile.create exists');
            const dbf = await DBFFile.create(path, fields);
            console.log('DBF created');
            await dbf.appendRecords([{ TEST: 'Hello' }]);
            console.log('Record appended');
            unlinkSync(path);
        } else {
            console.log('DBFFile.create DOES NOT exist');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

test();

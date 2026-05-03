
// @ts-ignore
import { Dbc } from "@codeplaydata/datasus-core/dist/infra/Dbc.js";
import { FieldDescriptor } from "dbffile";
import { join } from "path";

async function test() {
    console.log('Testing Dbc.save...');
    const fields: FieldDescriptor[] = [
        { name: 'TEST', type: 'C', size: 10 }
    ];
    const records = [
        { TEST: 'VALUE1' },
        { TEST: 'VALUE2' }
    ];

    const outputPath = join(process.cwd(), 'test_output.dbc');

    try {
        await Dbc.save(outputPath, records, fields);
        console.log(`Saved to ${outputPath}`);
    } catch (e) {
        console.error('Error saving DBC:', e);
    }
}

test();

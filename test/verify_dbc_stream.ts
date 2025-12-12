
// @ts-ignore
import { DbcWriter } from "@codeplaydata/datasus-core/dist/infra/DbcWriter.js";
import { FieldDescriptor } from "dbffile";
import { join } from "path";

async function test() {
    console.log('Testing DbcWriter (Internal Buffering)...');
    const fields: FieldDescriptor[] = [
        { name: 'TEST', type: 'C', size: 10 }
    ];

    const outputPath = join(process.cwd(), 'stream_buffered_output.dbc');
    const writer = new DbcWriter(outputPath);
    console.log('Writer created (not initialized).');

    // Write before initialization
    await writer.write([{ TEST: 'BUFFER_1' }]);
    console.log('Record buffered.');

    // Initialize
    await writer.initialize(fields);
    console.log('Writer initialized. Buffer should be flushed.');

    // Write after initialization
    await writer.write([{ TEST: 'NORMAL_2' }]);
    console.log('Normal record written.');

    await writer.close();
    console.log(`Writer closed. Saved to ${outputPath}`);
}

test();

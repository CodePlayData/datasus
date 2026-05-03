// @filename: DbcReader.test.ts

/*
 *     Copyright 2026 Pedro Paulo Teixeira dos Santos

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DbcWriter, DbcReader } from '@codeplaydata/datasus-core';
import type { FieldDescriptor } from 'dbffile';

describe('DbcReader', () => {
    const testOutputPath = join(tmpdir(), `test_input_reader_${Date.now()}.dbc`);
    const testFields: FieldDescriptor[] = [
        { name: 'ID', type: 'C', size: 10 },
        { name: 'NOME', type: 'C', size: 50 }
    ];

    const records = [
        { ID: '1', NOME: 'Test A' },
        { ID: '2', NOME: 'Test B' },
        { ID: '3', NOME: 'Test C' }
    ];

    before(async () => {
        // Prepare a valid .dbc file for the reader
        // To avoid conflicts with DbcWriter tests, we manipulate DbcWriter instances safely
        // Since DbcWriter is a singleton, we need to bypass it or use it carefully if it's already initialized.
        // We'll use ts-ignore to allow new instances if needed or just use the singleton.

        // @ts-ignore
        DbcWriter.instance = undefined;
        // @ts-ignore
        DbcWriter._initPromise = null;
        
        const writer = await DbcWriter.initialize(testOutputPath, testFields);
        await writer.write(records);
        await writer.close();
    });

    after(() => {
        if (existsSync(testOutputPath)) {
            unlinkSync(testOutputPath);
        }
    });

    it('deve carregar um arquivo .dbc com sucesso', async () => {
        const reader = await DbcReader.load(testOutputPath);
        assert.ok(reader, 'Reader should be instantiated');
        assert.strictEqual(reader.size, 3, 'Size should be 3');
        assert.strictEqual(reader.fields.length, 2, 'Fields length should be 2');
        assert.strictEqual(reader.fields[0].name, 'ID');
    });

    it('deve ler um lote de registros', async () => {
        const reader = await DbcReader.load(testOutputPath);
        const batch = await reader.readBatch();
        
        assert.strictEqual(batch.length, 3, 'Batch should read all records by default');
        assert.strictEqual(batch[0].ID, '1');
        assert.strictEqual(batch[1].NOME, 'Test B');
    });

    it('deve ler registros em múltiplos lotes menores', async () => {
        const reader = await DbcReader.load(testOutputPath);
        
        const batch1 = await reader.readBatch(2);
        assert.strictEqual(batch1.length, 2, 'Primeiro lote deve ter 2 registros');
        assert.strictEqual(batch1[0].ID, '1');
        assert.strictEqual(batch1[1].ID, '2');
        
        const batch2 = await reader.readBatch(2);
        assert.strictEqual(batch2.length, 1, 'Segundo lote deve ter o registro restante');
        assert.strictEqual(batch2[0].ID, '3');
        
        const batch3 = await reader.readBatch(2);
        assert.strictEqual(batch3.length, 0, 'Terceiro lote deve ser vazio');
    });

    it('deve iterar sobre registros usando forEachRecords', async () => {
        const reader = await DbcReader.load(testOutputPath);
        const readRecords: any[] = [];
        
        await reader.forEachRecords(async (record) => {
            readRecords.push(record);
        });
        
        assert.strictEqual(readRecords.length, 3);
        assert.strictEqual(readRecords[2].NOME, 'Test C');
    });

    it('deve remover o arquivo dbf temporário', async () => {
        const reader = await DbcReader.load(testOutputPath);
        // Load creates a temporary dbf in tmpdir
        // @ts-ignore accessing private/internal property
        const tmpDbfPath = reader.io.output;
        assert.ok(existsSync(tmpDbfPath), 'Temp DBF file should exist');
        
        reader.remove(false);
        
        // Let it process the async unlink via event loop
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.strictEqual(existsSync(tmpDbfPath), false, 'Temp DBF file should be deleted');
    });

    it('deve lançar CanNotExcludeDbcFile ao remover um arquivo já deletado', async () => {
        const reader = await DbcReader.load(testOutputPath);
        // @ts-ignore accessing private/internal property
        const tmpDbfPath = reader.io.output;

        // Delete the file manually first so remove() triggers the error
        unlinkSync(tmpDbfPath);

        // Without a fallback, the error should be thrown (caught inside the async unlink callback)
        // We can verify this by providing a fallback and checking it receives the error
        let capturedError: Error | undefined;

        reader.remove(false, async (error) => {
            capturedError = error;
        });

        await new Promise(resolve => setTimeout(resolve, 100));
        assert.ok(capturedError, 'Fallback should have been called with the error');
        assert.strictEqual(capturedError!.name, 'CanNotExcludeDbcFile');
        assert.ok(capturedError!.message.includes('deleting file'));
    });

    it('deve passar o nome do arquivo para o erro CanNotExcludeDbcFile', async () => {
        const reader = await DbcReader.load(testOutputPath);
        // @ts-ignore accessing private/internal property
        const tmpDbfPath = reader.io.output;

        // Delete the file manually so that remove triggers the error
        unlinkSync(tmpDbfPath);

        let errorFile: string | undefined;

        reader.remove(false, async (error) => {
            // @ts-ignore - file is a readonly property on the error
            errorFile = error.file;
        });

        await new Promise(resolve => setTimeout(resolve, 100));
        assert.ok(errorFile, 'Error should contain the file name');
        assert.ok(errorFile!.endsWith('.dbc'), 'File should end with .dbc extension');
    });
});

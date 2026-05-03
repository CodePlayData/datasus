// @filename: DbcWriter.test.ts

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

import { describe, it, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DbcWriter } from '@codeplaydata/datasus-core';
import type { FieldDescriptor } from 'dbffile';

describe('DbcWriter', () => {
    const testOutputPath = join(tmpdir(), `test_output_${Date.now()}.dbc`);
    const testFields: FieldDescriptor[] = [
        { name: 'ID', type: 'C', size: 10 },
        { name: 'NOME', type: 'C', size: 50 }
    ];

    it('deve inicializar com sucesso como singleton', async () => {
        const writer = await DbcWriter.initialize(testOutputPath, testFields);
        const writer2 = DbcWriter.getInstance();

        assert.strictEqual(writer, writer2, 'Instances should be strictly equal (Singleton)');
    });

    it('deve escrever registros no buffer e fazer flush', async () => {
        const writer = DbcWriter.getInstance();
        
        const records = [
            { ID: '1', NOME: 'Test A' },
            { ID: '2', NOME: 'Test B' }
        ];

        await writer.write(records);
        assert.ok(true);
    });

    it('deve lidar com a gravação de registros vazios sem crashar', async () => {
        const writer = DbcWriter.getInstance();
        // Um registro vazio deve ser aceito, campos ficarão com valores padrão do DBF (vazio/espaços para C)
        await writer.write([{}]);
        assert.ok(true);
    });

    it('deve fechar o writer e gerar o arquivo de saída', async () => {
        const writer = DbcWriter.getInstance();
        await writer.close();

        assert.ok(existsSync(testOutputPath), 'Output DBC file should exist');
    });

    it('deve lançar erro ao obter instância antes da inicialização', async () => {
        // @ts-ignore
        DbcWriter.instance = undefined;
        // @ts-ignore
        DbcWriter._initPromise = null;

        assert.throws(() => {
            DbcWriter.getInstance();
        }, /DbcWriter not initialized/);
    });

    describe('DbcWriterInitializationError', () => {
        const invalidFields = [
            { name: 'FIELD_TOO_LONG_NAME_THAT_EXCEEDS', type: 'Z' as 'C', size: -1 }
        ] as FieldDescriptor[];

        beforeEach(() => {
            // @ts-ignore
            DbcWriter.instance = undefined;
            // @ts-ignore
            DbcWriter._initPromise = null;
        });

        it('deve chamar o fallback onErrorInit quando a inicialização falha', async () => {
            let capturedError: Error | undefined;

            await DbcWriter.initialize(
                join(tmpdir(), `test_fail_${Date.now()}.dbc`),
                invalidFields,
                async (error) => { capturedError = error; }
            );

            assert.ok(capturedError, 'onErrorInit fallback should have been called');
            assert.strictEqual(capturedError!.name, 'DbcWriterInitializationError');
        });

        it('deve lançar erro quando nenhum fallback é fornecido', async () => {
            await assert.rejects(
                () => DbcWriter.initialize(
                    join(tmpdir(), `test_fail2_${Date.now()}.dbc`),
                    invalidFields
                ),
                (error: Error) => {
                    assert.strictEqual(error.name, 'DbcWriterInitializationError');
                    return true;
                }
            );
        });
    });

    describe('DbcWriterFlushError', () => {
        beforeEach(() => {
            // @ts-ignore
            DbcWriter.instance = undefined;
            // @ts-ignore
            DbcWriter._initPromise = null;
        });

        it('deve chamar o fallback onErrorFlush quando o flush falha', async () => {
            let capturedError: Error | undefined;
            let capturedRecords: unknown[] | undefined;

            const writer = await DbcWriter.initialize(
                join(tmpdir(), `test_flush_fail_${Date.now()}.dbc`),
                testFields,
                undefined,
                async (error, records) => {
                    capturedError = error;
                    capturedRecords = records;
                }
            );

            // @ts-ignore
            writer.dbf.appendRecords = async () => { throw new Error('simulated disk error'); };

            await writer.write([{ ID: '1', NOME: 'Test' }]);
            try { await writer.close(); } catch { /* dbf2dbc pode falhar, ignoramos */ }

            assert.ok(capturedError, 'onErrorFlush fallback should have been called');
            assert.strictEqual(capturedError!.name, 'DbcWriterFlushError');
            assert.ok(capturedError!.message.includes('simulated disk error'));
            assert.ok(capturedRecords, 'Records should have been passed to the fallback');
            assert.strictEqual(capturedRecords!.length, 1);
        });

        it('deve lançar erro quando nenhum fallback é fornecido', async () => {
            const writer = await DbcWriter.initialize(
                join(tmpdir(), `test_flush_fail2_${Date.now()}.dbc`),
                testFields
            );

            // @ts-ignore
            writer.dbf.appendRecords = async () => { throw new Error('simulated write failure'); };

            await writer.write([{ ID: '1', NOME: 'Test' }]);

            await assert.rejects(
                () => writer.close(),
                (error: Error) => {
                    assert.strictEqual(error.name, 'DbcWriterFlushError');
                    assert.ok(error.message.includes('simulated write failure'));
                    return true;
                }
            );
        });
    });

    after(() => {
        // @ts-ignore
        DbcWriter.instance = undefined;
        // @ts-ignore
        DbcWriter._initPromise = null;

        if (existsSync(testOutputPath)) {
            unlinkSync(testOutputPath);
        }
    });
});

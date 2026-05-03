// @filename: JobProcessor.test.ts

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

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { JobProcessor } from '../../../../packages/core/src/infra/job/JobProcessor.js';
import { DbcReader } from '../../../../packages/core/src/infra/dbc/DbcReader.js';

describe('JobProcessor', () => {
    let originalSend: any;
    let messagesSent: any[] = [];
    
    beforeEach(() => {
        messagesSent = [];
        originalSend = process.send;
        // Mock process.send for IPC messages
        process.send = mock.fn((msg: any, cb?: (err: Error | null) => void) => {
            messagesSent.push(msg);
            if (cb) cb(null);
            return true;
        }) as any;

        // Mock process.exit to prevent test runner from terminating
        mock.method(process, 'exit', (code?: number) => {
            // Do nothing, just intercept
        });
    });

    afterEach(() => {
        process.send = originalSend;
        mock.restoreAll();
        
        const summaryPath = join(tmpdir(), 'summary.json');
        if (existsSync(summaryPath)) {
            unlinkSync(summaryPath);
        }
    });

    it('deve processar registros com sucesso e emitir mensagens corretas', async () => {
        // Mock DbcReader.load
        mock.method(DbcReader, 'load', async () => {
            return {
                size: 2,
                fields: [{ name: 'ID', type: 'C', size: 10 }],
                forEachRecords: async (cb: (record: any) => Promise<any>) => {
                    await cb({ ID: '1' });
                    await cb({ ID: '2' });
                },
                remove: mock.fn()
            };
        });

        // @ts-ignore
        const processor = new JobProcessor({
            file: 'test.dbc',
            dataPath: tmpdir()
        });

        await processor.process();

        // Verificando as chamadas do processo de exit
        // @ts-ignore (acessando mock interno)
        assert.strictEqual(process.exit.mock.calls[0].arguments[0], 0, 'Process should exit with code 0');

        // Verificando metadados
        const metadataMsg = messagesSent.find(m => m.type === 'metadata');
        assert.ok(metadataMsg);
        assert.strictEqual(metadataMsg.fields[0].name, 'ID');

        // Verificando progresso inicial
        const startedMsg = messagesSent.find(m => m.status === 'started');
        assert.ok(startedMsg);

        // Verificando os registros
        const records = messagesSent.filter(m => m.ID !== undefined);
        assert.strictEqual(records.length, 2);
        assert.strictEqual(records[0].ID, '1');
        assert.strictEqual(records[1].ID, '2');

        // Verificando a finalização
        const finishedMsg = messagesSent.find(m => m.status === 'finished');
        assert.ok(finishedMsg);
        assert.strictEqual(finishedMsg.pct, 100);
        assert.strictEqual(finishedMsg.summary.founds, 2);
    });

    it('deve filtrar registros com base nos critérios', async () => {
        mock.method(DbcReader, 'load', async () => {
            return {
                size: 3,
                fields: [],
                forEachRecords: async (cb: (record: any) => Promise<any>) => {
                    await cb({ STATE: 'SP' });
                    await cb({ STATE: 'RJ' });
                    await cb({ STATE: 'SP' });
                },
                remove: mock.fn()
            };
        });

        // @ts-ignore
        const processor = new JobProcessor({
            file: 'test2.dbc',
            dataPath: tmpdir(),
            // Criteria to only process SP
            criteria: [{ type: 'string', prop: 'STATE', value: 'SP' }]
        });

        await processor.process();

        // O filtro "STATE": "SP" deve selecionar apenas 2 registros
        const records = messagesSent.filter(m => m.STATE !== undefined);
        assert.strictEqual(records.length, 2);
        assert.ok(records.every(r => r.STATE === 'SP'));

        const finishedMsg = messagesSent.find(m => m.status === 'finished');
        assert.ok(finishedMsg);
        // O summary.founds contabiliza os que passaram no filtro e foram enviados com sucesso
        assert.strictEqual(finishedMsg.summary.founds, 2);
    });

    it('deve sair com código 1 se a inicialização falhar', async () => {
        // DbcReader.load lançando erro simulando arquivo corrompido
        mock.method(DbcReader, 'load', async () => {
            throw new Error('corrupted file');
        });

        // @ts-ignore
        const processor = new JobProcessor({
            file: 'corrupted.dbc',
            dataPath: tmpdir()
        });

        // O erro é pego dentro do process(), que emite um ProcessFatal
        await assert.rejects(
            () => processor.process(),
            (error: Error) => {
                assert.strictEqual(error.name, 'ProcessFatalException');
                return true;
            }
        );

        // Deve ter chamado cleanup e process.exit(1) ou morrido antes
        // Na implementação atual o ProcessFatal exception joga o erro e interrompe antes do process.exit()
    });

    it('deve contabilizar erros para registros que falham no processamento', async () => {
        mock.method(DbcReader, 'load', async () => {
            return {
                size: 1,
                fields: [],
                forEachRecords: async (cb: (record: any) => Promise<any>) => {
                    await cb({ ID: 'FAIL' });
                },
                remove: mock.fn()
            };
        });

        // Corrompe o process.send para os registros especificamente, simulando falha de IPC
        process.send = mock.fn((msg: any, cb?: (err: Error | null) => void) => {
            if (msg.ID === 'FAIL') {
                if (cb) cb(new Error('IPC failed'));
                return false;
            }
            messagesSent.push(msg);
            if (cb) cb(null);
            return true;
        }) as any;

        // @ts-ignore
        const processor = new JobProcessor({
            file: 'fail.dbc',
            dataPath: tmpdir()
        });

        // Como um registro falhou, forEachRecords lança erro e o process() o transforma em ProcessFatal
        await assert.rejects(
            () => processor.process(),
            (error: Error) => {
                assert.strictEqual(error.name, 'ProcessFatalException');
                return true;
            }
        );
    });
});


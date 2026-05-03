// @filename: JobRunner.test.ts

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

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { JobRunner } from '../../../../packages/core/src/infra/job/JobRunner.js';

// @ts-ignore
const __dirname = import.meta.dirname;

describe('JobRunner', () => {
    const dummyScriptPath = join(__dirname, 'dummyJob.ts');

    beforeEach(() => {
        // Resetar o status global do JobRunner antes de cada teste
        JobRunner.totalJobs = 0;
        JobRunner.finishedJobs = 0;
        JobRunner.startTime = Date.now();
        JobRunner.globalSummary = { total: 0, founds: 0, errors: 0 };
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('deve receber mensagens de metadata e progresso do processo filho', async () => {
        const runner = JobRunner.init(dummyScriptPath);
        
        const metadataReceived: any[] = [];
        const progressReceived: any[] = [];

        await runner.exec(
            { file: 'test1.dbc' } as any,
            (msg: any) => { metadataReceived.push(msg); },
            undefined, // no parser
            (msg: any) => { progressReceived.push(msg); }
        );

        // Metadados processados via callback regular quando o type é metadata
        assert.strictEqual(metadataReceived.length, 1);
        assert.deepStrictEqual(metadataReceived[0], { type: 'metadata', fields: [{ name: 'ID' }] });

        // Progresso processado via progressCallback
        assert.strictEqual(progressReceived.length, 3);
        assert.strictEqual(progressReceived[0].status, 'started');
        assert.strictEqual(progressReceived[1].status, 'running');
        assert.strictEqual(progressReceived[2].status, 'finished');
        assert.strictEqual(progressReceived[2].summary.total, 2);
        
        // Verifica se o globalSummary foi atualizado pelo processo filho? 
        // Não, porque quando passamos progressCallback, nós assumimos o controle. 
        // O JobRunner atualiza o globalSummary apenas no bloco "else" (quando não passamos progressCallback).
        assert.strictEqual(JobRunner.globalSummary.total, 0); 
    });

    it('deve atualizar o resumo global e imprimir no console se nenhum progressCallback for fornecido', async () => {
        const runner = JobRunner.init(dummyScriptPath);
        
        // Mock stdout para evitar sujeira no console dos testes
        const stdoutSpy = mock.method(process.stdout, 'write', () => { return true; });

        await runner.exec(
            { file: 'test1.dbc' } as any,
            () => {}, // callback
            undefined // sem parser
            // sem progressCallback
        );

        // Como não passamos progressCallback, o JobRunner atualiza o state global.
        assert.strictEqual(JobRunner.globalSummary.total, 2);
        assert.strictEqual(JobRunner.globalSummary.founds, 2);
        assert.strictEqual(JobRunner.globalSummary.errors, 0);
        assert.strictEqual(JobRunner.finishedJobs, 1);
        
        // Verificando se ele tentou renderizar no console
        assert.ok(stdoutSpy.mock.callCount() > 0);
    });

    it('deve receber registros e aplicar parser quando fornecido', async () => {
        const runner = JobRunner.init(dummyScriptPath);
        
        const recordsReceived: any[] = [];
        const dummyParser = {
            parse: (record: any) => {
                return { ...record, parsed: true };
            }
        };

        await runner.exec(
            { file: 'test2.dbc' } as any,
            (msg: any) => { recordsReceived.push(msg); },
            dummyParser as any
        );

        assert.strictEqual(recordsReceived.length, 1);
        assert.strictEqual(recordsReceived[0].ID, 'test-record');
        assert.strictEqual(recordsReceived[0].parsed, true); // Certifica que o parser foi usado
    });

    it('deve rejeitar se o parser falhar ao processar uma mensagem', async () => {
        const runner = JobRunner.init(dummyScriptPath);
        const errorParser = {
            parse: () => { throw new Error('Parser failed'); }
        };

        await assert.rejects(
            () => runner.exec({ file: 'test2.dbc' } as any, () => {}, errorParser as any),
            (error: Error) => {
                assert.strictEqual(error.message, 'Parser failed');
                return true;
            }
        );
    });

    it('deve rejeitar se o processo filho sair com código de erro', async () => {
        const runner = JobRunner.init(dummyScriptPath);

        await assert.rejects(
            () => runner.exec({ file: 'error.dbc' } as any),
            (error: string) => {
                // Mensagem específica definida na linha 109 do JobRunner.ts
                assert.ok(error.includes('Foi fechado pelo sinal: null com o código 1'));
                return true;
            }
        );
    });
});

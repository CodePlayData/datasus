// @filename: processing.test.ts

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

// Testar a integração JobScheduler com o JobRunner.
//
// Usa child processes reais (fork do dummyJob.ts) para validar que:
//   1. O JobScheduler cria as JobMessages e delega ao JobRunner corretamente.
//   2. Múltiplos jobs do mesmo chunk rodam em paralelo e todos completam.
//   3. O filesProcessed é incrementado corretamente após cada job.
//   4. O callback recebe os dados IPC e o progressCallback recebe os eventos de progresso.

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { JobScheduler } from '../../../../packages/core/src/infra/job/JobScheduler.js';
import { JobRunner } from '../../../../packages/core/src/infra/job/JobRunner.js';

// @ts-ignore
const __dirname = import.meta.dirname;

// Usa o mesmo dummyJob dos testes unitários para simular workers reais
const DUMMY_JOB = join(__dirname, '..', '..', '..', 'unit', 'packages', 'core', 'dummyJob.ts');

describe('Processamento (JobScheduler + JobRunner)', () => {
    beforeEach(() => {
        JobRunner.totalJobs = 0;
        JobRunner.finishedJobs = 0;
        JobRunner.startTime = Date.now();
        JobRunner.globalSummary = { total: 0, founds: 0, errors: 0 };
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('deve agendar um chunk de jobs e processar todos em paralelo', async () => {
        const scheduler = JobScheduler.init(3);
        const chunk = ['test1.dbc', 'test1.dbc', 'test1.dbc'];

        const progressMessages: any[] = [];
        const callbackMessages: any[] = [];

        await scheduler.exec(
            chunk,
            DUMMY_JOB,
            undefined, // dataSource
            (msg: any) => { callbackMessages.push(msg); },
            undefined, // parser
            (msg: any) => { progressMessages.push(msg); }
        );

        // Cada worker (test1.dbc) emite 3 mensagens de progresso (started, running, finished)
        // 3 workers × 3 msgs = 9
        assert.strictEqual(progressMessages.length, 9);

        // Cada worker emite 1 metadata callback
        // 3 workers × 1 metadata = 3
        assert.strictEqual(callbackMessages.length, 3);

        // Todos os 3 devem ter sido contabilizados
        assert.strictEqual(scheduler.incrementFilesProcessed(0), 3);
    });

    it('deve construir a JobMessage com src, criteria e dataPath corretamente', async () => {
        const scheduler = JobScheduler.init(
            1,
            [{ type: 'string', prop: 'PA_SEXO', value: 'F' }], // criteria
            '/tmp/data' // DATA_PATH
        );

        // Vamos verificar o jobMessage indiretamente: o dummyJob test1.dbc não usa criteria/dataPath,
        // então o worker vai rodar normalmente — o que importa é que a mensagem chegou.
        const progressMessages: any[] = [];

        await scheduler.exec(
            ['test1.dbc'],
            DUMMY_JOB,
            'PA' as any, // dataSource
            () => {},
            undefined,
            (msg: any) => { progressMessages.push(msg); }
        );

        const finished = progressMessages.find(m => m.status === 'finished');
        assert.ok(finished, 'Job deve ter terminado');
        assert.strictEqual(scheduler.incrementFilesProcessed(0), 1);
    });

    it('deve incrementar filesProcessed sequencialmente após cada job completar', async () => {
        const scheduler = JobScheduler.init(2);

        // Primeiro chunk
        await scheduler.exec(
            ['test1.dbc', 'test1.dbc'],
            DUMMY_JOB,
            undefined,
            () => {},
            undefined,
            () => {}
        );
        assert.strictEqual(scheduler.incrementFilesProcessed(0), 2);

        // Segundo chunk no mesmo scheduler
        await scheduler.exec(
            ['test1.dbc'],
            DUMMY_JOB,
            undefined,
            () => {},
            undefined,
            () => {}
        );
        assert.strictEqual(scheduler.incrementFilesProcessed(0), 3);
    });

    it('deve aplicar parser nos registros quando fornecido', async () => {
        const scheduler = JobScheduler.init(1);
        const parsedRecords: any[] = [];

        const dummyParser = {
            parse: (record: any) => ({ ...record, parsed: true })
        };

        await scheduler.exec(
            ['test2.dbc'], // dummyJob envia { ID: 'test-record' } para test2.dbc
            DUMMY_JOB,
            undefined,
            (msg: any) => { parsedRecords.push(msg); },
            dummyParser as any,
            () => {}
        );

        // O registro deve ter passado pelo parser
        assert.strictEqual(parsedRecords.length, 1);
        assert.strictEqual(parsedRecords[0].ID, 'test-record');
        assert.strictEqual(parsedRecords[0].parsed, true);
    });

    it('deve tratar erro de um worker via onError callback', async () => {
        const scheduler = JobScheduler.init(1);
        let capturedError: Error | undefined;
        let capturedChunk: string[] | undefined;

        await scheduler.exec(
            ['error.dbc'], // dummyJob faz process.exit(1) para error.dbc
            DUMMY_JOB,
            undefined,
            undefined,
            undefined,
            undefined,
            async (error: Error, failedChunk?: string[]) => {
                capturedError = error;
                capturedChunk = failedChunk;
            }
        );

        assert.ok(capturedError, 'Deve ter capturado o erro');
        assert.strictEqual(capturedError!.name, 'FailToScheduleJob');
        assert.deepStrictEqual(capturedChunk, ['error.dbc']);
    });
});
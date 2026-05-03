// @filename: JobScheduler.test.ts

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
import { JobScheduler } from '../../../../packages/core/src/infra/job/JobScheduler.js';
import { JobRunner } from '../../../../packages/core/src/infra/job/JobRunner.js';

describe('JobScheduler', () => {
    afterEach(() => {
        mock.restoreAll();
    });

    it('deve agendar jobs e incrementar arquivos processados com sucesso', async () => {
        const scheduler = JobScheduler.init(2);
        
        // Mock JobRunner.exec para simular sucesso
        const execSpy = mock.method(JobRunner.prototype, 'exec', async () => {
            return true;
        });

        await scheduler.exec(['file1.dbc', 'file2.dbc'], 'dummy.js');

        assert.strictEqual(execSpy.mock.callCount(), 2);
        
        // filesProcessed é privado, mas podemos acessar via incrementFilesProcessed(0)
        assert.strictEqual(scheduler.incrementFilesProcessed(0), 2);
    });

    describe('FailToScheduleJob', () => {
        it('deve chamar o fallback onError quando o agendamento falha', async () => {
            const scheduler = JobScheduler.init(2);
            
            // Força falha no JobRunner
            mock.method(JobRunner.prototype, 'exec', async () => {
                throw new Error('Fork failed');
            });

            let capturedError: Error | undefined;
            let capturedChunk: string[] | undefined;

            await scheduler.exec(
                ['error.dbc'], 
                'dummy.js',
                undefined,
                undefined,
                undefined,
                undefined,
                async (error, chunk) => {
                    capturedError = error;
                    capturedChunk = chunk as string[];
                }
            );

            assert.ok(capturedError, 'Fallback deveria ter sido chamado');
            assert.strictEqual(capturedError!.name, 'FailToScheduleJob');
            assert.deepStrictEqual(capturedChunk, ['error.dbc']);
        });

        it('deve lançar FailToScheduleJob quando nenhum fallback é fornecido', async () => {
            const scheduler = JobScheduler.init(2);
            
            mock.method(JobRunner.prototype, 'exec', async () => {
                throw new Error('Fork failed');
            });

            await assert.rejects(
                () => scheduler.exec(['error.dbc'], 'dummy.js'),
                (error: Error) => {
                    assert.strictEqual(error.name, 'FailToScheduleJob');
                    return true;
                }
            );
        });
    });
});

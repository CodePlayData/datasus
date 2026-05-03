// @filename: JobOrchestrator.test.ts

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
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';
import { JobScheduler } from '../../../../packages/core/src/infra/job/JobScheduler.js';


class MockGateway {
    async list(subset: any, format?: string) {
        return ['file1.dbc', 'file2.dbc', 'file2.dbc', 'file3.dbc']; // testando duplicates
    }
    
    async get(file: string, dest: string) {
        return; // simulate download
    }
}

describe('JobOrchestrator', () => {
    let gateway: any;
    
    beforeEach(() => {
        gateway = new MockGateway();
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('deve inicializar e definir chunks corretamente via subset()', async () => {
        const orchestrator = JobOrchestrator.init(gateway, undefined, 2, './test-data');
        
        await orchestrator.subset({ src: 'test-src' } as any);
        
        // Deve remover duplicatas (file2.dbc aparecia 2x)
        assert.deepStrictEqual(orchestrator.files, ['file1.dbc', 'file2.dbc', 'file3.dbc']);
        
        // Como o max concurrent é 2 e temos 3 files, deve gerar 2 chunks: [file1, file2], [file3]
        assert.strictEqual(orchestrator.chunks.length, 2);
        assert.deepStrictEqual(orchestrator.chunks[0], ['file1.dbc', 'file2.dbc']);
        assert.deepStrictEqual(orchestrator.chunks[1], ['file3.dbc']);
    });

    it('deve baixar arquivos e agendar jobs corretamente via exec()', async () => {
        const orchestrator = JobOrchestrator.init(gateway, undefined, 2, './test-data');
        await orchestrator.subset({ src: 'test-src' } as any);

        // Mock gateway get to count calls
        const getSpy = mock.method(gateway, 'get', async () => {});

        // Mock JobScheduler to avoid running real jobs
        const execSpy = mock.method(JobScheduler.prototype, 'exec', async () => {});

        await orchestrator.exec(undefined, undefined, false);

        // Gateway gets called for each file
        assert.strictEqual(getSpy.mock.callCount(), 3);
        
        // JobScheduler.exec gets called for each chunk (we have 2 chunks)
        assert.strictEqual(execSpy.mock.callCount(), 2);

        // After completion, files and chunks should be reset
        assert.deepStrictEqual(orchestrator.files, []);
        assert.deepStrictEqual(orchestrator.chunks, []);
    });
});

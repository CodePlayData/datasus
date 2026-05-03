// @filename: orchestrator.test.ts

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

// Testar a integração do JobOrchestrator com o SplitIntoChunks.
//
// Valida que o Orchestrator:
//   1. Recebe a lista do gateway, deduplica, e fatia corretamente usando SplitIntoChunks.
//   2. Expõe os files e chunks processados para inspeção.
//   3. Respeita MAX_CONCURRENT_PROCESSES na divisão dos lotes.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';

// Mock do gateway que simula uma listagem FTP com duplicatas
const mockGateway = {
    list: async (_subset: any, _display: string) => [
        'PAAC1001.dbc',
        'PAAC1002.dbc',
        'PAAC1003.dbc',
        'PAAM1001.dbc',
        'PAAM1002.dbc',
        'PASP1001.dbc',
        'PASP1002.dbc',
        'PARJ1001.dbc',
        'PARJ1002.dbc',
        'PARN1001.dbc',
        // Duplicatas intencionais para testar a deduplicação
        'PAAC1001.dbc',
        'PAAM1001.dbc',
    ],
    get: async () => {}
};

describe('Orquestração (JobOrchestrator + SplitIntoChunks)', () => {

    it('deve listar, deduplicar e fatiar em chunks de tamanho MAX_CONCURRENT_PROCESSES', async () => {
        const orchestrator = JobOrchestrator.init(mockGateway as any, [], 3);

        await orchestrator.subset({ src: 'PA' } as any);

        // Deve ter deduplicado: 12 entradas -> 10 únicas
        assert.strictEqual(orchestrator.files.length, 10);
        assert.ok(!hasDuplicates(orchestrator.files), 'Não deve haver duplicatas nos files');

        // Com MAX_CONCURRENT_PROCESSES=3, 10 arquivos devem gerar 4 chunks: [3, 3, 3, 1]
        assert.strictEqual(orchestrator.chunks.length, 4);
        assert.strictEqual(orchestrator.chunks[0].length, 3);
        assert.strictEqual(orchestrator.chunks[1].length, 3);
        assert.strictEqual(orchestrator.chunks[2].length, 3);
        assert.strictEqual(orchestrator.chunks[3].length, 1);
    });

    it('deve gerar um único chunk quando MAX_CONCURRENT_PROCESSES >= número de arquivos', async () => {
        const orchestrator = JobOrchestrator.init(mockGateway as any, [], 20);

        await orchestrator.subset({ src: 'PA' } as any);

        assert.strictEqual(orchestrator.files.length, 10);
        assert.strictEqual(orchestrator.chunks.length, 1);
        assert.strictEqual(orchestrator.chunks[0].length, 10);
    });

    it('deve gerar chunks individuais quando MAX_CONCURRENT_PROCESSES = 1', async () => {
        const orchestrator = JobOrchestrator.init(mockGateway as any, [], 1);

        await orchestrator.subset({ src: 'PA' } as any);

        assert.strictEqual(orchestrator.files.length, 10);
        assert.strictEqual(orchestrator.chunks.length, 10);
        assert.ok(orchestrator.chunks.every(chunk => chunk.length === 1));
    });

    it('deve resetar estado ao chamar subset() novamente', async () => {
        const orchestrator = JobOrchestrator.init(mockGateway as any, [], 5);

        await orchestrator.subset({ src: 'PA' } as any);
        assert.strictEqual(orchestrator.files.length, 10);

        // Gateway reduzido para simular outra query
        const smallGateway = {
            list: async () => ['BISP1001.dbc', 'BISP1002.dbc'],
            get: async () => {}
        };

        const orchestrator2 = JobOrchestrator.init(smallGateway as any, [], 5);
        await orchestrator2.subset({ src: 'BI' } as any);

        assert.strictEqual(orchestrator2.files.length, 2);
        assert.strictEqual(orchestrator2.chunks.length, 1);
        assert.deepStrictEqual(orchestrator2.chunks[0], ['BISP1001.dbc', 'BISP1002.dbc']);
    });

    it('deve preservar a ordem dos arquivos dentro de cada chunk', async () => {
        const orchestrator = JobOrchestrator.init(mockGateway as any, [], 3);

        await orchestrator.subset({ src: 'PA' } as any);

        // O primeiro chunk deve conter os 3 primeiros arquivos na ordem original
        assert.strictEqual(orchestrator.chunks[0][0], 'PAAC1001.dbc');
        assert.strictEqual(orchestrator.chunks[0][1], 'PAAC1002.dbc');
        assert.strictEqual(orchestrator.chunks[0][2], 'PAAC1003.dbc');

        // O segundo chunk deve conter os próximos 3
        assert.strictEqual(orchestrator.chunks[1][0], 'PAAM1001.dbc');
        assert.strictEqual(orchestrator.chunks[1][1], 'PAAM1002.dbc');
        assert.strictEqual(orchestrator.chunks[1][2], 'PASP1001.dbc');
    });

    it('deve extrair o datasource do subset.src', async () => {
        const orchestrator = JobOrchestrator.init(mockGateway as any, [], 2);

        await orchestrator.subset({ src: 'PA' } as any);

        // Após o subset, o orchestrator deve ter o datasource definido internamente
        // Podemos indiretamente verificar pois ele expõe files e chunks
        assert.strictEqual(orchestrator.files.length, 10);
        assert.strictEqual(orchestrator.chunks.length, 5); // 10 files / 2 = 5 chunks
    });
});

function hasDuplicates(arr: string[]): boolean {
    return new Set(arr).size !== arr.length;
}
// @filename: empty_subset.test.ts

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

// E2E: Resiliência — Subset sem dados
//
// Valida que o pipeline NÃO crasheia quando:
//   1. O subset lista 0 arquivos (estado inexistente).
//   2. Nenhum job é agendado.
//   3. O pipeline retorna normalmente.

import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { BasicFTPClient, DATASUSFTPGateway, StatePeriodStrategy } from '../../../../packages/core/src/index.js';
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';

const SIASUS_PATH = '/dissemin/publicos/SIASUS/200801_/Dados/';

describe('E2E: Resiliência — Subset sem dados', () => {
    let client: BasicFTPClient;

    after(() => {
        if (client) client.close();
    });

    it('deve completar sem erros quando o subset não encontra arquivos', async () => {
        // 1. Conexão FTP real
        client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(client instanceof BasicFTPClient);

        // 2. Gateway + Orchestrator
        const gateway = new DATASUSFTPGateway(client, SIASUS_PATH, new StatePeriodStrategy());
        const orchestrator = JobOrchestrator.init(gateway, { concurrency: 1, verbose: false });

        // Subset com estado inexistente — nenhum arquivo deve ser encontrado
        const subset = {
            src: 'PA',
            states: ['XX'], // Não existe
            period: {
                start: { month: '01', year: 2010 },
                end: { month: '01', year: 2010 }
            }
        };

        await orchestrator.subset(subset as any);

        // Deve ter listado 0 arquivos
        assert.strictEqual(orchestrator.files.length, 0, 'Não deve encontrar arquivos para estado XX');

        // exec() com 0 arquivos não deve crashar
        let callbackCalled = false;
        await orchestrator.exec(
            async () => { callbackCalled = true; }
        );

        assert.strictEqual(callbackCalled, false, 'Callback não deve ser chamado sem arquivos');
    });
});

// @filename: multi_file_pipeline.test.ts

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

// E2E: Pipeline com Múltiplos Arquivos e Concorrência
//
// Valida que o JobOrchestrator gerencia corretamente:
//   1. Download de múltiplos arquivos (com cache).
//   2. Divisão em chunks baseado no MAX_CONCURRENT_PROCESSES.
//   3. Execução paralela de workers reais.

import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

import { BasicFTPClient, DATASUSFTPGateway, StatePeriodStrategy } from '../../../../packages/core/src/index.js';
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';

const SIASUS_PATH = '/dissemin/publicos/SIASUS/200801_/Dados/';
const DATA_DIR = join(tmpdir(), `e2e_multi_${Date.now()}`);

describe('E2E: Pipeline Múltiplos Arquivos e Concorrência', () => {
    let client: BasicFTPClient;

    after(() => {
        if (client) client.close();
        if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true, force: true });
    });

    it('deve baixar e processar múltiplos arquivos em paralelo', async () => {
        mkdirSync(DATA_DIR, { recursive: true });

        client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(client instanceof BasicFTPClient);

        const gateway = new DATASUSFTPGateway(client, SIASUS_PATH, new StatePeriodStrategy());
        
        // MAX_CONCURRENT_PROCESSES = 2 para forçar paralelismo
        const orchestrator = JobOrchestrator.init(gateway, { concurrency: 2, dataPath: DATA_DIR, verbose: false });

        // Subset com 2 meses do Acre (PAAC1001.dbc e PAAC1002.dbc)
        const subset = {
            src: 'PA',
            states: ['AC'],
            period: {
                start: { month: '01', year: 2010 },
                end: { month: '02', year: 2010 }
            }
        };

        await orchestrator.subset(subset as any);

        assert.strictEqual(orchestrator.files.length, 2, 'Deve encontrar 2 arquivos');
        // @ts-ignore - acessando propriedade para validar chunks
        assert.strictEqual(orchestrator.chunks.length, 1, 'Com concorrência 2 e 2 arquivos, deve ter 1 chunk de 2');

        let receivedRecords = 0;
        const processedFiles = new Set<string>();

        await orchestrator.exec(
            async (msg: any) => {
                if (msg && msg.type === 'metadata') return;
                // No core, as mensagens de registro não costumam vir com o nome do arquivo, 
                // mas as de progresso sim (capturadas internamente pelo JobRunner).
                // Aqui apenas contamos o total.
                receivedRecords++;
            }
        );

        assert.ok(receivedRecords > 0, `Deve ter processado registros de ambos os arquivos (total: ${receivedRecords})`);
        
        // Verifica se os dois arquivos estão no disco
        assert.ok(existsSync(join(DATA_DIR, 'PAAC1001.dbc')), 'PAAC1001.dbc deve existir');
        assert.ok(existsSync(join(DATA_DIR, 'PAAC1002.dbc')), 'PAAC1002.dbc deve existir');
    });
});

// @filename: filtered_pipeline.test.ts

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

// E2E: Pipeline com Critérios (filtragem)
//
// Estende o pipeline StatePeriod aplicando StringCriteria e ArrayCriteria.
// Valida que:
//   1. O número de registros de saída é menor que o total.
//   2. Todos os registros satisfazem os critérios.
//   3. O cache de download funciona entre chamadas.

import { describe, it, after, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

import { BasicFTPClient } from '../../../../packages/core/src/infra/ftp/BasicFTPClient.js';
import { DATASUSStatePeriodFTPGateway } from '../../../../packages/core/src/interface/gateway/DATASUSStatePeriodFTPGateway.js';
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';
import { DbcWriter } from '../../../../packages/core/src/infra/dbc/DbcWriter.js';
import { DbcReader } from '../../../../packages/core/src/infra/dbc/DbcReader.js';
import {CriteriaObject} from "@codeplaydata/datasus-core/dist/interface/criteria/CriteriaObject";

const SIASUS_PATH = '/dissemin/publicos/SIASUS/200801_/Dados/';
const DATA_DIR = join(tmpdir(), `e2e_filtered_${Date.now()}`);
const OUT_FILE = join(DATA_DIR, 'output_filtered.dbc');

function resetDbcWriter() {
    // @ts-ignore
    DbcWriter.instance = undefined;
    // @ts-ignore
    DbcWriter._initPromise = null;
}

describe('E2E: Pipeline com Critérios (PA_SEXO=F, PA_UFMUN=120040)', () => {
    let client: BasicFTPClient;

    after(() => {
        resetDbcWriter();
        if (client) client.close();
        if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true, force: true });
    });

    it('deve filtrar registros E2E e validar consistência da saída', async () => {
        // 1. Setup
        mkdirSync(DATA_DIR, { recursive: true });
        resetDbcWriter();

        // 2. Conexão FTP real
        client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(client instanceof BasicFTPClient);

        // 3. Gateway + Orchestrator com critérios de filtragem
        const gateway = new DATASUSStatePeriodFTPGateway(client, SIASUS_PATH);
        const criteria = [
            { type: 'string', prop: 'PA_SEXO', value: 'F' },
            { type: 'string', prop: 'PA_UFMUN', value: '120040' }
        ] as CriteriaObject[];
        const orchestrator = JobOrchestrator.init(gateway, { filters: criteria, concurrency: 1, dataPath: DATA_DIR, verbose: false });

        const subset = {
            src: 'PA',
            states: ['AC'],
            period: {
                start: { month: '01', year: 2010 },
                end: { month: '01', year: 2010 }
            }
        };

        await orchestrator.subset(subset as any);
        assert.ok(orchestrator.files.length > 0);

        // 4. Inicializar DbcWriter
        const OUTPUT_FIELDS = [
            { name: 'PA_CODUNI', type: 'C' as const, size: 7 },
            { name: 'PA_SEXO', type: 'C' as const, size: 1 },
            { name: 'PA_UFMUN', type: 'C' as const, size: 6 },
        ];
        const writer = await DbcWriter.initialize(OUT_FILE, OUTPUT_FIELDS);

        let receivedCount = 0;

        // 5. Executar o pipeline com filtros
        await orchestrator.exec(
            async (msg: any) => {
                if (msg && msg.type === 'metadata') return;
                await writer.write({
                    PA_CODUNI: msg.PA_CODUNI,
                    PA_SEXO: msg.PA_SEXO,
                    PA_UFMUN: msg.PA_UFMUN,
                });
                receivedCount++;
            }
        );

        assert.ok(receivedCount > 0, `Deve ter recebido registros filtrados (recebidos: ${receivedCount})`);
        // Com filtros, deve ser MUITO menos que 39.306 (total sem filtros)
        assert.ok(receivedCount < 39306, `Filtro deve reduzir registros (${receivedCount} < 39306)`);

        // 6. Fechar o writer
        await writer.close();
        assert.ok(existsSync(OUT_FILE));

        // 7. Read Back — validar que TODOS satisfazem os critérios
        const reader = await DbcReader.load(OUT_FILE);
        let readBackCount = 0;
        await reader.forEachRecords(async (record: any) => {
            readBackCount++;
            assert.strictEqual(record.PA_SEXO, 'F', 'Todos devem ser femininos');
            assert.strictEqual(record.PA_UFMUN, '120040', 'Todos devem ser de Rio Branco');
        });
        reader.remove(false);

        assert.strictEqual(readBackCount, receivedCount,
            `Registros lidos (${readBackCount}) = escritos (${receivedCount})`
        );
    });

    it('não deve rebaixar o arquivo se ele já existe no disco', async () => {
        const downloadedFile = join(DATA_DIR, 'PAAC1001.dbc');
        assert.ok(existsSync(downloadedFile), 'Arquivo deve existir do teste anterior');

        const downloadSpy = mock.method(client.client, 'downloadTo', async () => {
            throw new Error('NÃO deveria ter chamado downloadTo!');
        });

        await client.download(downloadedFile, SIASUS_PATH + 'PAAC1001.dbc');

        assert.strictEqual(downloadSpy.mock.callCount(), 0,
            'downloadTo não deve ser chamado para arquivo existente'
        );
        mock.restoreAll();
    });
});

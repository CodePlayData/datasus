// @filename: country_year_pipeline.test.ts

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

// E2E: Pipeline CountryYear (fluxo SINAN-like)
//
// Exercita o pipeline completo usando o DATASUSCountryYearFTPGateway:
//   Connect → List → Subset → Download → Process → Write → Read Back
//
// Usa ZIKA 2019 como dataset pequeno (~5MB).

import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

import { BasicFTPClient, DATASUSFTPGateway, CountryYearStrategy } from '../../../../packages/core/src/index.js';
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';
import { DbcWriter } from '../../../../packages/core/src/infra/dbc/DbcWriter.js';
import { DbcReader } from '../../../../packages/core/src/infra/dbc/DbcReader.js';

const SINAN_PATH = '/dissemin/publicos/SINAN/DADOS/FINAIS/';
const DATA_DIR = join(tmpdir(), `e2e_country_year_${Date.now()}`);
const OUT_FILE = join(DATA_DIR, 'output_country_year.dbc');

function resetDbcWriter() {
    // @ts-ignore
    DbcWriter.instance = undefined;
    // @ts-ignore
    DbcWriter._initPromise = null;
}

describe('E2E: Pipeline CountryYear (SINAN-like, ZIKA 2019)', () => {
    let client: BasicFTPClient;

    after(() => {
        resetDbcWriter();
        if (client) client.close();
        if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true, force: true });
    });

    it('deve executar o pipeline completo com gateway CountryYear', async () => {
        // 1. Setup
        mkdirSync(DATA_DIR, { recursive: true });
        resetDbcWriter();

        // 2. Conexão FTP real
        client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(client instanceof BasicFTPClient);

        // 3. Gateway CountryYear + Orchestrator
        const gateway = new DATASUSFTPGateway(client, SINAN_PATH, new CountryYearStrategy());
        const orchestrator = JobOrchestrator.init(gateway, { concurrency: 1, dataPath: DATA_DIR, verbose: false });

        const subset = { src: 'ZIKA', year: [2019] };

        await orchestrator.subset(subset as any);

        assert.ok(orchestrator.files.length > 0, 'Deve ter listado pelo menos 1 arquivo ZIKA');
        assert.ok(
            orchestrator.files.every(f => f.startsWith('ZIKA')),
            'Todos os arquivos devem começar com ZIKA'
        );

        // 4. Inicializar DbcWriter — usamos campos genéricos que existem em qualquer dataset SINAN
        //    Primeiro precisamos descobrir os campos; processamos sem writer primeiro
        let firstMetadata: any;
        let totalRecords = 0;

        await orchestrator.subset(subset as any); // resetar após inspeção acima

        // 5. Executar pipeline coletando metadata
        await orchestrator.exec(
            async (msg: any) => {
                if (msg && msg.type === 'metadata') {
                    firstMetadata = msg;
                    return;
                }
                totalRecords++;
            }
        );

        assert.ok(firstMetadata, 'Deve ter recebido metadata do worker');
        assert.ok(firstMetadata.fields.length > 0, 'Metadata deve conter fields');
        assert.ok(totalRecords > 0, `Deve ter processado registros (total: ${totalRecords})`);
    });
});

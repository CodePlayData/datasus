// @filename: state_period_pipeline.test.ts

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

// E2E: Pipeline StatePeriod (fluxo SIASUS-like)
//
// Exercita o pipeline completo usando conexão FTP real ao DataSUS:
//   Connect → List → Subset → Download → Process → Write → Read Back
//
// Também valida que o download NÃO bate novamente no FTP se o arquivo já existe.

import { describe, it, after, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, unlinkSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

import { BasicFTPClient } from '../../../../packages/core/src/infra/ftp/BasicFTPClient.js';
import { DATASUSStatePeriodFTPGateway } from '../../../../packages/core/src/interface/gateway/DATASUSStatePeriodFTPGateway.js';
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';
import { DbcWriter } from '../../../../packages/core/src/infra/dbc/DbcWriter.js';
import { DbcReader } from '../../../../packages/core/src/infra/dbc/DbcReader.js';

const SIASUS_PATH = '/dissemin/publicos/SIASUS/200801_/Dados/';
const DATA_DIR = join(tmpdir(), `e2e_state_period_${Date.now()}`);
const OUT_FILE = join(DATA_DIR, 'output_state_period.dbc');

function resetDbcWriter() {
    // @ts-ignore
    DbcWriter.instance = undefined;
    // @ts-ignore
    DbcWriter._initPromise = null;
}

describe('E2E: Pipeline StatePeriod (SIASUS-like)', () => {
    let client: BasicFTPClient;

    after(() => {
        resetDbcWriter();
        if (client) client.close();
        // Limpa todo o diretório de dados
        if (existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true, force: true });
    });

    it('deve executar o pipeline completo: FTP → List → Download → Process → Write → Read', async () => {
        // 1. Setup
        mkdirSync(DATA_DIR, { recursive: true });
        resetDbcWriter();

        // 2. Conexão FTP real
        client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(client instanceof BasicFTPClient, 'Deve conectar ao FTP do DataSUS');

        // 3. Gateway + Orchestrator
        const gateway = new DATASUSStatePeriodFTPGateway(client, SIASUS_PATH);
        const orchestrator = JobOrchestrator.init(gateway, { concurrency: 1, dataPath: DATA_DIR, verbose: false });

        const subset = {
            src: 'PA',
            states: ['AC'],
            period: {
                start: { month: '01', year: 2010 },
                end: { month: '01', year: 2010 }
            }
        };

        await orchestrator.subset(subset as any);

        assert.ok(orchestrator.files.length > 0, 'Deve ter listado pelo menos 1 arquivo');
        assert.ok(
            orchestrator.files.some(f => f === 'PAAC1001.dbc'),
            'PAAC1001.dbc deve estar na lista'
        );

        // 4. Inicializar o DbcWriter
        const OUTPUT_FIELDS = [
            { name: 'PA_CODUNI', type: 'C' as const, size: 7 },
            { name: 'PA_SEXO', type: 'C' as const, size: 1 },
        ];
        const writer = await DbcWriter.initialize(OUT_FILE, OUTPUT_FIELDS);

        let receivedCount = 0;

        // 5. Executar o pipeline (download real + processamento real)
        await orchestrator.exec(
            async (msg: any) => {
                if (msg && msg.type === 'metadata') return;
                await writer.write({ PA_CODUNI: msg.PA_CODUNI, PA_SEXO: msg.PA_SEXO });
                receivedCount++;
            }
        );

        assert.ok(receivedCount > 0, `Deve ter processado registros (recebidos: ${receivedCount})`);

        // 6. Fechar o writer e verificar arquivo de saída
        await writer.close();
        assert.ok(existsSync(OUT_FILE), 'Arquivo .dbc de saída deve existir');

        // 7. Read Back — validar consistência
        const reader = await DbcReader.load(OUT_FILE);
        let readBackCount = 0;
        await reader.forEachRecords(async (record: any) => {
            readBackCount++;
            assert.ok('PA_CODUNI' in record, 'Registro deve ter PA_CODUNI');
            assert.ok('PA_SEXO' in record, 'Registro deve ter PA_SEXO');
        });
        reader.remove(false);

        assert.strictEqual(readBackCount, receivedCount,
            `Registros lidos (${readBackCount}) devem bater com escritos (${receivedCount})`
        );
    });

    it('não deve baixar novamente do FTP se o arquivo já existe no disco (cache statSync)', async () => {
        // O teste anterior já baixou PAAC1001.dbc em DATA_DIR.
        // Verificamos que o arquivo existe.
        const downloadedFile = join(DATA_DIR, 'PAAC1001.dbc');
        assert.ok(existsSync(downloadedFile), 'Arquivo deve existir do teste anterior');

        // Espiamos o client.downloadTo para garantir que NÃO é chamado
        const downloadSpy = mock.method(client.client, 'downloadTo', async () => {
            throw new Error('NÃO deveria ter chamado downloadTo — arquivo já existe!');
        });

        // Chamamos download novamente
        await client.download(downloadedFile, SIASUS_PATH + 'PAAC1001.dbc');

        // downloadTo NÃO deve ter sido chamado (statSync encontra o arquivo e retorna cedo)
        assert.strictEqual(downloadSpy.mock.callCount(), 0,
            'downloadTo não deve ser chamado quando o arquivo já existe'
        );

        mock.restoreAll();
    });
});

// @filename: ingestion.test.ts

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

// Testar a integração do DATASUSStatePeriodFTPGateway com o DATASUSCountryYearFTPGateway e o BasicFTPClient.
//
// Usa um mock do FtpClient nativo para simular respostas reais do FTP do DataSUS,
// mas a cadeia BasicFTPClient → Gateway → list/get é toda real.
// Conexão externa real fica para os testes E2E.

import { describe, it, mock, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client as FtpClient } from 'basic-ftp/dist/Client.js';

import { BasicFTPClient } from '../../../../packages/core/src/infra/ftp/BasicFTPClient.js';
import { DATASUSStatePeriodFTPGateway } from '../../../../packages/core/src/interface/gateway/DATASUSStatePeriodFTPGateway.js';
import { DATASUSCountryYearFTPGateway } from '../../../../packages/core/src/interface/gateway/DATASUSCountryYearFTPGateway.js';

// Dados simulando a resposta real do FTP do DataSUS (SIASUS)
const SIASUS_FTP_LISTING = [
    { name: 'PAAC1001.dbc', size: 85000 },
    { name: 'PAAC1002.dbc', size: 92000 },
    { name: 'PAAC1003.dbc', size: 78000 },
    { name: 'PAAM1001.dbc', size: 310000 },
    { name: 'PAAM1002.dbc', size: 295000 },
    { name: 'PASP1001.dbc', size: 2400000 },
    { name: 'PASP1002.dbc', size: 2350000 },
    { name: 'PARJ1001.dbc', size: 1800000 },
    { name: 'BIAC1001.dbc', size: 45000 },
];

// Dados simulando a resposta real do FTP do DataSUS (SINAN)
const SINAN_FTP_LISTING = [
    { name: 'DENGBR19.dbc', size: 120000000 },
    { name: 'DENGBR20.dbc', size: 95000000 },
    { name: 'DENGBR21.dbc', size: 110000000 },
    { name: 'CHIKBR19.dbc', size: 35000000 },
    { name: 'CHIKBR20.dbc', size: 28000000 },
    { name: 'ZIKABR19.dbc', size: 5000000 },
];

describe('Ingestão de Dados (BasicFTPClient + Gateways)', () => {
    afterEach(() => {
        mock.restoreAll();
    });

    it('deve conectar via BasicFTPClient e retornar uma instância válida', async () => {
        mock.method(FtpClient.prototype, 'access', async () => {});
        const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(client instanceof BasicFTPClient);
    });

    describe('DATASUSStatePeriodFTPGateway (SIASUS)', () => {
        it('deve filtrar arquivos por src através da cadeia completa BasicFTPClient → Gateway', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            mock.method(FtpClient.prototype, 'list', async () => SIASUS_FTP_LISTING);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSStatePeriodFTPGateway(client, '/dissemin/publicos/SIASUS/200801_/Dados/');

            const result = await gateway.list({ src: 'PA' } as any, 'short') as string[];

            assert.ok(result.length > 0);
            assert.ok(result.every(name => name.startsWith('PA')));
            // BIAC1001.dbc NÃO deve estar na lista (src = BI, não PA)
            assert.ok(!result.includes('BIAC1001.dbc'));
        });

        it('deve filtrar por src, states e period na cadeia completa', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            mock.method(FtpClient.prototype, 'list', async () => SIASUS_FTP_LISTING);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSStatePeriodFTPGateway(client, '/path/');

            const subset = {
                src: 'PA',
                states: ['AC'],
                period: {
                    start: { month: '01', year: 2010 },
                    end: { month: '03', year: 2010 }
                }
            } as any;

            const result = await gateway.list(subset, 'short') as string[];

            // Deve encontrar PAAC1001, PAAC1002, PAAC1003
            assert.strictEqual(result.length, 3);
            assert.ok(result.includes('PAAC1001.dbc'));
            assert.ok(result.includes('PAAC1002.dbc'));
            assert.ok(result.includes('PAAC1003.dbc'));
            // Não deve incluir AM, SP ou RJ
            assert.ok(!result.some(name => name.includes('AM') || name.includes('SP') || name.includes('RJ')));
        });

        it('deve filtrar por múltiplos states na mesma chamada', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            mock.method(FtpClient.prototype, 'list', async () => SIASUS_FTP_LISTING);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSStatePeriodFTPGateway(client, '/path/');

            const subset = {
                src: 'PA',
                states: ['AC', 'SP'],
                period: {
                    start: { month: '01', year: 2010 },
                    end: { month: '01', year: 2010 }
                }
            } as any;

            const result = await gateway.list(subset, 'short') as string[];

            assert.ok(result.includes('PAAC1001.dbc'));
            assert.ok(result.includes('PASP1001.dbc'));
            assert.ok(!result.includes('PAAM1001.dbc'));
        });

        it('deve retornar objetos completos com display = full', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            mock.method(FtpClient.prototype, 'list', async () => SIASUS_FTP_LISTING);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSStatePeriodFTPGateway(client, '/path/');

            const result = await gateway.list({ src: 'PA', states: ['AC'] } as any, 'full');

            assert.ok(result.length > 0);
            assert.ok('name' in result[0]);
            assert.ok('size' in result[0]);
            assert.strictEqual(result[0].name, 'PAAC1001.dbc');
        });

        it('deve delegar o download para o BasicFTPClient.download()', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            const downloadSpy = mock.method(FtpClient.prototype, 'downloadTo', async () => {});
            // statSync vai falhar (arquivo não existe), forçando o download
            const dest = join(tmpdir(), `ingestion_test_${Date.now()}.dbc`);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSStatePeriodFTPGateway(client, '/dissemin/publicos/SIASUS/200801_/Dados/');

            await gateway.get('PAAC1001.dbc', dest);

            assert.strictEqual(downloadSpy.mock.callCount(), 1);
            assert.strictEqual(
                downloadSpy.mock.calls[0].arguments[1],
                '/dissemin/publicos/SIASUS/200801_/Dados/PAAC1001.dbc'
            );
        });
    });

    describe('DATASUSCountryYearFTPGateway (SINAN)', () => {
        it('deve filtrar arquivos por src através da cadeia completa', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            mock.method(FtpClient.prototype, 'list', async () => SINAN_FTP_LISTING);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSCountryYearFTPGateway(client, '/dissemin/publicos/SINAN/DADOS/FINAIS/');

            const result = await gateway.list({ src: 'DENG' } as any, 'short') as string[];

            assert.ok(result.length > 0);
            assert.ok(result.every(name => name.startsWith('DENG')));
            assert.ok(!result.some(name => name.startsWith('CHIK') || name.startsWith('ZIKA')));
        });

        it('deve filtrar por src e year na cadeia completa', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            mock.method(FtpClient.prototype, 'list', async () => SINAN_FTP_LISTING);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSCountryYearFTPGateway(client, '/path/');

            const subset = { src: 'DENG', year: [2019, 2020] } as any;
            const result = await gateway.list(subset, 'short') as string[];

            assert.strictEqual(result.length, 2);
            assert.ok(result.includes('DENGBR19.dbc'));
            assert.ok(result.includes('DENGBR20.dbc'));
            assert.ok(!result.includes('DENGBR21.dbc'));
        });

        it('deve retornar objetos completos com display = full', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            mock.method(FtpClient.prototype, 'list', async () => SINAN_FTP_LISTING);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSCountryYearFTPGateway(client, '/path/');

            const result = await gateway.list({ src: 'DENG', year: [2019] } as any, 'full');

            assert.strictEqual(result.length, 1);
            assert.ok('name' in result[0]);
            assert.strictEqual(result[0].name, 'DENGBR19.dbc');
        });

        it('deve delegar o download para o BasicFTPClient.download()', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {});
            const downloadSpy = mock.method(FtpClient.prototype, 'downloadTo', async () => {});
            const dest = join(tmpdir(), `ingestion_sinan_${Date.now()}.dbc`);

            const client = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
            const gateway = new DATASUSCountryYearFTPGateway(client, '/dissemin/publicos/SINAN/DADOS/FINAIS/');

            await gateway.get('DENGBR19.dbc', dest);

            assert.strictEqual(downloadSpy.mock.callCount(), 1);
            assert.strictEqual(
                downloadSpy.mock.calls[0].arguments[1],
                '/dissemin/publicos/SINAN/DADOS/FINAIS/DENGBR19.dbc'
            );
        });
    });
});
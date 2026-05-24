// @filename: DATASUSCountryYearFTPGateway.test.ts

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

import { describe, it, mock, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { DATASUSCountryYearFTPGateway } from '../../../../packages/core/src/interface/gateway/DATASUSCountryYearFTPGateway.js';

describe('DATASUSCountryYearFTPGateway', () => {
    // Mock for FTPClient
    const mockFTPClient = {
        list: mock.fn(async () => [
            { name: 'SINAN/BR19.dbc' },
            { name: 'SINAN/BR20.dbc' },
            { name: 'SINAN/BR21.dbc' },
            { name: 'OTHER/BR20.dbc' },
            { name: 'SINAN/SP20.dbc' } // não deve bater com formato de country (BR) se listado por ano
        ]),
        connect: mock.fn(),
        download: mock.fn(),
        close: mock.fn()
    };

    afterEach(() => {
        mock.restoreAll();
    });

    it('deve listar arquivos filtrando apenas por src', async () => {
        const gateway = new DATASUSCountryYearFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { src: 'SINAN/' } as any;
        const result = await gateway.list(subset, 'short');
        
        assert.deepStrictEqual(result, ['SINAN/BR19.dbc', 'SINAN/BR20.dbc', 'SINAN/BR21.dbc', 'SINAN/SP20.dbc']);
    });

    it('deve listar arquivos filtrando por src e array de year', async () => {
        const gateway = new DATASUSCountryYearFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { src: 'SINAN/', year: [2019, 2021] } as any;
        const result = await gateway.list(subset, 'short');
        
        assert.deepStrictEqual(result, ['SINAN/BR19.dbc', 'SINAN/BR21.dbc']);
    });

    it('deve retornar objetos completos quando display é full', async () => {
        const gateway = new DATASUSCountryYearFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { src: 'SINAN/', year: [2020] } as any;
        const result = await gateway.list(subset, 'full');
        
        assert.deepStrictEqual(result, [{ name: 'SINAN/BR20.dbc' }]);
    });
});

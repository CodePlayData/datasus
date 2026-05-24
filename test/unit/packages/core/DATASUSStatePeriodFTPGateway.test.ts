// @filename: DATASUSStatePeriodFTPGateway.test.ts

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
import { DATASUSStatePeriodFTPGateway } from '../../../../packages/core/src/interface/gateway/DATASUSStatePeriodFTPGateway.js';

describe('DATASUSStatePeriodFTPGateway', () => {
    // Mock for FTPClient
    const mockFTPClient = {
        list: mock.fn(async () => [
            { name: 'SIA/SP2401.dbc' },
            { name: 'SIA/SP2402.dbc' },
            { name: 'SIA/RJ2401.dbc' },
            { name: 'SIH/SP2401.dbc' },
            { name: 'SIA/MG2401.dbc' }
        ]),
        connect: mock.fn(),
        download: mock.fn(),
        close: mock.fn()
    };

    afterEach(() => {
        mock.restoreAll();
    });

    it('deve listar arquivos filtrando apenas por src', async () => {
        const gateway = new DATASUSStatePeriodFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { src: 'SIA/' } as any;
        const result = await gateway.list(subset, 'short');
        
        assert.deepStrictEqual(result, ['SIA/SP2401.dbc', 'SIA/SP2402.dbc', 'SIA/RJ2401.dbc', 'SIA/MG2401.dbc']);
    });

    it('deve listar arquivos filtrando por src e states', async () => {
        const gateway = new DATASUSStatePeriodFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { src: 'SIA/', states: ['SP', 'RJ'] } as any;
        const result = await gateway.list(subset, 'short');
        
        assert.deepStrictEqual(result, ['SIA/SP2401.dbc', 'SIA/SP2402.dbc', 'SIA/RJ2401.dbc']);
    });

    it('deve listar arquivos filtrando por src, states e period', async () => {
        const gateway = new DATASUSStatePeriodFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { 
            src: 'SIA/', 
            states: ['SP'],
            period: {
                start: { month: '01', year: 2024 },
                end: { month: '02', year: 2024 }
            }
        } as any;
        
        const result = await gateway.list(subset, 'short');
        assert.deepStrictEqual(result, ['SIA/SP2401.dbc', 'SIA/SP2402.dbc']);
    });

    it('deve lançar erro para período inválido (antes de 2008)', async () => {
        const gateway = new DATASUSStatePeriodFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { 
            src: 'SIA/', 
            states: ['SP'],
            period: {
                start: { month: '01', year: 2007 },
                end: { month: '12', year: 2007 }
            }
        } as any;
        
        await assert.rejects(
            () => gateway.list(subset, 'short'),
            /Invalid Period./
        );
    });

    it('deve lançar erro para período inválido (ano futuro)', async () => {
        const gateway = new DATASUSStatePeriodFTPGateway(mockFTPClient as any, '/dir');
        const futureYear = new Date().getFullYear() + 1;
        const subset = { 
            src: 'SIA/', 
            states: ['SP'],
            period: {
                start: { month: '01', year: futureYear },
                end: { month: '12', year: futureYear }
            }
        } as any;
        
        await assert.rejects(
            () => gateway.list(subset, 'short'),
            /Invalid Period./
        );
    });

    it('deve lançar erro para período com mês inválido', async () => {
        const gateway = new DATASUSStatePeriodFTPGateway(mockFTPClient as any, '/dir');
        
        const subset = { 
            src: 'SIA/', 
            states: ['SP'],
            period: {
                start: { month: '13', year: 2024 },
                end: { month: '12', year: 2024 }
            }
        } as any;
        
        await assert.rejects(
            () => gateway.list(subset, 'short'),
            /Invalid Period./
        );
    });
});

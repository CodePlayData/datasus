// @filename: DATASUSFTPGateway.test.ts

/*
 *     Copyright 2026 Pedro Paulo Teixeira dos Santos
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { describe, it, mock, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { DATASUSFTPGateway } from '../../../../packages/core/src/interface/gateway/DATASUSFTPGateway.js';

describe('DATASUSFTPGateway', () => {
    const mockFTPClient = {
        list: mock.fn(async () => [
            { name: 'SIA/SP2401.dbc' },
            { name: 'SIA/RJ2401.dbc' },
            { name: 'SIH/SP2401.dbc' }
        ]),
        connect: mock.fn(),
        download: mock.fn(),
        close: mock.fn()
    };

    afterEach(() => {
        mock.restoreAll();
    });

    it('deve delegar listagem de arquivos para a estratégia de nomenclatura', async () => {
        const mockStrategy = {
            buildPrefixes: mock.fn((input: any) => [`${input.src}${input.state}`])
        };

        const gateway = new DATASUSFTPGateway(mockFTPClient as any, '/dir', mockStrategy);
        const result = await gateway.list({ src: 'SIA/', state: 'SP' }, 'short');

        assert.strictEqual(mockStrategy.buildPrefixes.mock.calls.length, 1);
        assert.deepStrictEqual(result, ['SIA/SP2401.dbc']);
    });
});

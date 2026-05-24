// @filename: DbcRecordProvider.test.ts

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

import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { DbcRecordProvider } from '../../../../packages/linkage/src/infra/DbcRecordProvider.js';
import { DbcReader } from '@codeplaydata/datasus-core';

describe('DbcRecordProvider', () => {
    it('deve executar o callback para cada registro do DBC', async () => {
        // Mock do DbcReader
        const mockReader = {
            forEachRecords: mock.fn(async (cb: Function) => {
                await cb({ ID: '1' });
                await cb({ ID: '2' });
            }),
            remove: mock.fn(() => {})
        };

        // Mock do método estático DbcReader.load
        mock.method(DbcReader, 'load', async () => mockReader);

        const provider = new DbcRecordProvider('test.dbc', false);
        const results: any[] = [];
        
        await provider.exec(async (record) => {
            results.push(record);
        });

        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].ID, '1');
        assert.strictEqual(mockReader.forEachRecords.mock.callCount(), 1);
        assert.strictEqual(mockReader.remove.mock.callCount(), 1);
        
        mock.restoreAll();
    });

    it('deve logar um aviso no subset mas não falhar', async () => {
        const provider = new DbcRecordProvider('test.dbc', true); // Forçamos true aqui para testar o aviso
        const warnSpy = mock.method(console, 'warn', () => {});
        
        await provider.subset({ any: 'config' });
        
        assert.strictEqual(warnSpy.mock.callCount(), 1);
        assert.match(warnSpy.mock.calls[0].arguments[0], /does not support subsetting/);
        
        mock.restoreAll();
    });
});

// @filename: MongoIndex.test.ts

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
import { MongoIndex } from '../../../../packages/linkage/src/infra/MongoIndex.js';

describe('MongoIndex', () => {
    it('deve inserir um documento via set()', async () => {
        const mockCollection = {
            insertOne: mock.fn(async () => ({}))
        };
        const index = new MongoIndex(mockCollection as any);
        
        await index.set('k1', { val: 1 });
        
        assert.strictEqual(mockCollection.insertOne.mock.callCount(), 1);
        // @ts-ignore
        assert.deepStrictEqual(mockCollection.insertOne.mock.calls[0].arguments[0], { key: 'k1', value: { val: 1 } });
    });

    it('deve recuperar documentos via get() e extrair o campo value', async () => {
        const mockCollection = {
            find: mock.fn(() => ({
                toArray: async () => [{ key: 'k1', value: { a: 1 } }, { key: 'k1', value: { a: 2 } }]
            }))
        };
        const index = new MongoIndex(mockCollection as any);
        
        const results = await index.get('k1');
        
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].a, 1);
        assert.strictEqual(results[1].a, 2);
        // @ts-ignore
        assert.deepStrictEqual(mockCollection.find.mock.calls[0].arguments[0], { key: 'k1' });
    });

    it('deve verificar existência via has() usando countDocuments', async () => {
        const mockCollection = {
            countDocuments: mock.fn(async () => 1)
        };
        const index = new MongoIndex(mockCollection as any);
        
        const exists = await index.has('k1');
        
        assert.strictEqual(exists, true);
        // @ts-ignore
        assert.deepStrictEqual(mockCollection.countDocuments.mock.calls[0].arguments[0], { key: 'k1' });
    });
});

// @filename: InMemoryIndex.test.ts

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

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryIndex } from '../../../../packages/linkage/src/infra/InMemoryIndex.js';

describe('InMemoryIndex', () => {
    it('deve armazenar e recuperar um valor pela chave', async () => {
        const index = new InMemoryIndex();
        await index.set('key1', { id: 1 });
        
        const results = await index.get('key1');
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].id, 1);
    });

    it('deve armazenar múltiplos valores para a mesma chave', async () => {
        const index = new InMemoryIndex();
        await index.set('key1', { id: 1 });
        await index.set('key1', { id: 2 });
        
        const results = await index.get('key1');
        assert.strictEqual(results.length, 2);
        assert.strictEqual(results[0].id, 1);
        assert.strictEqual(results[1].id, 2);
    });

    it('deve retornar array vazio para chave inexistente', async () => {
        const index = new InMemoryIndex();
        const results = await index.get('unknown');
        assert.ok(Array.isArray(results));
        assert.strictEqual(results.length, 0);
    });

    it('deve verificar se uma chave existe via has()', async () => {
        const index = new InMemoryIndex();
        await index.set('exists', { val: true });
        
        assert.strictEqual(await index.has('exists'), true);
        assert.strictEqual(await index.has('not_exists'), false);
    });
});

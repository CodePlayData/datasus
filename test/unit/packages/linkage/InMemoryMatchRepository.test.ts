// @filename: InMemoryMatchRepository.test.ts

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
import { InMemoryMatchRepository } from '../../../../packages/linkage/src/infra/InMemoryMatchRepository.js';

describe('InMemoryMatchRepository', () => {
    it('deve salvar e recuperar matches via all', async () => {
        const repo = new InMemoryMatchRepository();
        const match = { cohort: { id: 1 }, target: { id: 2 }, score: 1.0 };

        await repo.save(match);

        assert.strictEqual(repo.all.length, 1);
        assert.deepStrictEqual(repo.all[0], match);
    });

    it('deve acumular múltiplos saves', async () => {
        const repo = new InMemoryMatchRepository();
        await repo.save({ id: 1 });
        await repo.save({ id: 2 });

        assert.strictEqual(repo.all.length, 2);
        assert.strictEqual(repo.all[0].id, 1);
        assert.strictEqual(repo.all[1].id, 2);
    });

    it('deve retornar array vazio antes de qualquer save', () => {
        const repo = new InMemoryMatchRepository();

        assert.ok(Array.isArray(repo.all));
        assert.strictEqual(repo.all.length, 0);
    });

    it('deve limpar todos os matches com clear()', async () => {
        const repo = new InMemoryMatchRepository();
        await repo.save({ id: 1 });
        await repo.save({ id: 2 });

        repo.clear();

        assert.strictEqual(repo.all.length, 0);
    });
});

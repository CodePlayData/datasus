// @filename: MongoMatchRepository.test.ts

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
import { TmpMongoMatchRepository } from '../../../../app/shared/tmdb/TmpMongoMatchRepository.js';

describe('TmpMongoMatchRepository', () => {
    it('deve salvar um match na coleção do MongoDB', async () => {
        const mockCollection = {
            insertOne: mock.fn(async () => ({}))
        };
        const repo = new TmpMongoMatchRepository(mockCollection as any);
        const match = { cohort: { id: 1 }, target: { id: 2 }, score: 1.0 };
        
        await repo.save(match);
        
        assert.strictEqual(mockCollection.insertOne.mock.callCount(), 1);
        // @ts-ignore
        assert.deepStrictEqual(mockCollection.insertOne.mock.calls[0].arguments[0], match);
    });
});

// @filename: SplitIntoChunks.test.ts

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

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { SplitIntoChunks } from '@codeplaydata/datasus-core/dist/infra/SplitIntoChunks.js';

describe('SplitIntoChunks', () => {
    it('deve dividir um array em chunks do tamanho especificado', () => {
        const arr = ['a', 'b', 'c', 'd', 'e'];
        const splitter = SplitIntoChunks.define(2);
        const result = splitter.exec(arr);

        assert.deepEqual(result, [['a', 'b'], ['c', 'd'], ['e']]);
    });

    it('deve retornar um único chunk se o tamanho for maior que o array', () => {
        const arr = ['a', 'b', 'c'];
        const splitter = SplitIntoChunks.define(5);
        const result = splitter.exec(arr);

        assert.deepEqual(result, [['a', 'b', 'c']]);
    });

    it('deve retornar um array vazio se o array de entrada for vazio', () => {
        const arr: string[] = [];
        const splitter = SplitIntoChunks.define(2);
        const result = splitter.exec(arr);

        assert.deepEqual(result, []);
    });

    it('deve dividir exatamente se o tamanho do array for múltiplo do chunk', () => {
        const arr = ['a', 'b', 'c', 'd'];
        const splitter = SplitIntoChunks.define(2);
        const result = splitter.exec(arr);

        assert.deepEqual(result, [['a', 'b'], ['c', 'd']]);
    });
});

// @filename: CountryYearStrategy.test.ts

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
import { CountryYearStrategy } from '../../../../../packages/core/src/interface/gateway/strategies/CountryYearStrategy.js';

describe('CountryYearStrategy', () => {
    const strategy = new CountryYearStrategy();

    it('deve gerar prefixo padrão usando apenas src', () => {
        const subset = { src: 'SINAN/' };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, ['SINAN/']);
    });

    it('deve gerar prefixos usando src e array de anos', () => {
        const subset = { src: 'SINAN/', year: [2019, 2021] };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, ['SINAN/BR19', 'SINAN/BR21']);
    });
});

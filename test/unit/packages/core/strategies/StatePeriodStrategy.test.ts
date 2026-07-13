// @filename: StatePeriodStrategy.test.ts

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
import { StatePeriodStrategy } from '../../../../../packages/core/src/interface/gateway/strategies/StatePeriodStrategy.js';

describe('StatePeriodStrategy', () => {
    const strategy = new StatePeriodStrategy();

    it('deve gerar prefixos apenas com src', () => {
        const subset = { src: 'SIA/' };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, ['SIA/']);
    });

    it('deve gerar prefixos com src e states', () => {
        const subset = { src: 'SIA/', states: ['SP', 'RJ'] };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, ['SIA/SP', 'SIA/RJ']);
    });

    it('deve gerar prefixos com src, states e period', () => {
        const subset = {
            src: 'SIA/',
            states: ['SP', 'RJ'],
            period: {
                start: { month: '01', year: 2024 },
                end: { month: '02', year: 2024 }
            }
        };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, [
            'SIA/SP2401', 'SIA/RJ2401',
            'SIA/SP2402', 'SIA/RJ2402'
        ]);
    });

    it('deve lançar erro para período inválido (antes de 2008)', () => {
        const subset = {
            src: 'SIA/',
            states: ['SP'],
            period: {
                start: { month: '01', year: 2007 },
                end: { month: '12', year: 2007 }
            }
        };
        assert.throws(() => strategy.buildPrefixes(subset), /Invalid Period./);
    });

    it('deve lançar erro para período com mês inválido', () => {
        const subset = {
            src: 'SIA/',
            states: ['SP'],
            period: {
                start: { month: '13', year: 2024 },
                end: { month: '12', year: 2024 }
            }
        };
        assert.throws(() => strategy.buildPrefixes(subset), /Invalid Period./);
    });
});

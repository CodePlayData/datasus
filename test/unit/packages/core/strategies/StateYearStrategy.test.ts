// @filename: StateYearStrategy.test.ts

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
import { StateYearStrategy } from '../../../../../packages/core/src/interface/gateway/strategies/StateYearStrategy.js';

describe('StateYearStrategy', () => {
    const strategy = new StateYearStrategy();

    it('deve gerar prefixo padrão usando apenas src', () => {
        const subset = { src: 'SIM/' };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, ['SIM/']);
    });

    it('deve gerar prefixos usando src e states', () => {
        const subset = { src: 'SIM/', states: ['RJ', 'SP'] };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, ['SIM/RJ', 'SIM/SP']);
    });

    it('deve gerar prefixos usando src, states e anos de 4 dígitos', () => {
        const subset = { src: 'SIM/', states: ['RJ', 'SP'], year: [2021, 2022] };
        const result = strategy.buildPrefixes(subset);
        assert.deepStrictEqual(result, [
            'SIM/RJ2021', 'SIM/RJ2022',
            'SIM/SP2021', 'SIM/SP2022'
        ]);
    });
});

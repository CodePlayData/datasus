// @filename: SanitizeIcd.test.ts

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
import { SanitizeIcd } from '../../../../app/sim/utils/sanitizeIcd.js';

describe('SanitizeIcd', () => {
    it('deve limpar códigos CID-10 removendo espaços, pontos e normalizando para maiúsculas', () => {
        assert.strictEqual(SanitizeIcd.clean(' u07.1 '), 'U071');
        assert.strictEqual(SanitizeIcd.clean('a15.0'), 'A150');
        assert.strictEqual(SanitizeIcd.clean('J129'), 'J129');
        assert.strictEqual(SanitizeIcd.clean(''), '');
        assert.strictEqual(SanitizeIcd.clean(null), '');
        assert.strictEqual(SanitizeIcd.clean(undefined), '');
    });

    it('deve testar campo único em uma mensagem', () => {
        const matcher = new SanitizeIcd(['U071', 'U072', 'J189']);
        const msgMatch = { CAUSABAS: 'U07.1' };
        const msgNoMatch = { CAUSABAS: 'A150' };

        assert.strictEqual(matcher.test(msgMatch, 'CAUSABAS'), true);
        assert.strictEqual(matcher.test(msgNoMatch, 'CAUSABAS'), false);
    });

    it('deve testar múltiplos campos em uma mensagem e retornar true se algum coincidir', () => {
        const matcher = new SanitizeIcd(['A150', 'A151']);
        const msg = {
            LINHAA: 'J189',
            LINHAB: 'A15.0',
            LINHAC: '',
            LINHAD: undefined
        };

        assert.strictEqual(matcher.test(msg, ['LINHAA', 'LINHAB', 'LINHAC', 'LINHAD']), true);
        assert.strictEqual(matcher.test(msg, ['LINHAA', 'LINHAC']), false);
    });

    it('deve retornar false quando campos estão ausentes ou vazios', () => {
        const matcher = new SanitizeIcd(['A150']);
        const msg = {};
        assert.strictEqual(matcher.test(msg, 'CAUSABAS'), false);
        assert.strictEqual(matcher.test(msg, ['LINHAA', 'LINHAB']), false);
    });
});

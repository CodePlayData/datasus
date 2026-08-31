import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { SINASCBasicParser } from '../../../../app/sinasc/src/SINASCBasicParser.js';

describe('SINASCBasicParser', () => {
    it('deve transformar campos de acordo com o dicionario', () => {
        const dict = new Map<string, (v: any) => any>([
            ['PESO', (v: string) => parseInt(v, 10)],
            ['IDADEMAE', (v: string) => parseInt(v, 10)],
        ]);

        const parser = SINASCBasicParser.instanceOf(dict);
        const record = {
            NUMERODN: '12345678',
            PESO: '3250',
            IDADEMAE: '28',
            SEXO: '1'
        };

        const result = parser.parse(record);
        assert.strictEqual(result.NUMERODN, '12345678');
        assert.strictEqual(result.PESO, 3250);
        assert.strictEqual(result.IDADEMAE, 28);
        assert.strictEqual(result.SEXO, '1');
    });
});

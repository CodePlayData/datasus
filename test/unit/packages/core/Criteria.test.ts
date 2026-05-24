// @filename: Criteria.test.ts

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
import { Criteria } from '../../../../packages/core/src/interface/criteria/Criteria.js';
import { StringCriteria } from '../../../../packages/core/src/interface/criteria/StringCriteria.js';
import { ArrayCriteria } from '../../../../packages/core/src/interface/criteria/ArrayCriteria.js';

describe('Criteria', () => {
    describe('StringCriteria', () => {
        it('deve inicializar corretamente com name baseado no objProp', () => {
            const criteria = new StringCriteria('SP', 'STATE');
            assert.strictEqual(criteria.name, 'STATE_FILTER');
            assert.strictEqual(criteria.str, 'SP');
            assert.strictEqual(criteria.objProp, 'STATE');
        });

        it('deve fazer match correto se a propriedade do registro é igual à string', () => {
            const criteria = new StringCriteria('SP', 'STATE');
            // @ts-ignore
            assert.strictEqual(criteria.match({ STATE: 'SP', CITY: 'São Paulo' }), true);
            // @ts-ignore
            assert.strictEqual(criteria.match({ STATE: 'RJ', CITY: 'Rio de Janeiro' }), false);
            // @ts-ignore
            assert.strictEqual(criteria.match({ CITY: 'Campinas' }), false);
        });
    });

    describe('ArrayCriteria', () => {
        it('deve inicializar corretamente com name baseado no objProp', () => {
            const criteria = new ArrayCriteria(['SP', 'RJ'], 'STATE');
            assert.strictEqual(criteria.name, 'STATE_FILTER');
            assert.deepStrictEqual(criteria.array, ['SP', 'RJ']);
            assert.strictEqual(criteria.objProp, 'STATE');
        });

        it('deve fazer match correto se a propriedade do registro está no array', () => {
            const criteria = new ArrayCriteria(['SP', 'RJ'], 'STATE');
            assert.strictEqual(criteria.match({ STATE: 'SP' }), true);
            assert.strictEqual(criteria.match({ STATE: 'RJ' }), true);
            assert.strictEqual(criteria.match({ STATE: 'MG' }), false);
            // @ts-ignore
            assert.strictEqual(criteria.match({ CITY: 'SP' }), false);
        });
    });

    describe('CriteriaSet e métodos load/set', () => {
        it('Criteria.load deve retornar um CriteriaSet vazio se nenhum DTO for fornecido', () => {
            const criteriaSet = Criteria.load();
            // @ts-ignore - acessando propriedade privada para teste
            assert.strictEqual(criteriaSet.isEmpty(), true);
            // @ts-ignore
            assert.deepStrictEqual(criteriaSet.values(), []);
        });

        it('Criteria.load deve parsear DTO em CriteriaSet', () => {
            const dto = [
                { type: 'string', prop: 'STATE', value: 'SP' },
                { type: 'array', prop: 'DISEASE', value: ['A90', 'B10'] }
            ] as any;
            
            const criteriaSet = Criteria.load(dto);
            // @ts-ignore
            assert.strictEqual(criteriaSet.isEmpty(), false);
            
            // @ts-ignore
            const list = criteriaSet.values();
            assert.strictEqual(list.length, 2);
            assert.strictEqual(list[0].constructor.name, 'StringCriteria');
            assert.strictEqual(list[1].constructor.name, 'ArrayCriteria');

            // Verificando match do CriteriaSet
            // @ts-ignore
            assert.strictEqual(criteriaSet.check({ STATE: 'SP', DISEASE: 'A90' }), true);
            // @ts-ignore
            assert.strictEqual(criteriaSet.check({ STATE: 'SP', DISEASE: 'C20' }), false);
        });

        it('Criteria.set deve agrupar múltiplos string criteria da mesma prop em ArrayCriteria', () => {
            const list = [
                new StringCriteria('SP', 'STATE'),
                new StringCriteria('RJ', 'STATE'),
                new StringCriteria('A90', 'DISEASE')
            ];

            // @ts-ignore
            const criteriaSet = Criteria.set(list);
            // @ts-ignore
            const mergedList = criteriaSet.values();
            
            // Deve ter condensado STATE em um ArrayCriteria, mantendo DISEASE como StringCriteria
            assert.strictEqual(mergedList.length, 2);

            const stateCriteria = mergedList.find(c => c.name === 'STATE_FILTER') as any;
            assert.strictEqual(stateCriteria.constructor.name, 'ArrayCriteria');
            assert.deepStrictEqual(stateCriteria.array, ['SP', 'RJ']);

            const diseaseCriteria = mergedList.find(c => c.name === 'DISEASE_FILTER') as any;
            assert.strictEqual(diseaseCriteria.constructor.name, 'StringCriteria');
            assert.strictEqual(diseaseCriteria.str, 'A90');
        });

        it('CriteriaSet.toDTO deve serializar de volta para array de CriteriaObject', () => {
            const dto = [
                { type: 'array', prop: 'STATE', value: ['SP', 'RJ'] },
                { type: 'string', prop: 'DISEASE', value: 'A90' }
            ] as any;
            
            const criteriaSet = Criteria.load(dto);
            // @ts-ignore
            const serialized = criteriaSet.toDTO();
            
            assert.deepStrictEqual(serialized, dto);
        });
    });
});

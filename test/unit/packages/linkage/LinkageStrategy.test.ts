// @filename: LinkageStrategy.test.ts

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
import { LinkageStrategy } from '../../../../packages/linkage/src/core/LinkageStrategy.js';

class MockService {
    async subset() {}
    async exec(callback: Function) {
        // Simula a passagem de um registro
        await callback({ ID: '1', NOME: 'PEDRO' });
    }
}

describe('LinkageStrategy', () => {
    it('deve permitir registrar coorte e linkage steps', () => {
        const strategy = new LinkageStrategy('Teste', undefined, undefined, false);
        const service = new MockService();
        const cohortConfig = { name: 'Cohort', subset: {} } as any;
        const linkageConfig = { name: 'Link', on: { ID: 'ID' } } as any;

        strategy.cohort(service, cohortConfig).link(service, linkageConfig);

        // Acessando propriedades privadas para validação via @ts-ignore
        // @ts-ignore
        assert.ok(strategy.cohortStep);
        // @ts-ignore
        assert.strictEqual(strategy.linkageSteps.length, 1);
    });

    it('deve lançar erro se tentar executar sem coorte definida', async () => {
        const strategy = new LinkageStrategy('Teste', undefined, undefined, false);
        await assert.rejects(
            () => strategy.exec(),
            /Cohort not defined/
        );
    });

    it('deve lançar erro se tentar executar sem nenhum link definido', async () => {
        const strategy = new LinkageStrategy('Teste', undefined, undefined, false);
        strategy.cohort(new MockService(), { name: 'C' } as any);
        await assert.rejects(
            () => strategy.exec(),
            /No linkage defined/
        );
    });

    it('deve executar o pareamento determinístico com sucesso', async () => {
        const cohortService = {
            exec: async (cb: Function) => {
                await cb({ ID: '100', NOME: 'JOAO' });
                await cb({ ID: '200', NOME: 'MARIA' });
            }
        };

        const targetService = {
            exec: async (cb: Function) => {
                await cb({ ID_T: '100', NOME_T: 'JOAO' }); // Match
                await cb({ ID_T: '300', NOME_T: 'JOSE' }); // No match
            }
        };

        const matchRepository = {
            save: mock.fn(async () => {})
        };

        const strategy = new LinkageStrategy('DetMatch', undefined, matchRepository as any, false);
        
        strategy.cohort(cohortService, { 
            name: 'CohortA' 
        } as any);

        strategy.link(targetService, {
            name: 'LinkA',
            type: 'deterministic',
            on: { ID: 'ID_T' } // Chave do cohort -> Chave do target
        } as any);

        await strategy.exec();

        // Deve ter salvo exatamente 1 match (o ID 100)
        assert.strictEqual(matchRepository.save.mock.callCount(), 1);
        // @ts-ignore
        const matchData = matchRepository.save.mock.calls[0].arguments[0];
        // @ts-ignore
        assert.strictEqual(matchData.cohort.ID, '100');
        // @ts-ignore
        assert.strictEqual(matchData.target.ID_T, '100');
    });

    it('deve executar o pareamento probabilístico (Simple) com pesos', async () => {
        const cohortService = {
            exec: async (cb: Function) => {
                await cb({ ID: '1', NOME: 'PEDRO', IDADE: '30' });
            }
        };

        const targetService = {
            exec: async (cb: Function) => {
                // Match parcial: NOME bate, IDADE não. 
                // Peso NOME=2, IDADE=1. Total=3. Score=2. 2/3 = 0.66
                await cb({ ID_T: '1', NOME_T: 'PEDRO', IDADE_T: '40' }); 
                // Match total: 3/3 = 1.0. Deve ter ID_T: '1' para bater na blocagem
                await cb({ ID_T: '1', NOME_T: 'PEDRO', IDADE_T: '30' });
            }
        };

        const matchRepository = { save: mock.fn(async () => {}) };
        const strategy = new LinkageStrategy('SimpleProb', undefined, matchRepository as any, false);
        
        strategy.cohort(cohortService, { name: 'C' } as any);
        strategy.link(targetService, {
            name: 'L',
            type: 'probabilistic',
            scoreStrategy: 'simple',
            on: { NOME: 'NOME_T', IDADE: 'IDADE_T' },
            blocking: { ID: 'ID_T' },
            weights: { NOME: 2, IDADE: 1 },
            threshold: 0.8 // 0.66 deve falhar, 1.0 deve passar
        } as any);

        await strategy.exec();

        assert.strictEqual(matchRepository.save.mock.callCount(), 1);
        // @ts-ignore
        const matchData = matchRepository.save.mock.calls[0].arguments[0];
        // @ts-ignore
        assert.strictEqual(matchData.target.IDADE_T, '30');
    });

    it('deve executar o pareamento probabilístico (Fellegi-Sunter) com m/u', async () => {
        const cohortService = {
            exec: async (cb: Function) => {
                await cb({ ID: '1', NOME: 'ANA' });
            }
        };

        const targetService = {
            exec: async (cb: Function) => {
                await cb({ ID_T: '1', NOME_T: 'ANA' }); // Concorda
                await cb({ ID_T: '1', NOME_T: 'BIA' }); // Discorda
            }
        };

        const matchRepository = { save: mock.fn(async () => {}) };
        const strategy = new LinkageStrategy('FS', undefined, matchRepository as any, false);
        
        strategy.cohort(cohortService, { name: 'C' } as any);
        strategy.link(targetService, {
            name: 'L',
            type: 'probabilistic',
            scoreStrategy: 'fellegi-sunter',
            on: { NOME: 'NOME_T' },
            blocking: { ID: 'ID_T' },
            weights: { 
                NOME: { m: 0.9, u: 0.1 } // log2(0.9/0.1) = ~3.17 (Agree), log2(0.1/0.9) = ~-3.17 (Disagree)
            },
            threshold: 2.0
        } as any);

        await strategy.exec();

        assert.strictEqual(matchRepository.save.mock.callCount(), 1);
        // @ts-ignore
        assert.strictEqual(matchRepository.save.mock.calls[0].arguments[0].target.NOME_T, 'ANA');
    });

    it('deve executar Fellegi-Sunter com pesos explícitos de agreement/disagreement', async () => {
        const cohortService = { exec: async (cb: Function) => { await cb({ ID: '1', SEXO: 'M' }); } };
        const targetService = { exec: async (cb: Function) => { await cb({ ID_T: '1', SEXO_T: 'F' }); } };

        const matchRepository = { save: mock.fn(async () => {}) };
        const strategy = new LinkageStrategy('FS-Explicit', undefined, matchRepository as any, false);
        
        strategy.cohort(cohortService, { name: 'C' } as any);
        strategy.link(targetService, {
            name: 'L',
            type: 'probabilistic',
            scoreStrategy: 'fellegi-sunter',
            on: { SEXO: 'SEXO_T' },
            blocking: { ID: 'ID_T' },
            weights: { 
                SEXO: { agreement: 10, disagreement: -5 }
            },
            threshold: 0
        } as any);

        await strategy.exec();

        // SEXO M vs F -> Disagreement -> Score -5. Threshold 0 -> No match.
        assert.strictEqual(matchRepository.save.mock.callCount(), 0);
    });

    it('deve garantir que o MatchRepository receba os dados completos do match', async () => {
        const cohortRecord = { ID: '1', NOME: 'PEDRO' };
        const targetRecord = { ID_T: '1', NOME_T: 'PEDRO' };
        const cohortService = { exec: async (cb: Function) => { await cb(cohortRecord); } };
        const targetService = { exec: async (cb: Function) => { await cb(targetRecord); } };

        const matchRepository = { save: mock.fn(async () => {}) };
        const strategy = new LinkageStrategy('Persistence', undefined, matchRepository as any, false);
        
        const linkageConfig = {
            name: 'LinkTest',
            type: 'deterministic',
            on: { ID: 'ID_T' }
        };

        strategy.cohort(cohortService, { name: 'C' } as any);
        strategy.link(targetService, linkageConfig as any);

        await strategy.exec();

        // @ts-ignore
        const savedData = matchRepository.save.mock.calls[0].arguments[0];
        // @ts-ignore
        assert.deepStrictEqual(savedData.cohort, cohortRecord);
        // @ts-ignore
        assert.deepStrictEqual(savedData.target, targetRecord);
        // @ts-ignore
        assert.deepStrictEqual(savedData.config, linkageConfig);
        // @ts-ignore
        assert.ok(savedData.timestamp instanceof Date);
    });
});

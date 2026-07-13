// @filename: linkage_pipeline.test.ts

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

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import {
    LinkageStrategy,
    InMemoryIndex,
    InMemoryMatchRepository
} from '../../../../packages/linkage/dist/index.js';

/**
 * Lightweight in-memory record provider that returns controlled records.
 * Implements the same interface as DbcRecordProvider (exec with callback).
 */
class MockRecordProvider {
    constructor(private records: Record<string, string>[]) {}

    async exec(callback: (record: Record<string, string>) => Promise<void>): Promise<void> {
        for (const record of this.records) {
            await callback(record);
        }
    }
}

describe('Integração: Pipeline de Linkage (LinkageStrategy)', () => {
    let index: InMemoryIndex;
    let repository: InMemoryMatchRepository;

    beforeEach(() => {
        index = new InMemoryIndex();
        repository = new InMemoryMatchRepository();
    });

    it('deve encontrar matches perfeitos com linkage determinístico', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M', NOME: 'Joao' },
            { ID: '2', UF: 'AC', SEXO: 'F', NOME: 'Maria' },
            { ID: '3', UF: 'AM', SEXO: 'M', NOME: 'Pedro' },
        ]);

        const target = new MockRecordProvider([
            { ID: '10', UF: 'AC', SEXO: 'M', NOME: 'Joao' },
            { ID: '20', UF: 'AC', SEXO: 'F', NOME: 'Maria' },
            { ID: '30', UF: 'RR', SEXO: 'M', NOME: 'Lucas' },
        ]);

        const strategy = new LinkageStrategy('DeterministicTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { UF: 'UF', SEXO: 'SEXO' },
            blocking: { UF: 'UF', SEXO: 'SEXO' },
        });

        await strategy.exec();

        const matches = repository.all;
        assert.strictEqual(matches.length, 2, 'Deve encontrar 2 matches (Joao AC/M e Maria AC/F)');

        // Both matches should have matching UF and SEXO
        for (const m of matches) {
            assert.strictEqual(m.cohort.UF, m.target.UF);
            assert.strictEqual(m.cohort.SEXO, m.target.SEXO);
        }
    });

    it('deve aplicar threshold no scoring simples probabilístico', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', CIDADE: 'RioBranco', IDADE: '30' },
            { ID: '2', UF: 'AM', CIDADE: 'Manaus', IDADE: '45' },
        ]);

        const target = new MockRecordProvider([
            // Perfect match on all fields for cohort record 1
            { ID: '10', UF: 'AC', CIDADE: 'RioBranco', IDADE: '30' },
            // Partial match: only 1/3 fields match for cohort record 1 — score = 0.33, below 0.5 threshold
            { ID: '20', UF: 'AC', CIDADE: 'Macapa', IDADE: '50' },
            // Partial match: only 1/3 fields match for cohort record 2 — score = 0.33, below 0.5 threshold
            { ID: '30', UF: 'AM', CIDADE: 'Belém', IDADE: '25' },
        ]);

        const strategy = new LinkageStrategy('ThresholdTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'simple',
            on: { UF: 'UF', CIDADE: 'CIDADE', IDADE: 'IDADE' },
            blocking: { UF: 'UF' },
            threshold: 0.5,
        });

        await strategy.exec();

        const matches = repository.all;
        assert.strictEqual(matches.length, 1, 'Apenas o match perfeito deve ultrapassar threshold 0.5');
        assert.strictEqual(matches[0].cohort.ID, '1');
        assert.strictEqual(matches[0].target.ID, '10');
    });

    it('deve aplicar pesos no scoring simples e filtrar por threshold', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', CIDADE: 'RioBranco', IDADE: '30' },
        ]);

        const target = new MockRecordProvider([
            // UF matches (weight 3), CIDADE matches (weight 2), IDADE doesn't (weight 1)
            // score = (3+2)/6 = 0.833
            { ID: '10', UF: 'AC', CIDADE: 'RioBranco', IDADE: '99' },
            // Only UF matches (weight 3)
            // score = 3/6 = 0.5
            { ID: '20', UF: 'AC', CIDADE: 'Macapa', IDADE: '50' },
        ]);

        const strategy = new LinkageStrategy('WeightedTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'simple',
            on: { UF: 'UF', CIDADE: 'CIDADE', IDADE: 'IDADE' },
            blocking: { UF: 'UF' },
            weights: { UF: 3, CIDADE: 2, IDADE: 1 },
            threshold: 0.6,
        });

        await strategy.exec();

        const matches = repository.all;
        assert.strictEqual(matches.length, 1, 'Apenas o match com score 0.833 deve passar threshold 0.6');
        assert.strictEqual(matches[0].target.ID, '10');
    });

    it('deve executar linkage com Fellegi-Sunter e logs m/u', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M' },
            { ID: '2', UF: 'AM', SEXO: 'F' },
        ]);

        const target = new MockRecordProvider([
            // Both fields match → score = log2(0.9/0.1) + log2(0.8/0.2) = 3.17 + 2 = 5.17
            { ID: '10', UF: 'AC', SEXO: 'M' },
            // UF matches, SEXO doesn't → score = log2(0.9/0.1) + log2(0.1/0.9) = 3.17 - 3.17 = 0
            { ID: '20', UF: 'AC', SEXO: 'F' },
            // UF matches, SEXO doesn't → score = 0, below threshold 1
            { ID: '30', UF: 'AM', SEXO: 'M' },
        ]);

        const strategy = new LinkageStrategy('FellegiSunterTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'fellegi-sunter',
            on: { UF: 'UF', SEXO: 'SEXO' },
            blocking: { UF: 'UF' },
            weights: {
                UF: { m: 0.9, u: 0.1 },
                SEXO: { m: 0.8, u: 0.2 },
            },
            threshold: 1,
        });

        await strategy.exec();

        const matches = repository.all;
        assert.ok(matches.length >= 1, 'Deve encontrar pelo menos 1 match com FS');
        assert.strictEqual(matches[0].cohort.ID, '1');
        assert.strictEqual(matches[0].target.ID, '10');
    });

    it('deve executar linkage multi-step com dois targets', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M' },
        ]);

        const target1 = new MockRecordProvider([
            { ID: 'T1_1', UF: 'AC', SEXO: 'M' },
        ]);

        const target2 = new MockRecordProvider([
            { ID: 'T2_1', UF: 'AC', SEXO: 'M' },
        ]);

        const strategy = new LinkageStrategy('MultiStepTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target1, {
            name: 'TARGET1',
            type: 'deterministic',
            on: { UF: 'UF', SEXO: 'SEXO' },
            blocking: { UF: 'UF', SEXO: 'SEXO' },
        });
        strategy.link(target2, {
            name: 'TARGET2',
            type: 'deterministic',
            on: { UF: 'UF', SEXO: 'SEXO' },
            blocking: { UF: 'UF', SEXO: 'SEXO' },
        });

        await strategy.exec();

        const matches = repository.all;
        assert.strictEqual(matches.length, 2, 'Deve encontrar 2 matches (um de cada target)');

        const configs = matches.map(m => m.config.name);
        assert.ok(configs.includes('TARGET1'), 'Deve ter match do TARGET1');
        assert.ok(configs.includes('TARGET2'), 'Deve ter match do TARGET2');
    });

    it('deve lançar erro quando cohort não é definido', async () => {
        const strategy = new LinkageStrategy('NoCohort', index, repository, false);

        await assert.rejects(
            strategy.exec(),
            /Cohort not defined/i,
            'Deve lançar erro ao chamar exec() sem cohort'
        );
    });

    it('deve lançar erro quando não há linkage definido', async () => {
        const strategy = new LinkageStrategy('NoLinkage', index, repository, false);
        strategy.cohort(new MockRecordProvider([]), { name: 'COHORT' });

        await assert.rejects(
            strategy.exec(),
            /No linkage defined/i,
            'Deve lançar erro ao chamar exec() sem linkage'
        );
    });

    it('deve não encontrar matches quando blocking keys não coincidem', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M' },
        ]);

        const target = new MockRecordProvider([
            { ID: '10', UF: 'AM', SEXO: 'M' },
        ]);

        const strategy = new LinkageStrategy('NoMatchTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { UF: 'UF' },
            blocking: { UF: 'UF' },
        });

        await strategy.exec();

        assert.strictEqual(repository.all.length, 0, 'Não deve encontrar matches quando blocking keys diferem');
    });

    it('deve mapear campos diferentes entre cohort e target (cross-field)', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', COD_PESSOA: '123', GENERO: 'M' },
        ]);

        const target = new MockRecordProvider([
            { ID_EXT: '10', COD_CIDADAO: '123', SEXO: 'M' },
            { ID_EXT: '20', COD_CIDADAO: '456', SEXO: 'F' },
        ]);

        const strategy = new LinkageStrategy('CrossFieldTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { COD_PESSOA: 'COD_CIDADAO', GENERO: 'SEXO' },
            blocking: { COD_PESSOA: 'COD_CIDADAO' },
        });

        await strategy.exec();

        const matches = repository.all;
        assert.strictEqual(matches.length, 1, 'Deve encontrar 1 match com cross-field mapping');
        assert.strictEqual(matches[0].cohort.COD_PESSOA, '123');
        assert.strictEqual(matches[0].target.COD_CIDADAO, '123');
        assert.strictEqual(matches[0].cohort.GENERO, 'M');
        assert.strictEqual(matches[0].target.SEXO, 'M');
    });

    it('deve executar Fellegi-Sunter com pesos agreement/disagreement explícitos', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', CIDADE: 'RioBranco' },
        ]);

        const target = new MockRecordProvider([
            // UF agree (+10), CIDADE agree (+5) → score = 15, passes threshold 5
            { ID: '10', UF: 'AC', CIDADE: 'RioBranco' },
            // UF agree (+10), CIDADE disagree (-3) → score = 7, passes threshold 5
            { ID: '20', UF: 'AC', CIDADE: 'Macapa' },
            // UF disagree (-8), CIDADE disagree (-3) → score = -11, below threshold 5
            { ID: '30', UF: 'AM', CIDADE: 'Belém' },
        ]);

        const strategy = new LinkageStrategy('FSExplicitTest', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'fellegi-sunter',
            on: { UF: 'UF', CIDADE: 'CIDADE' },
            blocking: { UF: 'UF' },
            weights: {
                UF: { agreement: 10, disagreement: -8 },
                CIDADE: { agreement: 5, disagreement: -3 },
            },
            threshold: 5,
        });

        await strategy.exec();

        const matches = repository.all;
        assert.strictEqual(matches.length, 2, 'Deve encontrar 2 matches (score 15 e 7 passam threshold 5)');
        const ids = matches.map(m => m.target.ID);
        assert.ok(ids.includes('10'), 'Deve incluir match com score 15');
        assert.ok(ids.includes('20'), 'Deve incluir match com score 7');
    });

    it('deve salvar match com dados completos (cohort, target, config, timestamp)', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M' },
        ]);

        const target = new MockRecordProvider([
            { ID: '10', UF: 'AC', SEXO: 'M' },
        ]);

        const strategy = new LinkageStrategy('FullMatchTest', index, repository, false);

        const linkageConfig = {
            name: 'TARGET',
            type: 'deterministic' as const,
            on: { UF: 'UF', SEXO: 'SEXO' },
            blocking: { UF: 'UF', SEXO: 'SEXO' } as Record<string, string>,
        };

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, linkageConfig);

        await strategy.exec();

        const matches = repository.all;
        assert.strictEqual(matches.length, 1);

        const match = matches[0];
        assert.deepStrictEqual(match.cohort, { ID: '1', UF: 'AC', SEXO: 'M' });
        assert.deepStrictEqual(match.target, { ID: '10', UF: 'AC', SEXO: 'M' });
        assert.strictEqual(match.config.name, 'TARGET');
        assert.strictEqual(match.config.type, 'deterministic');
        assert.ok(match.timestamp instanceof Date, 'Timestamp deve ser uma instância de Date');
  });
});

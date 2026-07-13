import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    LinkageStrategy,
    InMemoryIndex,
    InMemoryMatchRepository,
    DbcRecordProvider
} from '../../../../packages/linkage/dist/index.js';

// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));
const SMALL_FIXTURE_PATH = join(__dirname, 'fixtures', 'PA_small.dbc');

describe('Integração: DbcRecordProvider com arquivo real', () => {
    it('deve ler registros do DBC e executar linkage determinístico contra ele mesmo', async () => {
        const index = new InMemoryIndex();
        const repository = new InMemoryMatchRepository();

        const cohortProvider = new DbcRecordProvider(SMALL_FIXTURE_PATH, false);
        const targetProvider = new DbcRecordProvider(SMALL_FIXTURE_PATH, false);

        const strategy = new LinkageStrategy('DbcDeterministic', index, repository, false);

        strategy.cohort(cohortProvider, { name: 'COHORT' });
        strategy.link(targetProvider, {
            name: 'TARGET',
            type: 'deterministic',
            on: { PA_CODUNI: 'PA_CODUNI', PA_SEXO: 'PA_SEXO' },
        });

        await strategy.exec();

        const matches = repository.all;
        assert.ok(matches.length > 0, 'Deve encontrar matches ao cruzar DBC contra ele mesmo');

        for (const m of matches) {
            assert.strictEqual(m.cohort.PA_CODUNI, m.target.PA_CODUNI, 'PA_CODUNI deve ser igual no match');
            assert.strictEqual(m.cohort.PA_SEXO, m.target.PA_SEXO, 'PA_SEXO deve ser igual no match');
        }

        const uniqueCodes = new Set(matches.map(m => m.cohort.PA_CODUNI));
        assert.ok(uniqueCodes.size > 0, 'Deve ter múltiplos códigos de unidade únicos nos matches');
    });

    it('deve aplicar threshold probabilístico em dados reais do DBC', async () => {
        const index = new InMemoryIndex();
        const repository = new InMemoryMatchRepository();

        const cohortProvider = new DbcRecordProvider(SMALL_FIXTURE_PATH, false);
        const targetProvider = new DbcRecordProvider(SMALL_FIXTURE_PATH, false);

        const strategy = new LinkageStrategy('DbcProbabilistic', index, repository, false);

        strategy.cohort(cohortProvider, { name: 'COHORT' });
        strategy.link(targetProvider, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'simple',
            on: { PA_SEXO: 'PA_SEXO', PA_UFMUN: 'PA_UFMUN' },
            blocking: { PA_SEXO: 'PA_SEXO' },
            threshold: 0.5,
        });

        await strategy.exec();

        const matches = repository.all;
        assert.ok(matches.length > 0, 'Deve encontrar matches probabilísticos no DBC real');

        for (const m of matches) {
            assert.strictEqual(m.cohort.PA_SEXO, m.target.PA_SEXO, 'PA_SEXO deve ser igual (blocagem)');
        }
    });

    it('deve usar Fellegi-Sunter com dados reais do DBC', async () => {
        const index = new InMemoryIndex();
        const repository = new InMemoryMatchRepository();

        const cohortProvider = new DbcRecordProvider(SMALL_FIXTURE_PATH, false);
        const targetProvider = new DbcRecordProvider(SMALL_FIXTURE_PATH, false);

        const strategy = new LinkageStrategy('DbcFellegiSunter', index, repository, false);

        strategy.cohort(cohortProvider, { name: 'COHORT' });
        strategy.link(targetProvider, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'fellegi-sunter',
            on: { PA_SEXO: 'PA_SEXO', PA_UFMUN: 'PA_UFMUN' },
            blocking: { PA_SEXO: 'PA_SEXO' },
            weights: {
                PA_SEXO: { m: 0.9, u: 0.1 },
                PA_UFMUN: { m: 0.7, u: 0.2 },
            },
            threshold: 2,
        });

        await strategy.exec();

        const matches = repository.all;
        assert.ok(matches.length > 0, 'Deve encontrar matches com FS no DBC real');

        for (const m of matches) {
            assert.strictEqual(m.cohort.PA_SEXO, m.target.PA_SEXO, 'PA_SEXO deve ser igual (blocagem)');
        }
    });
});

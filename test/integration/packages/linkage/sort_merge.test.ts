import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import {
    LinkageStrategy,
    InMemoryIndex,
    InMemoryMatchRepository,
    SortMergeIndex,
} from '../../../../packages/linkage/dist/index.js';

/**
 * Lightweight in-memory record provider that returns controlled records.
 */
class MockRecordProvider {
    constructor(private records: Record<string, string | number>[]) { }

    async exec(callback: (record: Record<string, string | number>) => Promise<void>): Promise<void> {
        for (const record of this.records) {
            await callback(record);
        }
    }
}

describe('Integração: SortMergeIndex + chunked scoring', () => {
    let repository: InMemoryMatchRepository;

    beforeEach(() => {
        repository = new InMemoryMatchRepository();
    });

    it('deve encontrar os mesmos matches que InMemoryIndex com sort-merge', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M' },
            { ID: '2', UF: 'AC', SEXO: 'F' },
            { ID: '3', UF: 'AM', SEXO: 'M' },
        ]);

        const target = new MockRecordProvider([
            { ID: '10', UF: 'AC', SEXO: 'M' },
            { ID: '20', UF: 'AC', SEXO: 'F' },
            { ID: '30', UF: 'RR', SEXO: 'M' },
        ]);

        // Sort-merge
        const sortIndex = new SortMergeIndex();
        const sortRepo = new InMemoryMatchRepository();
        const sortStrategy = new LinkageStrategy('SortMerge', sortIndex, sortRepo, false);
        sortStrategy.cohort(cohort, { name: 'COHORT' });
        sortStrategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { UF: 'UF', SEXO: 'SEXO' },
            blocking: { UF: 'UF', SEXO: 'SEXO' },
        });
        await sortStrategy.exec();

        // In-memory (baseline)
        const memIndex = new InMemoryIndex();
        const memRepo = new InMemoryMatchRepository();
        const memStrategy = new LinkageStrategy('InMemory', memIndex, memRepo, false);
        memStrategy.cohort(cohort, { name: 'COHORT' });
        memStrategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { UF: 'UF', SEXO: 'SEXO' },
            blocking: { UF: 'UF', SEXO: 'SEXO' },
        });
        await memStrategy.exec();

        assert.strictEqual(
            sortRepo.all.length,
            memRepo.all.length,
            'Sort-merge deve encontrar a mesma quantidade de matches que in-memory'
        );

        const sortPairs = sortRepo.all.map(m => `${m.cohort.ID}-${m.target.ID}`).sort();
        const memPairs = memRepo.all.map(m => `${m.cohort.ID}-${m.target.ID}`).sort();
        assert.deepStrictEqual(sortPairs, memPairs, 'Matches devem ser idênticos');
    });

    it('deve processar bucket grande em chunks sem estourar memória', async () => {
        // 2000 cohort records no MESMO bucket (blocking key: SEXO='M')
        const cohortRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 2000; i++) {
            cohortRecords.push({ ID: `C${i}`, SEXO: 'M', UF: 'AC', COD: String(i) });
        }

        // 500 target records no mesmo bucket
        const targetRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 500; i++) {
            targetRecords.push({ ID: `T${i}`, SEXO: 'M', UF: 'AC', COD: String(i) });
        }

        const cohort = new MockRecordProvider(cohortRecords);
        const target = new MockRecordProvider(targetRecords);

        const index = new SortMergeIndex({ chunkSize: 100 });
        const strategy = new LinkageStrategy('LargeBucket', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { COD: 'COD' },
            blocking: { SEXO: 'SEXO' },
        });

        await strategy.exec();

        // 500 targets × match quando COD é igual → 500 matches
        assert.strictEqual(
            repository.all.length,
            500,
            'Deve encontrar 500 matches (COD igual entre cohort e target)'
        );

        for (const m of repository.all) {
            assert.strictEqual(
                m.cohort.COD,
                m.target.COD,
                'COD deve ser igual no match'
            );
        }
    });

    it('deve aplicar threshold probabilístico com chunked scoring', async () => {
        const cohortRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 1000; i++) {
            cohortRecords.push({
                ID: `C${i}`,
                SEXO: i % 2 === 0 ? 'M' : 'F',
                UF: i % 5 === 0 ? 'AC' : 'AM',
                CIDADE: i % 10 === 0 ? 'RioBranco' : 'Manaus',
            });
        }

        const targetRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 500; i++) {
            targetRecords.push({
                ID: `T${i}`,
                SEXO: i % 2 === 0 ? 'M' : 'F',
                UF: i % 5 === 0 ? 'AC' : 'AM',
                CIDADE: i % 10 === 0 ? 'RioBranco' : 'Manaus',
            });
        }

        const cohort = new MockRecordProvider(cohortRecords);
        const target = new MockRecordProvider(targetRecords);

        const index = new SortMergeIndex({ chunkSize: 50 });
        const strategy = new LinkageStrategy('ChunkedProb', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'simple',
            on: { UF: 'UF', CIDADE: 'CIDADE' },
            blocking: { SEXO: 'SEXO' },
            threshold: 0.8,
        });

        await strategy.exec();

        assert.ok(
            repository.all.length > 0,
            'Deve encontrar matches probabilísticos com chunked scoring'
        );

        for (const m of repository.all) {
            assert.strictEqual(
                m.cohort.SEXO,
                m.target.SEXO,
                'SEXO deve ser igual (blocking)'
            );
        }
    });

    it('deve usar Fellegi-Sunter com bucket grande chunkado', async () => {
        const cohortRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 2000; i++) {
            cohortRecords.push({
                ID: `C${i}`,
                SEXO: 'M',
                UF: i % 3 === 0 ? 'AC' : i % 3 === 1 ? 'AM' : 'RR',
            });
        }

        const targetRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 500; i++) {
            targetRecords.push({
                ID: `T${i}`,
                SEXO: 'M',
                UF: i % 3 === 0 ? 'AC' : i % 3 === 1 ? 'AM' : 'RR',
            });
        }

        const cohort = new MockRecordProvider(cohortRecords);
        const target = new MockRecordProvider(targetRecords);

        const index = new SortMergeIndex({ chunkSize: 100 });
        const strategy = new LinkageStrategy('ChunkedFS', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'probabilistic',
            scoreStrategy: 'fellegi-sunter',
            on: { UF: 'UF' },
            blocking: { SEXO: 'SEXO' },
            weights: {
                UF: { m: 0.8, u: 0.1 },
            },
            threshold: 0,
        });

        await strategy.exec();

        assert.ok(
            repository.all.length > 0,
            'Deve encontrar matches com Fellegi-Sunter chunkado'
        );
    });

    it('deve não encontrar matches quando blocking keys não se sobrepõem', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', COD: '100' },
            { ID: '2', UF: 'AM', COD: '200' },
        ]);

        const target = new MockRecordProvider([
            { ID: '10', UF: 'RR', COD: '100' },
            { ID: '20', UF: 'PA', COD: '200' },
        ]);

        const index = new SortMergeIndex();
        const strategy = new LinkageStrategy('NoOverlap', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { COD: 'COD' },
            blocking: { UF: 'UF' },
        });

        await strategy.exec();

        assert.strictEqual(
            repository.all.length,
            0,
            'Não deve encontrar matches quando blocking keys não se sobrepõem'
        );
    });

    it('deve lidar com cohort vazio', async () => {
        const cohort = new MockRecordProvider([]);
        const target = new MockRecordProvider([
            { ID: '10', UF: 'AC', SEXO: 'M' },
        ]);

        const index = new SortMergeIndex();
        const strategy = new LinkageStrategy('EmptyCohort', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { UF: 'UF' },
            blocking: { UF: 'UF' },
        });

        await strategy.exec();

        assert.strictEqual(repository.all.length, 0, 'Não deve encontrar matches com cohort vazio');
    });

    it('deve lidar com target vazio', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M' },
        ]);
        const target = new MockRecordProvider([]);

        const index = new SortMergeIndex();
        const strategy = new LinkageStrategy('EmptyTarget', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { UF: 'UF' },
            blocking: { UF: 'UF' },
        });

        await strategy.exec();

        assert.strictEqual(repository.all.length, 0, 'Não deve encontrar matches com target vazio');
    });

    it('deve processar múltiplos buckets diferentes em ordem correta', async () => {
        const cohort = new MockRecordProvider([
            { ID: '1', UF: 'AC', SEXO: 'M', COD: 'A' },
            { ID: '2', UF: 'AM', SEXO: 'F', COD: 'B' },
            { ID: '3', UF: 'RR', SEXO: 'M', COD: 'C' },
        ]);

        const target = new MockRecordProvider([
            { ID: '10', UF: 'RR', SEXO: 'M', COD: 'C' },
            { ID: '20', UF: 'AC', SEXO: 'M', COD: 'A' },
            { ID: '30', UF: 'AM', SEXO: 'F', COD: 'B' },
        ]);

        const index = new SortMergeIndex();
        const strategy = new LinkageStrategy('MultiBucket', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { COD: 'COD' },
            blocking: { UF: 'UF', SEXO: 'SEXO' },
        });

        await strategy.exec();

        assert.strictEqual(repository.all.length, 3, 'Deve encontrar 3 matches em 3 buckets diferentes');

        const pairs = repository.all.map(m => `${m.cohort.ID}-${m.target.ID}`).sort();
        assert.deepStrictEqual(pairs, ['1-20', '2-30', '3-10']);
    });

    it('deve respeitar chunkSize configurado no SortMergeIndex', async () => {
        const cohortRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 500; i++) {
            cohortRecords.push({ ID: `C${i}`, SEXO: 'M', COD: String(i) });
        }

        const targetRecords: Record<string, string | number>[] = [];
        for (let i = 0; i < 100; i++) {
            targetRecords.push({ ID: `T${i}`, SEXO: 'M', COD: String(i) });
        }

        const cohort = new MockRecordProvider(cohortRecords);
        const target = new MockRecordProvider(targetRecords);

        let chunksProcessed = 0;
        const index = new SortMergeIndex({
            chunkSize: 25,
            onChunk: () => { chunksProcessed++; },
        });
        const strategy = new LinkageStrategy('ChunkCount', index, repository, false);

        strategy.cohort(cohort, { name: 'COHORT' });
        strategy.link(target, {
            name: 'TARGET',
            type: 'deterministic',
            on: { COD: 'COD' },
            blocking: { SEXO: 'SEXO' },
        });

        await strategy.exec();

        // 500 cohort / 25 chunkSize = 20 chunks
        assert.strictEqual(chunksProcessed, 20, 'Deve processar 20 chunks (500/25)');
        assert.strictEqual(repository.all.length, 100, 'Deve encontrar 100 matches');
    });
});

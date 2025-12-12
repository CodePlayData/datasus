
import { LinkageStrategy } from './lib/interface/linkage/LinkageStrategy.js';
import { InMemoryIndex } from './lib/infra/storage/InMemoryIndex.js';
import { Records } from './lib/core/Records.js';

// Mock Service
class MockService {
    constructor(private data: Records[]) { }

    async subset(subset: any) {
        console.log(`[MockService] Subset called with:`, subset);
    }

    async exec(callback?: Function, jobScript?: string) {
        console.log(`[MockService] Exec called.`);
        for (const record of this.data) {
            if (callback) {
                await callback(record);
            }
        }
    }
}

// Mock Data
const cohortData = [
    { ID: '1', NAME: 'John Doe', DOB: '1990-01-01', CITY: 'NY' },
    { ID: '2', NAME: 'Jane Doe', DOB: '1992-02-02', CITY: 'LA' }
];

const targetData = [
    { ID: 'A', NAME: 'John Doe', DOB: '1990-01-01', CITY: 'NY', CAUSE: 'X' }, // Match
    { ID: 'B', NAME: 'Bob Smith', DOB: '1980-05-05', CITY: 'CHI', CAUSE: 'Y' }, // No Match
    { ID: 'C', NAME: 'Jane Doe', DOB: '1992-02-02', CITY: 'LA', CAUSE: 'Z' }  // Match
];

async function runTest() {
    console.log("Starting LinkageStrategy Test...");

    const cohortService = new MockService(cohortData);
    const targetService = new MockService(targetData);

    const strategy = new LinkageStrategy('Test Study', new InMemoryIndex());

    strategy.cohort(cohortService as any, {
        name: 'Cohort A',
        subset: { src: 'TEST' }
    });

    strategy.link(targetService as any, {
        name: 'Target B (Deterministic)',
        type: 'deterministic',
        on: { 'NAME': 'NAME', 'DOB': 'DOB' },
        blocking: { 'NAME': 'NAME' } // Block on NAME to match other strategies
    });

    // Probabilistic Test Case
    // We'll use a different target service or just reuse targetService but with different logic expectations.
    // Let's add a record that matches partially.
    const probTargetData = [
        { ID: 'P1', NAME: 'John Doe', DOB: '1990-01-01', CITY: 'NY' }, // Exact match (100%)
        { ID: 'P2', NAME: 'John Doe', DOB: '1990-01-02', CITY: 'NY' }, // Partial match (NAME match, DOB mismatch). 
        // If weights are NAME=0.6, DOB=0.4. Score = 0.6. Threshold 0.5 -> Match.
    ];
    const probService = new MockService(probTargetData);

    strategy.link(probService as any, {
        name: 'Target C (Probabilistic - Simple)',
        type: 'probabilistic',
        scoreStrategy: 'simple',
        on: { 'NAME': 'NAME', 'DOB': 'DOB' },
        blocking: { 'NAME': 'NAME' },
        weights: { 'NAME': 0.6, 'DOB': 0.4 },
        threshold: 0.5
    });

    // Fellegi-Sunter Test Case
    const fsTargetData = [
        { ID: 'F1', NAME: 'John Doe', DOB: '1990-01-01', CITY: 'NY' }, // Exact Match
        { ID: 'F2', NAME: 'John Doe', DOB: '1990-01-02', CITY: 'NY' }, // Mismatch DOB
    ];
    const fsService = new MockService(fsTargetData);

    strategy.link(fsService as any, {
        name: 'Target D (Fellegi-Sunter)',
        type: 'probabilistic',
        scoreStrategy: 'fellegi-sunter',
        on: { 'NAME': 'NAME', 'DOB': 'DOB' },
        blocking: { 'NAME': 'NAME' },
        weights: {
            'NAME': { m: 0.99, u: 0.01 }, // High agreement weight
            'DOB': { m: 0.9, u: 0.1 }     // Moderate agreement
        },
        // NAME Match: log2(0.99/0.01) = log2(99) ≈ 6.6
        // DOB Match: log2(0.9/0.1) = log2(9) ≈ 3.17
        // DOB Mismatch: log2(0.1/0.9) = log2(1/9) ≈ -3.17

        // F1 (Exact): 6.6 + 3.17 = 9.77
        // F2 (Mismatch DOB): 6.6 - 3.17 = 3.43

        threshold: 5.0 // Should match F1 but NOT F2
    });

    await strategy.exec();

    console.log("Test Completed.");
}

runTest().catch(console.error);

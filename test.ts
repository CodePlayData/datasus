
import { Criteria } from './src/interface/criteria/Criteria.js';
import { StringCriteria } from './src/interface/criteria/StringCriteria.js';

// Mock record type
type MockRecord = {
    CBOPROF: string;
    OTHER: string;
    [key: string]: any;
};

console.log("Starting Criteria OR logic test...");

// Scenario: Two criteria for the same property 'CBOPROF'
const criteriaList = [
    new StringCriteria<MockRecord>('223293', 'CBOPROF'),
    new StringCriteria<MockRecord>('225125', 'CBOPROF'),
    new StringCriteria<MockRecord>('SOME_VALUE', 'OTHER')
];

console.log("Input criteria list:", criteriaList.map(c => ({ name: c.name, str: c.str, array: c.array })));

const criteriaSet = Criteria.set(criteriaList);
const resultingCriteria = criteriaSet.values();

console.log("Resulting criteria set:", resultingCriteria.map(c => ({ name: c.name, str: c.str, array: c.array })));

// Verification
const cboCriteria = resultingCriteria.find(c => c.name === 'CBOPROF_FILTER');
const otherCriteria = resultingCriteria.find(c => c.name === 'OTHER_FILTER');

let passed = true;

if (!cboCriteria) {
    console.error("FAIL: CBOPROF_FILTER not found in resulting set.");
    passed = false;
} else if (!cboCriteria.array) {
    console.error("FAIL: CBOPROF_FILTER should be an ArrayCriteria (have array property).");
    passed = false;
} else {
    const expectedValues = ['223293', '225125'];
    const actualValues = cboCriteria.array.sort();
    if (JSON.stringify(actualValues) !== JSON.stringify(expectedValues.sort())) {
        console.error(`FAIL: CBOPROF_FILTER values mismatch. Expected ${JSON.stringify(expectedValues)}, got ${JSON.stringify(actualValues)}`);
        passed = false;
    } else {
        console.log("PASS: CBOPROF_FILTER correctly merged into ArrayCriteria.");
    }
}

if (!otherCriteria) {
    console.error("FAIL: OTHER_FILTER not found in resulting set.");
    passed = false;
} else if (!otherCriteria.str) {
    console.error("FAIL: OTHER_FILTER should remain a StringCriteria (have str property).");
    passed = false;
} else {
    console.log("PASS: OTHER_FILTER correctly preserved.");
}

// Test matching
const recordMatch1: MockRecord = { CBOPROF: '223293', OTHER: 'SOME_VALUE' };
const recordMatch2: MockRecord = { CBOPROF: '225125', OTHER: 'SOME_VALUE' };
const recordFail1: MockRecord = { CBOPROF: '999999', OTHER: 'SOME_VALUE' };
const recordFail2: MockRecord = { CBOPROF: '223293', OTHER: 'WRONG_VALUE' };

if (criteriaSet.check(recordMatch1)) {
    console.log("PASS: Record 1 matched (first OR condition + AND).");
} else {
    console.error("FAIL: Record 1 failed to match.");
    passed = false;
}

if (criteriaSet.check(recordMatch2)) {
    console.log("PASS: Record 2 matched (second OR condition + AND).");
} else {
    console.error("FAIL: Record 2 failed to match.");
    passed = false;
}

if (!criteriaSet.check(recordFail1)) {
    console.log("PASS: Record 3 correctly failed (wrong CBO).");
} else {
    console.error("FAIL: Record 3 matched but should have failed.");
    passed = false;
}

if (!criteriaSet.check(recordFail2)) {
    console.log("PASS: Record 4 correctly failed (wrong OTHER).");
} else {
    console.error("FAIL: Record 4 matched but should have failed.");
    passed = false;
}

if (passed) {
    console.log("\nAll tests PASSED!");
    process.exit(0);
} else {
    console.error("\nSome tests FAILED.");
    process.exit(1);
}

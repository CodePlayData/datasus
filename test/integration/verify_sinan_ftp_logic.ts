
import { SINANFTPGateway } from '../../app/sinan/src/SINANFTPGateway.js';
import { FTPClient } from '@codeplaydata/datasus-core'; // Using the package export if possible, or relative import

// Mock FTP Client
class MockFTPClient implements FTPClient {
    public listCalls: string[] = [];

    async list(path: string) {
        console.log(`[MockFTPClient] Listing path: ${path}`);
        this.listCalls.push(path);
        // Return dummy data just to not crash
        return [{ name: 'TESTFILE.dbc' }];
    }

    async download(...args: any[]) { return Promise.resolve(); }
    close() { }
}

async function verify() {
    console.log("Starting SINAN FTP Logic Verification...");

    const mockFtp = new MockFTPClient();
    const gateway = await SINANFTPGateway.getInstanceOf(mockFtp);

    const currentYear = new Date().getFullYear();
    const recentYear = currentYear - 1;
    const oldYear = currentYear - 10;

    console.log(`Testing with Current Year: ${currentYear}, Recent Year: ${recentYear}, Old Year: ${oldYear}`);

    // Test Case 1: Recent Year Only
    console.log("\nTest Case 1: Recent Year Only");
    mockFtp.listCalls = []; // Reset
    await gateway.list({ src: { code: 'TUBE' } as any, year: [recentYear] });

    // We expect PRELIM path
    const prelimExpected = '/dissemin/publicos/SINAN/DADOS/PRELIM/';
    if (mockFtp.listCalls.includes(prelimExpected)) {
        console.log("SUCCESS: Recent year queried PRELIM path.");
    } else {
        console.error(`FAILURE: Recent year DID NOT query PRELIM path. Calls: ${JSON.stringify(mockFtp.listCalls)}`);
    }

    // Test Case 2: Old Year Only
    console.log("\nTest Case 2: Old Year Only");
    mockFtp.listCalls = []; // Reset
    await gateway.list({ src: { code: 'TUBE' } as any, year: [oldYear] });

    // We expect FINAIS path
    const finaisExpected = '/dissemin/publicos/SINAN/DADOS/FINAIS/';
    if (mockFtp.listCalls.includes(finaisExpected)) {
        console.log("SUCCESS: Old year queried FINAIS path.");
    } else {
        console.error(`FAILURE: Old year DID NOT query FINAIS path. Calls: ${JSON.stringify(mockFtp.listCalls)}`);
    }

    // Test Case 3: Mixed Years
    console.log("\nTest Case 3: Mixed Years");
    mockFtp.listCalls = []; // Reset
    await gateway.list({ src: { code: 'TUBE' } as any, year: [recentYear, oldYear] });

    if (mockFtp.listCalls.includes(prelimExpected) && mockFtp.listCalls.includes(finaisExpected)) {
        console.log("SUCCESS: Mixed years queried BOTH paths.");
    } else {
        console.error(`FAILURE: Mixed years missing paths. Calls: ${JSON.stringify(mockFtp.listCalls)}`);
    }
}

verify().catch(console.error);

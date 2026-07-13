// @filename: service.ts

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


import { Criteria, BasicFTPClient, ArrayCriteria } from "@codeplaydata/datasus-core";
import { SIMFTPGateway } from "./src/SIMFTPGateway.js";
import { SIMSubset } from "./src/SIMSubset.js";
import { SIMBasicParser } from "./src/SIMBasicParser.js";
import { SIMService } from "./src/SIMService.js";


const MAX_CONCURRENT_PROCESSES = 4;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
if (!(ftpClient instanceof BasicFTPClient)) {
    throw new Error('FTP connection failed');
}
const gateway = await SIMFTPGateway.getInstanceOf(ftpClient!);

const criteria = Criteria.set([
    //new ArrayCriteria<BPAIRecord>(Object.values(CBO), 'CBOPROF'),
    //new ArrayCriteria(["2270196"], "CODUNI")
]);

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);

export const subset: SIMSubset = {
   src: 'DO',
   states: ['RJ']
}

export const parser = SIMBasicParser.instanceOf(MockedDictionary);
export const sia = SIMService.init(gateway, {
    filters: criteria.toDTO(),
    concurrency: MAX_CONCURRENT_PROCESSES,
    dataPath: "./data",
    parser: parser,
});
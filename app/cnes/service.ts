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

import { BasicFTPClient, Criteria, StringCriteria } from "@codeplaydata/datasus-core";
import { DATA_PATH, FTP_HOST, MAX_CONCURRENT_PROCESSES } from "../shared/config.js";
import { CNESSubset } from "./src/CNESSubset.js";
import { CNESParser } from "./src/CNESParser.js";
import { CNESBasicParser } from "./src/CNESBasicParser.js";
import { CNESService } from "./src/CNESService.js";
import { CNESFTPGateway } from "./src/CNESFTPGateway.js";

export const ftpClient = await BasicFTPClient.connect(FTP_HOST);
if (!(ftpClient instanceof BasicFTPClient)) {
    throw new Error('FTP connection failed');
}
const gateway = new CNESFTPGateway(ftpClient);
const criteria = Criteria.set([
    // new StringCriteria("2270196", "CNES")
]);

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);

export const subset: CNESSubset = {
    src: 'ST',
    states: ['RJ'],
    period: {
        start: {
            year: 2024,
            month: '01'
        },
        end: {
            year: 2024,
            month: '01'
        }
    }
};

export const parser: CNESParser = CNESBasicParser.instanceOf(MockedDictionary);
export const cnes = CNESService.init(gateway, {
    filters: criteria.toDTO(),
    concurrency: MAX_CONCURRENT_PROCESSES,
    dataPath: DATA_PATH,
    parser: parser,
});

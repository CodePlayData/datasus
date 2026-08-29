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

import { BasicFTPClient, Criteria, StringCriteria, DATASUSFTPGateway, StatePeriodStrategy } from "@codeplaydata/datasus-core";
import { DATA_PATH, FTP_HOST, FTP_PATHS, MAX_CONCURRENT_PROCESSES } from "../shared/config.js";
import { SIHSUSSubset } from "./src/SIHSUSSubset.js";
import { SIHSUSParser } from "./src/SIHSUSParser.js"
import { SIHSUSBasicParser } from "./src/SIHSUSBasicParser.js"
import { SIHSUSService } from "./src/SIHSUSService.js";

export const ftpClient = await BasicFTPClient.connect(FTP_HOST);
if (!(ftpClient instanceof BasicFTPClient)) {
    throw new Error('FTP connection failed');
}
const gateway = new DATASUSFTPGateway(ftpClient, FTP_PATHS.SIHSUS, new StatePeriodStrategy());
const criteria = Criteria.set([
    new StringCriteria("2270196", "CNES")
])

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);
export const subset: SIHSUSSubset = { 
    src: 'RJ',  
    states: ['RJ'],
    period: {
        start: {
            year: 2026,
            month: '01'
        },
        end: {
            year: 2026,
            month: '01'
        }
    }
};

export const parser: SIHSUSParser = SIHSUSBasicParser.instanceOf(MockedDictionary);
export const sihsus = SIHSUSService.init(gateway, {
    filters: criteria.toDTO(),
    concurrency: MAX_CONCURRENT_PROCESSES,
    dataPath: DATA_PATH,
    parser: parser,
});

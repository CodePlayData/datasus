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


import { Criteria, BasicFTPClient, ArrayCriteria, DATASUSFTPGateway, StateYearStrategy } from "@codeplaydata/datasus-core";
import { DATA_PATH, FTP_HOST, FTP_PATHS, MAX_CONCURRENT_PROCESSES } from "../shared/config.js";
import { SIMSubset } from "./src/SIMSubset.js";
import { SIMBasicParser } from "./src/SIMBasicParser.js";
import { SIMService } from "./src/SIMService.js";
import { prisonUnits } from "./utils/prison_units.js";

export const ftpClient = await BasicFTPClient.connect(FTP_HOST);
if (!(ftpClient instanceof BasicFTPClient)) {
    throw new Error('FTP connection failed');
}
const gateway = new DATASUSFTPGateway(ftpClient!, FTP_PATHS.SIM, new StateYearStrategy());

const criteria = Criteria.set([
    new ArrayCriteria(prisonUnits, "CODESTAB")
]);

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);

export const subset: SIMSubset = {
   src: 'DO',
   states: ['RJ'],
   year: [2024]
}

export const parser = SIMBasicParser.instanceOf(MockedDictionary);
export const sia = SIMService.init(gateway, {
    filters: criteria.toDTO(),
    concurrency: MAX_CONCURRENT_PROCESSES,
    dataPath: DATA_PATH,
    parser: parser,
});
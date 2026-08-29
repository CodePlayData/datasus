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

import { BasicFTPClient, Criteria, StringCriteria, DATASUSFTPGateway, CountryYearStrategy } from "@codeplaydata/datasus-core";
import { DATA_PATH, FTP_HOST, FTP_PATHS, MAX_CONCURRENT_PROCESSES } from "../shared/config.js";
import { SINANSubset } from "./src/SINANSubset.js";
import { SINANService } from "./src/SINANService.js";
import { SINANParser } from "./src/SINANParser.js";
import { SINANBasicParser } from "./src/SINANBasicParser.js";

export const ftpClient = await BasicFTPClient.connect(FTP_HOST);
if (!(ftpClient instanceof BasicFTPClient)) {
    throw new Error('FTP connection failed');
}
const gateway = new DATASUSFTPGateway(ftpClient, FTP_PATHS.SINAN, new CountryYearStrategy());
const criteria = Criteria.set([
    new StringCriteria("33", "SG_UF_NOT")
]);

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);

export const subset: SINANSubset = { src: 'TUBE', year: [2025] };
export const parser: SINANParser = SINANBasicParser.instanceOf(MockedDictionary);
export const sinan = SINANService.init(gateway, {
    filters: criteria.toDTO(),
    concurrency: MAX_CONCURRENT_PROCESSES,
    dataPath: DATA_PATH,
    parser: parser
});
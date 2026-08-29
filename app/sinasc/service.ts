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

import { Criteria, BasicFTPClient, ArrayCriteria, StringCriteria, DATASUSFTPGateway, StateYearStrategy } from "@codeplaydata/datasus-core";
import { SINASCSubset } from "./src/SINASCSubset.js";
import { SINASCBasicParser } from "./src/SINASCBasicParser.js";
import { SINASCService } from "./src/SINASCService.js";

const MAX_CONCURRENT_PROCESSES = 4;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
if (!(ftpClient instanceof BasicFTPClient)) {
    throw new Error('FTP connection failed');
}
const gateway = new DATASUSFTPGateway(ftpClient!, '/dissemin/publicos/SINASC/1996_/Dados/DNRES/', new StateYearStrategy());

const criteria = Criteria.set([
    // Exemplo: novos filtros específicos podem ser definidos aqui
]);

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);

export const subset: SINASCSubset = {
    src: 'DN',
    states: ['RJ'],
    year: [2024]
};

export const parser = SINASCBasicParser.instanceOf(MockedDictionary);
export const sinasc = SINASCService.init(gateway, {
    filters: criteria.toDTO(),
    concurrency: MAX_CONCURRENT_PROCESSES,
    dataPath: "./data",
    parser: parser,
});

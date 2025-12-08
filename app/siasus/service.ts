// @filename: service.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos
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

import { SIASUSService } from "./src/SIASUSService.js";
import { BPAIRecord } from "./src/BPAIRecord.js";
import { Criteria, BasicFTPClient, ArrayCriteria } from "@codeplaydata/datasus-core";
import { SIAFTPGateway } from "./src/SIAFTPGateway.js";
import { SIABasicParser } from "./src/SIABasicParser.js";
import { CBO } from "./utils/CBO.js";
import { SIASubset } from "./src/SIASubset";

const MAX_CONCURRENT_PROCESSES = 5;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
const gateway = await SIAFTPGateway.getInstanceOf(ftpClient!);
const criteria = Criteria.set([
    new ArrayCriteria<BPAIRecord>(Object.values(CBO), 'CBOPROF')
]);

export const BIDictionary = new Map<string, (value: any) => any>([
    ['CNS_PAC', (value: string) => Buffer.from((value as String)).toString("hex")]
]);

export const subset: SIASubset = {
    src: 'BI',
    states: ['RJ'],
    period: {
        start: {
            year: 2025,
            month: '09'
        },
        end: {
            year: 2025,
            month: '09'
        }
    }
}

export const parser = SIABasicParser.instanceOf(BIDictionary);
export const sia = SIASUSService.init(gateway, criteria.toDTO(), MAX_CONCURRENT_PROCESSES, "F:/DatasusFiles/");
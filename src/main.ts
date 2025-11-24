// @filename: main.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { SIABasicParser } from "./app/siasus/SIABasicParser.js";
import { SIAFTPGateway } from "./app/siasus/SIAFTPGateway.js";
import { SIASUSService } from "./app/siasus/SIASUSService.js";
import { Records } from "./core/Records.js";
import {BasicFTPClient} from "./infra/ftp/BasicFTPClient.js";
import {Criteria} from "./interface/criteria/Criteria.js";
import {StringCriteria} from "./interface/criteria/StringCriteria.js";

const MAX_CONCURRENT_PROCESSES = 5;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
const gateway = await SIAFTPGateway.getInstanceOf(ftpClient!);
const BIDictionary = new Map<string, (value: any) => any>([
    ['CNS_PAC', (value: string) => Buffer.from((value as String)).toString("hex")]
]);

type BPAIRecord = {
    CBOPROF: string;
    CNS_PAC: string;
    [key: string]: any;
};

const criteria = Criteria.set([
    new StringCriteria<BPAIRecord>('223293', 'CBOPROF'),
    new StringCriteria<BPAIRecord>('223208', 'CBOPROF')
])

const sia = SIASUSService.init(gateway, criteria.toDTO(), MAX_CONCURRENT_PROCESSES);
const parser = SIABasicParser.instanceOf(BIDictionary);

await sia.subset({
    src: 'BI',
    states: ['RJ'],
    period: {
        start: {
            year: 2022,
            month: '04'
        },
        end: {
            year: 2022,
            month: '04'
        }
    }
}, parser)

await sia.exec(
    (record: Records) => {
        console.log(record)
    }
).finally(
    () => {
        console.log('Done!')
        process.exit(0)
    }
);

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

import { BasicFTPClient } from "../../lib/src/infra/ftp/BasicFTPClient.js";
import { SIASUSService } from "./src/SIASUSService.js";
import { Criteria } from "../../lib/src/interface/criteria/Criteria.js";
import { StringCriteria } from "../../lib/src/interface/criteria/StringCriteria.js";
import { Records } from "../../lib/src/core/Records.js";
import { BPAIRecord } from "./src/BPAIRecord.js";
import { MongoClient } from "mongodb";
import { SIAFTPGateway } from "./src/SIAFTPGateway.js";
import { SIABasicParser } from "./src/SIABasicParser.js";

const MAX_CONCURRENT_PROCESSES = 5;
const FTP_HOST = 'ftp.datasus.gov.br';
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'datasus';
const COLLECTION_NAME = 'siasus_records';

const ftpClient = await BasicFTPClient.connect(FTP_HOST);
const gateway = await SIAFTPGateway.getInstanceOf(ftpClient!);
const BIDictionary = new Map<string, (value: any) => any>([
    ['CNS_PAC', (value: string) => Buffer.from((value as String)).toString("hex")]
]);

const criteria = Criteria.set([
    new StringCriteria<BPAIRecord>('223293', 'CBOPROF'),
    new StringCriteria<BPAIRecord>('223208', 'CBOPROF')
]);

const sia = SIASUSService.init(gateway, criteria.toDTO(), MAX_CONCURRENT_PROCESSES);
const parser = SIABasicParser.instanceOf(BIDictionary);

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db(DB_NAME);
const collection = db.collection(COLLECTION_NAME);

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
    async (record: Records) => {
        await collection.insertOne(record);
    }
).finally(
    async () => {
        console.log('Done!');
        await mongoClient.close();
        process.exit(0);
    }
);

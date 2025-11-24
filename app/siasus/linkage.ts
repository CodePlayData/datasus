// @filename: linkage.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos

    Licensed under the Apache License, Version 2.0 (the "License");
// @filename: linkage.ts

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

import { LinkageStrategy } from "../../lib/src/interface/linkage/LinkageStrategy.js";
import { MongoClient } from "mongodb";
import { MongoIndex } from "../../lib/src/infra/storage/MongoIndex.js";
import { MongoMatchRepository } from "../../lib/src/infra/storage/MongoMatchRepository.js";
import { SIASUSService } from "./src/SIASUSService.js";
import { Criteria } from "../../lib/src/interface/criteria/Criteria.js";
import { StringCriteria } from "../../lib/src/interface/criteria/StringCriteria.js";
import { BPAIRecord } from "./src/BPAIRecord.js";
import { SIAFTPGateway } from "./src/SIAFTPGateway.js";
import { BasicFTPClient } from "../../lib/src/infra/ftp/BasicFTPClient.js";

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'datasus';
const INDEX_COLLECTION = 'linkage_index';
const MATCHES_COLLECTION = 'linkage_matches';
const MAX_CONCURRENT_PROCESSES = 4;

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db(DB_NAME);

const indexCollection = db.collection(INDEX_COLLECTION);
const matchesCollection = db.collection(MATCHES_COLLECTION);

const indexStrategy = new MongoIndex(indexCollection);
const matchRepository = new MongoMatchRepository(matchesCollection);

const strategy = new LinkageStrategy('Test Study', indexStrategy, matchRepository);
const criteria = Criteria.set([
    new StringCriteria<BPAIRecord>('223293', 'CBOPROF'),
    new StringCriteria<BPAIRecord>('223208', 'CBOPROF')
]);

const ftpClient = await BasicFTPClient.connect('ftp.datasus.gov.br');
if (!ftpClient) throw new Error('Could not connect to FTP');
const gateway = await SIAFTPGateway.getInstanceOf(ftpClient);
const sia = SIASUSService.init(gateway, criteria.toDTO(), MAX_CONCURRENT_PROCESSES);




// Example usage (commented out as it requires actual services)
/*
await strategy
    .cohort(serviceA, configA)
    .link(serviceB, configB)
    .exec();
*/

console.log('Linkage strategy initialized with MongoDB.');

await mongoClient.close();
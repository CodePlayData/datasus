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

import { MongoClient } from "mongodb";
import { LinkageStrategy } from "@codeplaydata/datasus-linkage";
import { MONGO_URI } from "../shared/config.js";
import { TmpMongoIndex } from "../shared/tmdb/TmpMongoIndex.js";
import { TmpMongoMatchRepository } from "../shared/tmdb/TmpMongoMatchRepository.js";
import { parser, sia, subset } from "./service.js";

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db("datasus");
const indexCollection = db.collection("linkage_index");
const matchesCollection = db.collection("linkage_matches");
const indexStrategy = new TmpMongoIndex(indexCollection);
const matchRepository = new TmpMongoMatchRepository(matchesCollection);
const strategy = new LinkageStrategy("Test study", indexStrategy, matchRepository);

await strategy.cohort(sia, { name: "SIASUS", subset, parser })
console.log('Linkage strategy initialized with MongoDB.');
await mongoClient.close();

// Example usage (commented out as it requires actual services)
/*
await strategy
    .cohort(serviceA, configA)
    .link(serviceB, configB)
    .exec();
*/
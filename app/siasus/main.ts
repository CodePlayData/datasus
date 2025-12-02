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

import { MongoClient } from "mongodb";
import { Records } from "@codeplaydata/datasus-core";
import { sia, parser, subset } from "./service.js";

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'datasus';
const COLLECTION_NAME = 'siasus_records';

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db(DB_NAME);
const collection = db.collection(COLLECTION_NAME);

await sia.subset(subset, parser)

await sia.exec(
    /*
    async (record: Records) => {
        await collection.insertOne(record);
    }
    */
    (record: Records) => {
        console.log(record);
    }
).finally(
    async () => {
        console.log('Done!');
        // await mongoClient.close();
        process.exit(0);
    }
);

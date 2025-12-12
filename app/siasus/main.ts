// @filename: main.ts

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
// @ts-ignore
import { Records, DbcWriter } from "@codeplaydata/datasus-core";
import { sia, parser, subset } from "./service.js";

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'datasus';
const COLLECTION_NAME = 'siasus_records';

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db(DB_NAME);
const collection = db.collection(COLLECTION_NAME);

await sia.subset(subset, parser)

// const writer = new DbcWriter('F:/DatasusFiles/result.dbc');

await sia.exec(
    async (message: any) => {
        if (message.type === 'metadata') {
            await DbcWriter.initialize('F:/DatasusFiles/result.dbc', message.fields);
        } else {
            await DbcWriter.getInstance().write(message);
        }
    }
).finally(
    async () => {
        try {
            console.log('Closing DBC Writer...');
            await DbcWriter.getInstance().close();
            console.log('Saved!');
        } catch (e) {
            console.log('Nothing to save or error closing writer.');
        }
        console.log('Done!');
        // await mongoClient.close();
        process.exit(0);
    }
);

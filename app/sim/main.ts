// @filename: main.ts

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

import { MongoClient } from "mongodb";
import { MONGO_URI } from "../shared/config.js";
import { sia, subset } from "./service.js";
import { respiratoriasECovid, tuberculose } from "./utils/conditions.js";
import { SanitizeIcd } from "./utils/sanitizeIcd.js";

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db("sim");
const collection = db.collection("rj_total");

const respiratoriasMatcher = new SanitizeIcd(respiratoriasECovid);
const tuberculoseMatcher = new SanitizeIcd(tuberculose);
const linhasFields = ['LINHAA', 'LINHAB', 'LINHAC', 'LINHAD', 'LINHAII'];

await sia.subset(subset);
await sia.exec(
    async (message: any) => {
        if (message.type === 'metadata') return;

        const causabasMatch = respiratoriasMatcher.test(message, 'CAUSABAS');
        const linhasMatch = respiratoriasMatcher.test(message, linhasFields) || tuberculoseMatcher.test(message, linhasFields);

        if (causabasMatch || linhasMatch) {
            await collection.insertOne(message);
        }
    }

).finally(
    async () => {
        console.log('Done!');
        await mongoClient.close();
        process.exit(0);
    }
);
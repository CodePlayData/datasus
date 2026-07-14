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
import { sia, parser, subset } from "./service.js";
import { ICD10 } from "@codeplaydata/datasus-core";

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'sim';
const COLLECTION_NAME = 'rj_total';

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db(DB_NAME);
const collection = db.collection(COLLECTION_NAME);

const icds = await ICD10.load();
const respiratoriasECovid = icds.clear().block('J').block('U', {start: '071', end: '072'}).list;
const tuberculose = icds.clear().block('A', {start: '15', end: '19'}).list;

await sia.subset(subset)
await sia.exec(
    async (message: any) => {
        if (message.type === 'metadata') return;

        const cleanCode = (code: string) => code ? code.trim().toUpperCase().replace(".", "") : "";
        const causabas = cleanCode(message.CAUSABAS);
        const linhas = [
            cleanCode(message.LINHAA),
            cleanCode(message.LINHAB),
            cleanCode(message.LINHAC),
            cleanCode(message.LINHAD),
            cleanCode(message.LINHAII)
        ].filter(l => l !== "");

        const causabasMatch = respiratoriasECovid.includes(causabas);
        const linhasMatch = linhas.some(linha => 
            respiratoriasECovid.includes(linha) || tuberculose.includes(linha)
        );

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
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

import { Collection } from "mongodb";
import { IndexStrategy } from "../../interface/linkage/IndexStrategy.js";

export class MongoIndex implements IndexStrategy {
    constructor(private readonly collection: Collection) { }

    async set(key: string, value: any): Promise<void> {
        await this.collection.insertOne({ key, value });
    }

    async get(key: string): Promise<any[]> {
        const results = await this.collection.find({ key }).toArray();
        return results.map(doc => doc.value);
    }

    async has(key: string): Promise<boolean> {
        const count = await this.collection.countDocuments({ key }, { limit: 1 });
        return count > 0;
    }
}

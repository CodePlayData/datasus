// @filename: InMemoryIndex.ts

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

import { IndexStrategy } from "../interface/IndexStrategy";

export class InMemoryIndex implements IndexStrategy {
    private store = new Map<string, any[]>();

    async set(key: string, value: any): Promise<void> {
        if (!this.store.has(key)) {
            this.store.set(key, []);
        }
        this.store.get(key)!.push(value);
    }

    async get(key: string): Promise<any[]> {
        return this.store.get(key) || [];
    }

    async has(key: string): Promise<boolean> {
        return this.store.has(key);
    }
}
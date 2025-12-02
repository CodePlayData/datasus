// @filename: IndexStrategy.ts

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

/**
 * Strategy for storing and retrieving records for linkage.
 */
export interface IndexStrategy {
    /**
     * Stores a value (record or ID) associated with a key.
     * If the key already exists, the value should be appended to the list of values for that key.
     */
    set(key: string, value: any): Promise<void>;

    /**
     * Retrieves the list of values associated with a key.
     */
    get(key: string): Promise<any[]>;

    /**
     * Checks if a key exists in the index.
     */
    has(key: string): Promise<boolean>;
}

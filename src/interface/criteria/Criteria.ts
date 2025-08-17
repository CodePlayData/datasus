// @filename: Criteria.ts

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

/**
 * Generic contract for record filtering criteria.
 *
 * Implementations decide whether a given record matches a condition and may
 * expose a human-readable name and optional backing values (str/array).
 */
export interface Criteria<T> {
    /** Identifier used for logging/summary, usually "<field>_FILTER". */
    name: string;
    /** Optional string value used by simple criteria implementations. */
    str?: string;
    /** Optional array of values used by multi-value criteria implementations. */
    array?: string[];
    /**
     * Returns true if the provided record satisfies the criterion.
     */
    match(record: T): boolean;
}




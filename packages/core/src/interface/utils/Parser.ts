// @filename: Parser.ts

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

import {Records} from "../../core/Records.js";

/**
 * Contract for parsing/transforming emitted records.
 *
 * A parser may expose a dictionary mapping field name to transformation
 * functions and must implement a parse method that returns the transformed
 * record instance.
 */
export interface Parser<R extends Records> {
    /** Map of field -> transformer function. */
    dictionary: Map<string, (value: any) => any>;
    /** Parses and returns a possibly transformed record. */
    parse(record: R): R
}
// @filename: SIHSUSBasicParser.ts

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

import { Records } from "@codeplaydata/datasus-core";
import { SIHSUSParser } from "./SIHSUSParser.js";

export class SIHSUSBasicParser implements SIHSUSParser {
    record: Records | undefined;

    private constructor(readonly dictionary: Map<string, (value: any) => any>) {
    }

    static instanceOf(dictionary: Map<string, (value: any) => any>) {
        return new SIHSUSBasicParser(dictionary);
    }

    parse(record: Records): Records {
        this.record = record;

        for (const [field, value] of Object.entries(this.record)) {
            const parser = this.dictionary.get(field);
            if (parser && value !== undefined) {
                (this.record as any)[field] = parser(value);
            }
        }
        return this.record;
    }
}
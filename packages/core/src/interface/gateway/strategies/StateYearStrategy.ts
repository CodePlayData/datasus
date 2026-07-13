// @filename: StateYearStrategy.ts

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

import { NamingStrategy } from "../NamingStrategy.js";
import { Subset } from "../../../core/Subset.js";

export class StateYearStrategy implements NamingStrategy<Subset> {
    buildPrefixes(input: Subset): string[] {
        if ('src' in input && 'states' in input && 'year' in input && Array.isArray(input.year)) {
            const prefixes: string[] = [];
            for (const state of input.states as string[]) {
                for (const year of input.year as number[]) {
                    prefixes.push(`${input.src}${state}${year}`);
                }
            }
            return prefixes;
        }

        if ('src' in input && 'states' in input) {
            return (input.states as string[]).map((state: string) => `${input.src}${state}`);
        }

        return [input.src];
    }
}

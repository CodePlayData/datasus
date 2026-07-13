// @filename: StatePeriodStrategy.ts

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

export class StatePeriodStrategy implements NamingStrategy<Subset> {
    buildPrefixes(input: Subset): string[] {
        if ('src' in input && 'states' in input && 'period' in input && 'month' in input.period.start && 'month' in input.period.end) {
            const startMonth = parseInt(input.period.start.month, 10);
            const endMonth = parseInt(input.period.end.month, 10);
            const startYear = input.period.start.year;
            const endYear = input.period.end.year;

            if (
                startYear < 2008 || endYear > new Date().getFullYear() ||
                startMonth < 1 || startMonth > 12 ||
                endMonth < 1 || endMonth > 12
            ) {
                throw new Error('Invalid Period.');
            }

            const seq: string[] = [];
            for (let ano = startYear; ano <= endYear; ano++) {
                const mesInicial = (ano === startYear) ? startMonth : 1;
                const mesFinal = (ano === endYear) ? endMonth : 12;

                for (let mes = mesInicial; mes <= mesFinal; mes++) {
                    const stringAno = ano.toString().slice(-2);
                    const stringMes = mes.toString().padStart(2, '0');
                    seq.push(stringAno + stringMes);
                }
            }

            const prefixes: string[] = [];
            for (const yearMonth of seq) {
                for (const state of input.states as string[]) {
                    prefixes.push(`${input.src}${state}${yearMonth}`);
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

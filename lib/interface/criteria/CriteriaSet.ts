// @filename: CriteriaSet.ts

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

import {CriteriaObject} from "./CriteriaObject.js";
import {Criteria} from "./Criteria.js";

export class CriteriaSet<T> {
    constructor(private readonly list: Criteria<T>[]) {}
    check(record: T): boolean { return this.list.every(criteria => criteria.match(record)); }

    values(): Criteria<T>[] { return [...this.list]; }
    isEmpty(): boolean { return this.list.length === 0; }

    toObject(): CriteriaObject[] {
        return this.list.map((criteria) => {
            const anyC = criteria as any;
            const prop = anyC.objProp ?? (criteria.name.replace(/_FILTER$/, ''));
            if (Array.isArray(anyC.array)) return { type: 'array', prop, value: anyC.array } as const;
            return { type: 'string', prop, value: anyC.str } as const;
        });
    }
}

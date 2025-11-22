// @filename: Criteria.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
 */
import { CriteriaObject } from "./CriteriaObject.js";
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export abstract class Criteria<T> {
    /** Identifier used for logging/summary, usually "<field>_FILTER". */
    name!: string;
    /** Optional string value used by simple criteria implementations. */
    str?: string;
    /** Optional array of values used by multi-value criteria implementations. */
    array?: string[];
    /**
     * Returns true if the provided record satisfies the criterion.
     */
    abstract match(record: T): boolean;


    static fromObject<T>(dto?: CriteriaObject[] | null): Criteria<T>[] {
        if (!dto || dto.length === 0) return [];
        const { StringCriteria } = require('./StringCriteria.js');
        const { ArrayCriteria } = require('./ArrayCriteria.js');
        return dto.map((criteriaObject) =>
            // @ts-ignore
            criteriaObject.type === 'string' ? new StringCriteria<T>(criteriaObject.value, criteriaObject.prop) : new ArrayCriteria<T>(criteriaObject.value, criteriaObject.prop)
        );
    }

    static load<T>(criteriaObject?: CriteriaObject[] | null) {
        return new CriteriaSet<T>(Criteria.fromObject<T>(criteriaObject));
    }

    static set<T>(list: Criteria<T>[]) {
        const { ArrayCriteria } = require('./ArrayCriteria.js');
        const { StringCriteria } = require('./StringCriteria.js');

        const groups = new Map<string, Set<string>>();
        const others: Criteria<T>[] = [];

        for (const item of list) {
            const anyItem = item as any;
            if (anyItem.str !== undefined && anyItem.objProp) {
                if (!groups.has(anyItem.objProp)) {
                    groups.set(anyItem.objProp, new Set());
                }
                groups.get(anyItem.objProp)!.add(anyItem.str);
            } else if (anyItem.array !== undefined && anyItem.objProp) {
                if (!groups.has(anyItem.objProp)) {
                    groups.set(anyItem.objProp, new Set());
                }
                anyItem.array.forEach((val: string) => groups.get(anyItem.objProp)!.add(val));
            } else {
                others.push(item);
            }
        }

        const merged: Criteria<T>[] = [];
        for (const [prop, values] of groups) {
            if (values.size === 1) {
                merged.push(new StringCriteria([...values][0], prop));
            } else {
                merged.push(new ArrayCriteria([...values], prop));
            }
        }

        return new CriteriaSet([...merged, ...others]);
    }
}

class CriteriaSet<T> {
    constructor(private readonly list: Criteria<T>[]) { }
    isEmpty(): boolean { return this.list.length === 0; }
    check(record: T): boolean { return this.list.every(c => c.match(record)); }
    values(): Criteria<T>[] { return [...this.list]; }

    toDTO(): CriteriaObject[] {
        return this.list.map((criteria) => {
            const anyC = criteria as any;
            const prop = anyC.objProp ?? (criteria.name.replace(/_FILTER$/, ''));
            if (Array.isArray(anyC.array)) return { type: 'array', prop, value: anyC.array } as const;
            return { type: 'string', prop, value: anyC.str } as const;
        });
    }
}



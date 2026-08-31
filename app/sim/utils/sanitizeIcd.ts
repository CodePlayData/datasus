// @filename: sanitizeIcd.ts

/*
 *     Copyright 2026 Pedro Paulo Teixeira dos Santos

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

export class SanitizeIcd {
    private readonly icds: Set<string>;

    constructor(icds: string[]) {
        this.icds = new Set(icds.map(c => SanitizeIcd.clean(c)));
    }

    static clean(code: string | undefined | null): string {
        return code ? code.trim().toUpperCase().replace(/\./g, "") : "";
    }

    test(message: Record<string, any>, fields: string | string[]): boolean {
        const fieldList = Array.isArray(fields) ? fields : [fields];
        return fieldList.some(field => {
            const raw = message[field];
            if (!raw) return false;
            const cleaned = SanitizeIcd.clean(raw);
            return cleaned !== "" && this.icds.has(cleaned);
        });
    }
}

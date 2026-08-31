// @filename: SubdirectoryPathPlugin.ts

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

import { FTPGatewayPlugin } from "../FTPGatewayPlugin.js";
import { Subset } from "../../../core/Subset.js";

export class SubdirectoryPathPlugin<S extends Subset = Subset> implements FTPGatewayPlugin<S> {
    constructor(private readonly prefixLength: number = 2) {}

    resolveListPath(basePath: string, input: S): string {
        const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
        if (input && (input as any).src) {
            return `${normalizedBase}${(input as any).src}/`;
        }
        return normalizedBase;
    }

    resolveGetPath(basePath: string, file: string): string {
        const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
        if (file.includes('/')) {
            return `${normalizedBase}${file}`;
        }
        const sub = file.slice(0, this.prefixLength);
        return `${normalizedBase}${sub}/${file}`;
    }
}

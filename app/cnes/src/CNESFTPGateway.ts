// @filename: CNESFTPGateway.ts

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

import { DATASUSBaseFTPGateway, StatePeriodStrategy, FTPClient } from "@codeplaydata/datasus-core";
import { CNESSubset } from "./CNESSubset.js";

export class CNESFTPGateway extends DATASUSBaseFTPGateway<CNESSubset> {
    private currentSrc: string = 'ST';
    private readonly strategy: StatePeriodStrategy;

    constructor(
        client: FTPClient, 
        PATH: string = '/dissemin/publicos/CNES/200508_/Dados/'
    ) {
        super(client, PATH.endsWith('/') ? PATH : `${PATH}/`);
        this.strategy = new StatePeriodStrategy();
    }

    async list(input: CNESSubset, display: 'full' | 'short' = 'full') {
        this.currentSrc = input.src;
        const subPath = `${this.PATH}${input.src}/`;
        let list = await this.client.list(subPath);
        const prefixes = this.strategy.buildPrefixes(input);

        list = prefixes.map(prefix => {
            return list.filter((i: { name: string }) => i.name.startsWith(prefix));
        }).flat();

        return display === 'full' ? list : list.map((item: any) => item.name);
    }

    async get(file: string, dest?: string) {
        const src = this.currentSrc || file.slice(0, 2);
        const remotePath = `${this.PATH}${src}/${file}`;
        return await this.client?.download(dest || file, remotePath);
    }
}

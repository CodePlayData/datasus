// @filename: DATASUSFTPGateway.ts

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

import { DATASUSBaseFTPGateway } from "./DATASUSBaseFTPGateway.js";
import { NamingStrategy } from "./NamingStrategy.js";
import { Subset } from "../../core/Subset.js";
import { FTPClient } from "../../infra/ftp/FTPClient.js";
import { FTPGatewayPlugin } from "./FTPGatewayPlugin.js";

export class DATASUSFTPGateway<S extends Subset> extends DATASUSBaseFTPGateway<S> {
    constructor(
        client: FTPClient,
        PATH: string,
        private readonly strategy: NamingStrategy<S>,
        private readonly plugins: FTPGatewayPlugin<S>[] = []
    ) {
        super(client, PATH);
    }

    async list(input: S, display: 'full' | 'short' = 'full') {
        const basePath = this.PATH.endsWith('/') ? this.PATH : `${this.PATH}/`;
        let targetPath = basePath;
        for (const plugin of this.plugins) {
            if (plugin.resolveListPath) {
                targetPath = plugin.resolveListPath(targetPath, input);
            }
        }
        let list = await this.client.list(targetPath);
        const prefixes = this.strategy.buildPrefixes(input);

        list = prefixes.map(prefix => {
            return list.filter((i: { name: string }) => i.name.startsWith(prefix));
        }).flat();

        return display === 'full' ? list : list.map((item: any) => item.name);
    }

    override async get(file: string, dest?: string) {
        const basePath = this.PATH.endsWith('/') ? this.PATH : `${this.PATH}/`;
        let remotePath = `${basePath}${file}`;
        for (const plugin of this.plugins) {
            if (plugin.resolveGetPath) {
                remotePath = plugin.resolveGetPath(basePath, file);
            }
        }
        return await this.client?.download(dest || file, remotePath);
    }
}

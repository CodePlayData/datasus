// @filename: DATASUSStateYearFTPGateway.ts

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
import { Subset } from "../../core/Subset.js";
import { FTPClient } from "../../infra/ftp/FTPClient.js";

export class DATASUSStateYearFTPGateway<S extends Subset> extends DATASUSBaseFTPGateway<S> {

    constructor(client: FTPClient, PATH: string) {
        super(client, PATH);
    }

    async list(input: S, display: 'full' | 'short' = 'full') {
        let list = await this.client.list(this.PATH);

        if ('src' in input && 'states' in input && 'year' in input && Array.isArray(input.year)) {
            const prefixes: string[] = [];
            for (const state of input.states as string[]) {
                for (const year of input.year as number[]) {
                    prefixes.push(`${input.src}${state}${year}`);
                }
            }

            list = prefixes.map(prefix => {
                return list.filter((i: { name: string; }) => i.name.startsWith(prefix))
            }).flat();

            return display === 'full' ?
                list :
                list.map((item: { name: any; }) => item.name)
        }

        if ('src' in input && 'states' in input) {
            list = (input.states as string[]).map((state: any) => {
                return list.filter((i: { name: string; }) => i.name.startsWith(input.src + state))
            }).flat();

            return display === 'full' ?
                list :
                list.map((item: { name: any; }) => item.name)
        }

        return display === 'full' ?
            list.filter((i: { name: string; }) => i.name.startsWith(input.src)) :
            list.filter((i: { name: string; }) => i.name.startsWith(input.src)).map((item: { name: any; }) => item.name)
    }
}

// @filename: DATASUSCountryYearFTPGateway.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos
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

export class DATASUSCountryYearFTPGateway<S extends Subset> extends DATASUSBaseFTPGateway<S> {

    constructor(client: FTPClient, PATH: string) {
        super(client, PATH);
    }

    async list(input: S, display: 'full' | 'short' = 'full') {
        let list = await this.client.list(this.PATH);

        // Pattern: src + "BR" + YY (e.g. SINANBR23)
        // input: { src: string, year: number[] }
        if ('src' in input && 'year' in input && Array.isArray(input.year)) {
            const prefixes = (input.year as number[]).map(y => {
                const yy = y.toString().slice(-2);
                return `${input.src}BR${yy}`;
            });

            list = prefixes.map(prefix => {
                return list.filter((i: { name: string; }) => i.name.startsWith(prefix))
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

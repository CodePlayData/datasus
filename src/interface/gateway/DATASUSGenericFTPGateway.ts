// @filename: DATASUSGenericFTPGateway.ts

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

import {FTPClient} from "../../infra/ftp/FTPClient.js";
import {Subset} from "../../core/Subset.js";

export abstract class DATASUSGenericFTPGateway<S extends Subset> {
    constructor(readonly client: FTPClient, readonly PATH: string) {}

    async list(input: S , display: 'full' | 'short' = 'full') {
        let list = await this.client.list(this.PATH);
        let seq = [];

        if('src' in input && 'states' in input && 'period' in input && 'month' in input.period.start && 'month' in input.period.end) {
            if(input.period && input.period.start.year < 2008 || input.period && input.period.end.year > new Date(Date.now()).getFullYear()) {
                throw new Error('Invalid Period.')
            }

            for (let ano = input.period.start.year; ano <= input.period.end.year; ano++) {
                const mesInicial = (ano === input.period.start.year) ? parseInt(input.period.start.month, 10) : 1;
                const mesFinal = (ano === input.period.end.year) ? parseInt(input.period.end.month, 10) : 12;

                for (let mes = mesInicial; mes <= mesFinal; mes++) {
                    const stringAno = ano.toString().slice(-2);
                    const stringMes = mes.toString().padStart(2, '0');

                    seq.push(stringAno + stringMes);
                }
            };
            list = seq.map(yearMonth => {
                return input.states.map((state: any) => {
                    return list.filter((i: { name: string; }) => i.name.startsWith(input.src+state+yearMonth))
                }).flat()
            }).flat();

            return  display === 'full' ?
                list :
                list.map((item: { name: any; }) => item.name)
        }

        if('src' in input && 'states' in input) {
            list = input.states.map((state: any) => {
                return list.filter((i: { name: string; }) => i.name.startsWith(input.src+state))
            }).flat();

            return  display === 'full' ?
                list :
                list.map((item: { name: any; }) => item.name)
        }

        return  display === 'full' ?
            list.filter((i: { name: string; }) => i.name.startsWith(input.src)) :
            list.filter((i: { name: string; }) => i.name.startsWith(input.src)).map((item: { name: any; }) => item.name)
    }

    async get(file: string, dest?: string) {
        return await this.client?.download(dest || file, this.PATH+file);
    }
}
// @filename: JobProcessor.ts

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

import {Dbc} from "../Dbc.js";
import {appendFile, appendFileSync} from "node:fs";
import {JobMessage} from "./JobMessage.js";
import {Criteria} from "../../interface/criteria/Criteria.js";
import {ArrayCriteria} from "../../interface/criteria/ArrayCriteria.js";
import {StringCriteria} from "../../interface/criteria/StringCriteria.js";
import {Records} from "../../core/Records.js";

class ProcessRecordFailed extends Error {
    constructor() {
        super(`[ERROR]: Could not process record.`)
        this.name = 'ProcessRecordFailed';
        this.cause = 'Some data may be incorrect and resulted in error.'
    }

    static exception() {
        throw new ProcessRecordFailed()
    }
}

class CouldNotCleanUp extends Error {
    constructor() {
        super(`[ERROR]: The cleanup process could not be completed.`)
        this.name = 'CouldNotCleanUp';
        this.cause = 'This occurs when the cleanup process could not be completed.'
    }

    static exception() {
        throw new CouldNotCleanUp()
    }
}


export class JobProcessor {
    private summary: JobSummary;
    private dbc: Dbc | null;
    private msg: JobMessage;

    constructor(msg: JobMessage) {
        this.msg = msg;
        this.dbc = null;

        this.summary = {
            pid: process.pid,
            file: msg.file,
            total: 0,
            founds: 0,
            errors: 0,
            filters: msg.criteria
        };
    }

    private async handleRecord(record: Records): Promise<void> {
        try {
            switch (this.msg.output) {
                case 'stdout':
                    console.log(JSON.stringify(record));
                    this.summary.founds++;
                    // @ts-ignore
                    process.send(record);
                    break;
                case 'file':
                    await this.writeToFile(record);
                    break;
            }
        } catch (_) {
            this.summary.errors++;
            ProcessRecordFailed.exception()
        }
    }

    private async writeToFile(record: Records): Promise<void> {
        return new Promise((resolve, reject) => {
            appendFile(this.msg.dataPath + 'data.json', JSON.stringify(record), (error) => {
                if (error) {
                    this.summary.errors++;
                    reject(error);
                    return;
                }
                this.summary.founds++;
                // @ts-ignore
                process.send(record);
                resolve();
            });
        });
    }

    private loadCriteriaFromMsg() {
        const criteria: Criteria<any>[] = [];

        if (!this.msg.criteria) {
            return criteria;
        }

        const entries = Array.isArray(this.msg.criteria) ?
            this.msg.criteria :
            Object.entries(this.msg.criteria);

        for (const [key, value] of entries) {
            criteria.push(
                Array.isArray(value) ?
                    new ArrayCriteria(value, key) :
                    new StringCriteria(value, key)
            );
        }
        return criteria;
    }

    public async process(): Promise<void> {
        try {
            await this.initialize();
            const criteria = this.loadCriteriaFromMsg(); // o erro está aqui

            await this.dbc!.forEachRecords(async (record: Records) => {
                try {
                    if (!this.msg.criteria || criteria?.every(criteria => criteria?.match(record))) {
                        await this.handleRecord(record);
                    }
                } catch (_) {
                    ProcessRecordFailed.exception()
                }
            });
            await this.finalize();
        } catch (_) {
            ProcessFatal.exception(process.pid.toString());
            await this.cleanup(1);
        }
    }

    private async initialize(): Promise<void> {
        try {
            this.dbc = await Dbc.load(this.msg.dataPath + this.msg.file);
            this.summary.total = this.dbc.size;

            if (this.msg.output === 'file') {
                console.log(`O processo ${process.pid} iniciou o processamento do arquivo ${this.msg.file}.`);
            }
        } catch (_) {
            ProcessFatal.exception(process.pid.toString());
        }
    }

    private async finalize(): Promise<void> {
        try {
            appendFileSync(`${this.msg.dataPath}summary.json`, JSON.stringify(this.summary));
            console.log(
                `\nO Processo ${process.pid} encerrou a leitura e o resumo dos jobs é:` +
                `\n - Encontrados: ${this.summary.founds}` +
                `\n - Total: ${this.summary.total}` +
                `\n - Erros: ${this.summary.errors}\n`
            );
            await this.cleanup(0);
        } catch (_) {
            ProcessFatal.exception(process.pid.toString());
            await this.cleanup(1);
        }
    }

    private async cleanup(exitCode: number): Promise<void> {
        try {
            if (this.dbc) {
                this.dbc.remove();
            }
        } catch (_) {
            CouldNotCleanUp.exception()
        } finally {
            process.exit(exitCode);
        }
    }
}

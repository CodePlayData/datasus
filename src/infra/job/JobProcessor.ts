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
import {Records} from "../../core/Records.js";
import {JobSummary} from "./JobSummary.js";

/** Error thrown when a single record cannot be processed. */
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

/** Error thrown when the cleanup step cannot be completed. */
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


/**
 * Worker-side processor that reads a DBC/DBF file and emits records.
 *
 * It loads criteria from the message, optionally filters records, and for each
 * record it either prints to stdout or appends to a file, updating a summary.
 */
export class JobProcessor {
    private summary: JobSummary;
    private dbc: Dbc | null;
    private msg: JobMessage;

    /**
     * @param msg Job message containing file, output, criteria and data path.
     */
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

    /**
     * Processes one record according to the configured output mode.
     */
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

    /**
     * Appends the record as JSON to the data.json file in the given data path.
     */
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

    /**
     * Main workflow: open file, iterate records, filter/emit, finalize and cleanup.
     */
    public async process(): Promise<void> {
        try {
            await this.initialize();
            const criteria = Criteria.load(this.msg.criteria);
            const total = this.summary.total || 0;
            let processed = 0;
            let lastPct = -1;
            const step = 1; // percent granularity
            const emitProgress = () => {
                if (total <= 0) return;
                const pct = Math.floor((processed / total) * 100);
                if (pct !== lastPct && pct % step === 0) {
                    // @ts-ignore
                    process.send?.({ type: 'progress', pct, processed, total, file: this.msg.file, pid: process.pid });
                    lastPct = pct;
                }
            };
            if (total > 0) {
                // @ts-ignore
                process.send?.({ type: 'progress', pct: 0, processed: 0, total, file: this.msg.file, pid: process.pid });
            }
            await this.dbc!.forEachRecords(async (record: Records) => {
                try {
                    processed++;
                    emitProgress();

                    if (!this.msg.criteria || criteria.check(record)) {
                        await this.handleRecord(record);
                    }
                } catch (_) {
                    ProcessRecordFailed.exception()
                }
            });
            if (total > 0 && processed >= total) {
                // @ts-ignore
                process.send?.({ type: 'progress', pct: 100, processed, total, file: this.msg.file, pid: process.pid });
            }
            await this.finalize();
        } catch (_) {
            ProcessFatal.exception(process.pid.toString());
            await this.cleanup(1);
        }
    }

    /**
     * Opens the DBC, converts to DBF, write in the temporary folder and read it.
     * This consumes memory. It cannot be spawned. It's the same as malloc.
     */
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

    /**
     * Writes a summary and performs final cleanup.
     */
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

    /**
     * Ensures temporary files are removed from the temporary folder, freed memory and the process exits with the right code.
     */
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

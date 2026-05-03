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

import { DbcReader } from "../dbc/DbcReader";
import { appendFile, appendFileSync } from "node:fs";
import { join } from "node:path";
import { JobMessage } from "./JobMessage.js";
import { Criteria } from "../../interface/criteria/Criteria.js";
import { Records } from "../../core/Records.js";
import { JobSummary } from "./JobSummary.js";
import { ProcessFatal } from "./ProcessFatal.js";

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
    private dbc: DbcReader | null;
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
            this.summary.founds++;
            // @ts-ignore
            if (process.send) {
                await new Promise<void>((resolve, reject) => {
                    process.send!(record, (error: Error | null) => {
                        if (error) reject(error);
                        else resolve();
                    });
                });
            }
        } catch (_) {
            this.summary.errors++;
            ProcessRecordFailed.exception()
        }
    }

    public async process(): Promise<void> {
        try {
            await this.initialize();
            const criteria = Criteria.load(this.msg.criteria);
            const total = this.summary.total || 0;
            let processed = 0;
            let lastPct = -1;
            const step = 1;
            const emitProgress = () => {
                if (total <= 0) return;
                const pct = Math.floor((processed / total) * 100);
                if (pct !== lastPct && pct % step === 0) {
                    // @ts-ignore
                    process.send?.({ type: 'progress', status: 'running', pct, processed, total, file: this.msg.file, pid: process.pid });
                    lastPct = pct;
                }
            };
            if (total > 0) {
                // @ts-ignore
                process.send?.({ type: 'progress', status: 'running', pct: 0, processed: 0, total, file: this.msg.file, pid: process.pid });
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
            // Removed the redundant 100% emission because 'finished' will handle it.
            await this.finalize();
        } catch (_) {
            ProcessFatal.exception(process.pid.toString());
            await this.cleanup(1);
        }
    }

    private async initialize(): Promise<void> {
        try {
            this.dbc = await DbcReader.load(join(this.msg.dataPath || './', this.msg.file));
            // @ts-ignore
            process.send?.({ type: 'metadata', fields: this.dbc.fields });
            this.summary.total = this.dbc.size;
            // @ts-ignore
            process.send?.({ type: 'progress', status: 'started', file: this.msg.file, pid: process.pid });
        } catch (_) {
            ProcessFatal.exception(process.pid.toString());
        }
    }

    private async finalize(): Promise<void> {
        try {
            appendFileSync(join(this.msg.dataPath || './', 'summary.json'), JSON.stringify(this.summary));
            // @ts-ignore
            process.send?.({ type: 'progress', status: 'finished', summary: this.summary, file: this.msg.file, pid: process.pid, pct: 100 });
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

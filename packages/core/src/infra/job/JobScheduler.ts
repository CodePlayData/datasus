// @filename: JobScheduler.ts

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

import { JobRunner } from "./JobRunner.js";
import { Command } from "../Command.js";
import { JobMessage } from "./JobMessage.js";
import { Parser } from "../../interface/utils/Parser.js";
import { Records } from "../../core/Records.js";
import { CriteriaObject } from "../../interface/criteria/CriteriaObject.js";
import { Datasource } from "../../core/Datasource.js";
import { JobConfig } from "./JobConfig.js";

class FailToScheduleJob extends Error {
    constructor() {
        super(`The job could not be scheduled.`);
        this.name = 'FailToScheduleJob';
        this.cause = 'Some problem occurred when scheduling the job.';
    }

    static async exception<TChunk = string | JobMessage>(
        fallback?: (error: Error, failedChunk?: TChunk[]) => Promise<void> | void,
        failedChunk?: TChunk[]
    ): Promise<void> {
        const error = new FailToScheduleJob();
        if (fallback) {
            await fallback(error, failedChunk);
        } else {
            throw error;
        }
    }
}

export class JobScheduler<D extends Datasource> implements Command {
    private filesProcessed: number = 0;

    private constructor(readonly config: JobConfig) {
    }

    static init(config: JobConfig) {
        return new JobScheduler(config)
    }

    incrementFilesProcessed(qnt: number = 1) {
        this.filesProcessed = this.filesProcessed + qnt;
        return this.filesProcessed
    }

    async exec<TChunk extends string | JobMessage>(
        chunk: TChunk[], 
        jobScript: string, 
        dataSource?: D, 
        callback?: Function, 
        parser?: Parser<Records>, 
        progressCallback?: Function,
        onError?: (error: Error, failedChunk?: TChunk[]) => Promise<void> | void
    ): Promise<void> {
        try {
            const parserToUse = parser ?? this.config.parser;
            const promises = chunk.map((item) => {
                const jobMessage = this.createJobMessage(item, dataSource);
                return JobRunner.init(jobScript).exec(jobMessage, callback, parserToUse, progressCallback)
                    .then(() => {
                        this.incrementFilesProcessed();
                    });
            });
            await Promise.all(promises);
        } catch (_) {
            await FailToScheduleJob.exception<TChunk>(onError, chunk);
        }
    }

    private createJobMessage(item: string | JobMessage, dataSource?: D) {
        return {
            src: dataSource,
            file: item as string,
            criteria: this.config.filters,
            dataPath: this.config.dataPath
        }
    }
}

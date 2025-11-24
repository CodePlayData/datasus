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

import {JobRunner} from "./JobRunner.js";
import {Command} from "../Command.js";
import {JobMessage} from "./JobMessage.js";
import {Parser} from "../../interface/utils/Parser.js";
import {Records} from "../../core/Records.js";
import {CriteriaObject} from "../../interface/criteria/CriteriaObject.js";
import {Datasource} from "../../core/Datasource.js";

class FailToScheduleJob extends Error {
    constructor() {
        super(`The job could not be scheduled.`)
        this.name = 'FailToScheduleJob';
        this.cause = 'Some problem occurred when scheduling the job.'
    }

    static exception() {
        throw new FailToScheduleJob()
    }
}

export class JobScheduler<D extends Datasource> implements Command {
    private filesProcessed: number = 0;
    
    private constructor(readonly MAX_CONCURRENT_PROCESSES:number = 2, readonly criteria?: CriteriaObject[], readonly DATA_PATH?: string) {
    }

    static init(MAX_CONCURRENT_PROCESSES?:number, criteria?: CriteriaObject[], DATA_PATH?: string) {
        return new JobScheduler(MAX_CONCURRENT_PROCESSES, criteria, DATA_PATH)
    }

    incrementFilesProcessed(qnt: number = 1) {
        this.filesProcessed = this.filesProcessed + qnt;
        return this.filesProcessed
    }

    async exec(chunk: string[] | JobMessage[], jobScript: string, dataSource?: D, callback?: Function, parser?: Parser<Records>, progressCallback?: Function): Promise<void> {
        try {
            const jobMessage = this.createJobMessage(chunk, dataSource);
            await JobRunner.init(jobScript).exec(jobMessage, callback, parser, progressCallback);
            this.incrementFilesProcessed();
            if(this.filesProcessed < chunk.length) return this.exec(chunk, jobScript, dataSource, callback);
            return Promise.resolve();
        } catch (_) {
            FailToScheduleJob.exception()
        }
    }

    private createJobMessage(chunk: string[] | JobMessage[], dataSource?: D) {
        return {
            src: dataSource,
            file: chunk[this.filesProcessed] as string,
            criteria: this.criteria,
            dataPath: this.DATA_PATH
        }
    }
}

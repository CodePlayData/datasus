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
import {DataSource} from "../../core/Datasource.js";
import {CriteriaObject} from "../../interface/criteria/CriteriaObject";

/**
 * Error thrown when a job could not be scheduled for execution.
 */
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

/**
 * Schedules and orchestrates the execution of jobs (child processes) over a chunk of files.
 *
 * It recursively schedules executions until the chunk is fully processed, forwarding
 * criteria, output options, and optional callback/parser to the JobRunner.
 */
export class JobScheduler<D extends DataSource> implements Command {
    private filesProcessed: number = 0;
    /**
     * @param MAX_CONCURRENT_PROCESSES Unused here but kept for API symmetry with orchestrator.
     * @param criteria Optional criteria applied by JobProcessor when filtering records.
     * @param DATA_PATH Base path used by children to read/write data files.
     */
    private constructor(readonly MAX_CONCURRENT_PROCESSES:number = 2, readonly criteria?: CriteriaObject[], readonly DATA_PATH?: string) {
    }

    /**
     * Factory method to create a scheduler.
     */
    static init(MAX_CONCURRENT_PROCESSES?:number, criteria?: CriteriaObject[], DATA_PATH?: string) {
        return new JobScheduler(MAX_CONCURRENT_PROCESSES, criteria, DATA_PATH)
    }

    /**
     * Increments the internal counter of processed files.
     * @param qnt How many files to add (default 1).
     */
    incrementFilesProcessed(qnt: number = 1) {
        this.filesProcessed = this.filesProcessed + qnt;
        return this.filesProcessed
    }

    // O SIADatasource é a única coisa que identifica. Talvez tenha que vir por Generics.
    /**
     * Executes the scheduling cycle for the given chunk.
     * @param chunk List of files (or messages) to process.
     * @param output Output destination of child processing ('stdout' | 'file').
     * @param jobScript Path to the worker script to fork.
     * @param dataSource Optional dataset identifier, forwarded to child.
     * @param callback Optional callback invoked for each processed record.
     * @param parser Optional parser to transform each emitted record.
     * @param progressCallback
     */
    async exec(chunk: string[] | JobMessage[], output: 'stdout' | 'file' = 'file', jobScript: string, dataSource?: D, callback?: Function, parser?: Parser<Records>, progressCallback?: Function): Promise<void> {
        try {
            const jobMessage = this.createJobMessage(chunk, dataSource, output);
            await JobRunner.init(jobScript).exec(jobMessage, callback, parser, progressCallback);
            this.incrementFilesProcessed();
            if(this.filesProcessed < chunk.length) return this.exec(chunk, output, jobScript, dataSource, callback);
            return Promise.resolve();
        } catch (_) {
            FailToScheduleJob.exception()
        }
    }

    /**
     * Creates a JobMessage instance from the provided chunk and optional parameters.
     * @param chunk - List of files to process.
     * @param dataSource - Optional dataset identifier.
     * @param output - Output destination ('stdout' | 'file').
     * @private
     */
    private createJobMessage(chunk: string[] | JobMessage[], dataSource?: D, output: 'stdout' | 'file' = 'file') {
        return {
            src: dataSource,
            file: chunk[this.filesProcessed] as string,
            output,
            criteria: this.criteria,
            dataPath: this.DATA_PATH
        }
    }
}

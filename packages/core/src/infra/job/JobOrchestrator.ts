// @filename: JobOrchestrator.ts

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


import { SplitIntoChunks } from "../SplitIntoChunks.js";
import { JobScheduler } from "./JobScheduler.js";
import { JobRunner } from "./JobRunner.js";
import { Command } from "../Command.js";
import { Subset } from "../../core/Subset.js";
import { DATASUSGateway } from "../../interface/gateway/DATASUSGateway.js";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { Datasource } from "../../core/Datasource.js";
import { JobConfig } from "./JobConfig.js";

export class JobOrchestrator<
    S extends Subset,
    D extends Datasource,
    G extends DATASUSGateway<S>
> implements Command {
    private _files: string[] = [];
    private _chunks: string[][] = [[]];
    private dataSource: D | undefined;
    private readonly resolvedDataPath: string;

    get files() {
        return this._files
    }

    get chunks() {
        return this._chunks
    }

    protected constructor(
        private gateway: G,
        readonly config: JobConfig
    ) {
        this.resolvedDataPath = resolve(config.dataPath);
    }

    static init(gateway: DATASUSGateway<Subset>, config?: Partial<JobConfig>) {
        const defaultConfig: JobConfig = {
            dataPath: './',
            concurrency: 2,
            verbose: true,
            ...config
        };
        return new JobOrchestrator(gateway, defaultConfig)
    }

    async subset(subset: S) {
        this._files = [];
        this._chunks = [[]];
        this.dataSource = undefined;
        this.dataSource = subset.src;
        this._files = await this.gateway.list(subset, 'short') as string[];
        this._files = Array.from(new Set(this._files));
        this._chunks = SplitIntoChunks.define(this.config.concurrency).exec(this._files) as string[][];
    }

    get defaultJobScript(): string {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        return join(__dirname, 'job.js');
    }

    async exec(callback?: Function, jobScript?: string) {
        const scriptToUse = jobScript ?? this.config.jobScript ?? this.defaultJobScript;
        const verbose = this.config.verbose;

        for await (let file of this._files) {
            if (verbose) console.log(`Downloading ${file}...`);
            await this.gateway.get(file, join(this.resolvedDataPath, file));
            if (verbose) console.log(`Download of ${file} completed.`);
        }
        let chunksProceeded = 0;
        if (verbose) console.log(`\nSending Jobs.\n`);
        
        JobRunner.totalJobs = this._files.length;
        JobRunner.finishedJobs = 0;
        JobRunner.startTime = Date.now();
        JobRunner.globalSummary = { total: 0, founds: 0, errors: 0 };
        
        // Se verbose for false, passamos um progressCallback vazio para silenciar o JobRunner
        const progressCb = verbose ? undefined : () => {};

        while (chunksProceeded < this._chunks.length) {
            await JobScheduler.init(this.config).exec(
                this._chunks[chunksProceeded], 
                scriptToUse, 
                this.dataSource, 
                callback, 
                this.config.parser, 
                progressCb
            ).finally(() => {
                chunksProceeded = chunksProceeded + 1
            })
        }
        if (chunksProceeded == this._chunks.length) {
            this._files = [];
            this._chunks = [];
        }
        if (verbose) JobRunner.printGlobalSummary();
        return
    }
}
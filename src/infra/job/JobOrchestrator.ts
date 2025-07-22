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


import {SplitIntoChunks} from "../SplitIntoChunks.js";
import {JobScheduler} from "./JobScheduler.js";
import {Command} from "../Command.js";
import {Subset} from "../../core/Subset.js";
import {DATASUSGateway} from "../../interface/gateway/DATASUSGateway.js";
import {Parser} from "../../interface/utils/Parser.js";
import {Records} from "../../core/Records.js";
import {DataSource} from "../../core/Datasource.js";
import {fileURLToPath} from "node:url";
import { dirname, join } from "node:path";

export class JobOrchestrator<
    S extends Subset,
    D extends DataSource,
    G extends DATASUSGateway<S>,
    P extends Parser<Records>
> implements Command {
    private _files: string[] = [];
    private _chunks: string[][] = [[]];
    // Talvez tenha que vir por generics
    private dataSource: D | undefined;
    private parser: P | undefined;
    private readonly resolvedDataPath: string;

    get files() {
        return this._files
    }

    get chunks() {
        return this._chunks
    }

    constructor(
        private gateway: G,
        readonly DATA_PATH: string = './',
        readonly MAX_CONCURRENT_PROCESSES: number,
        readonly output: 'stdout' | 'file' = 'stdout',
        readonly filters?: Map<string, string | string[]>,
        readonly callback?: Function,
    ) {
        this.resolvedDataPath = join(process.cwd(), DATA_PATH);
    }

    static init(gateway: DATASUSGateway<Subset>, filters?: Map<string, string | string[]>, callback?: Function, logOutput: 'stdout' | 'file' = 'stdout', MAX_CONCURRENT_PROCESSES: number = 5, DATA_PATH: string = './') {
        return new JobOrchestrator(gateway, DATA_PATH, MAX_CONCURRENT_PROCESSES, logOutput, filters, callback)
    }

    async subset(subset: S, parser?: P) {
        this._files = [];
        this._chunks = [[]];
        this.dataSource = undefined;
        this.parser = undefined;
        this.dataSource = subset.src;
        this._files = await this.gateway.list(subset, 'short') as string[];
        this._files = Array.from(new Set(this._files));
        this._chunks = SplitIntoChunks.define(this.MAX_CONCURRENT_PROCESSES).exec(this._files) as string[][];
        this.parser = parser;
    }

    get defaultJobScript(): string {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        return join(__dirname, 'job.js');
    }

    async exec(jobScript?: string) {
        const scriptToUse = jobScript ?? this.defaultJobScript;

        for await (let file of this._files) {
            if(this.output === 'file') console.log(`Downloading ${file}...`)
            console.log(this.resolvedDataPath + file)
            await this.gateway.get(file, this.resolvedDataPath + file)
            if(this.output === 'file') console.log(`Download of ${file} completed.`)
        }
        let chunksProceeded = 0;
        if(this.output === 'file') console.log(`\nSending Jobs.\n`);
        while (chunksProceeded < this._chunks.length) {
            await JobScheduler.init(this.MAX_CONCURRENT_PROCESSES, this.filters, this.resolvedDataPath).exec(this._chunks[chunksProceeded], this.output, scriptToUse, this.dataSource,  this.callback, this.parser).finally(() => {
                chunksProceeded = chunksProceeded + 1
            })
        }
        if(chunksProceeded == this._chunks.length) {
            this._files = [];
            this._chunks = [];
        }
        return
    }
}
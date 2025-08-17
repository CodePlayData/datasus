// @filename: JobRunner.ts

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

import {ChildProcess, fork} from "node:child_process";
import {Command} from "../Command.js";
import {JobMessage} from "./JobMessage.js";
import {Parser} from "../../interface/utils/Parser.js";
import {Records} from "../../core/Records.js";

/**
 * Responsible for forking and supervising a worker process (job script).
 *
 * It forwards messages to the child process and resolves when the child exits.
 * Optionally, it applies a parser and invokes a callback for each emitted record.
 */
export class JobRunner implements Command {
    /**
     * @param jobScript Absolute or relative path to the worker script to be forked.
     */
    private constructor(private jobScript: string) {
    }

    /**
     * Factory method for creating a JobRunner bound to a script.
     */
    static init(jobScript: string) {
        return new JobRunner(jobScript)
    }

    /**
     * Starts the child process and wires IPC events.
     * @param jobMsg Message sent to the child to start processing.
     * @param callback Optional callback invoked per record/message from the child.
     * @param parser Optional parser to transform each record before callback.
     * @param progressCallback Optional callback for progress updates from the child.
     */
    async exec(jobMsg: JobMessage, callback?: Function, parser?: Parser<Records>, progressCallback?: Function) {
        return new Promise((resolve, reject) => {
            const child: ChildProcess = fork(this.jobScript);
            child.on('exit', (code, signal) => {
                if (signal) {
                    reject(`Foi fechado pelo sinal: ${signal} com o código ${code}`)
                }
                resolve(true)
            });
            child.on('message', (msg: any) => {
                const isTypedEvent = msg && typeof msg === 'object' && 'type' in msg;
                if (isTypedEvent) {
                    if (msg.type === 'progress') {
                        if (progressCallback) {
                            progressCallback(msg);
                        } else if (typeof msg.pct === 'number') {
                            const file = msg.file || jobMsg.file;
                            const processed = msg.processed ?? '?';
                            const total = msg.total ?? '?';
                            process.stdout.write(`[child ${msg.pid ?? ''}] ${file}: ${msg.pct}% (${processed}/${total})\r`);
                            if (msg.pct === 100) process.stdout.write('\n');
                        }
                    }
                } else {
                    if (callback) callback(msg);
                }
                const parsedMsg = parser ? parser.parse(msg as unknown as Records) : msg;
                if(callback) {
                    callback(parsedMsg)
                }
            });
            child.send(jobMsg);
        })
    }
}
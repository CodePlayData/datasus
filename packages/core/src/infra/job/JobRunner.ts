// @filename: JobRunner.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { ChildProcess, fork } from "node:child_process";
import { Command } from "../Command.js";
import { JobMessage } from "./JobMessage.js";
import { Parser } from "../../interface/utils/Parser.js";
import { Records } from "../../core/Records.js";

export class JobRunner implements Command {
    private constructor(private jobScript: string) {
    }

    static init(jobScript: string) {
        return new JobRunner(jobScript)
    }

    async exec(jobMsg: JobMessage, callback?: Function, parser?: Parser<Records>, progressCallback?: Function) {
        return new Promise((resolve, reject) => {
            const child: ChildProcess = fork(this.jobScript);
            const pendingPromises: Promise<void>[] = [];

            child.on('exit', async (code, signal) => {
                try {
                    await Promise.all(pendingPromises);
                    if (signal) {
                        reject(`Foi fechado pelo sinal: ${signal} com o código ${code}`)
                    }
                    resolve(true)
                } catch (e) {
                    reject(e)
                }
            });
            child.on('message', (msg: any) => {
                const isTypedEvent = msg && typeof msg === 'object' && 'type' in msg;
                if (isTypedEvent) {
                    if (msg.type === 'progress') {
                        if (progressCallback) {
                            const promise = progressCallback(msg);
                            if (promise instanceof Promise) pendingPromises.push(promise);
                        } else if (typeof msg.pct === 'number') {
                            const file = msg.file || jobMsg.file;
                            const processed = msg.processed ?? '?';
                            const total = msg.total ?? '?';
                            process.stdout.write(`[child ${msg.pid ?? ''}] ${file}: ${msg.pct}% (${processed}/${total})\r`);
                            if (msg.pct === 100) process.stdout.write('\n');
                        }
                    } else if (msg.type === 'metadata') {
                        if (callback) {
                            const promise = callback(msg);
                            if (promise instanceof Promise) pendingPromises.push(promise);
                        }
                    }
                } else {
                    const parsedMsg = parser ? parser.parse(msg as unknown as Records) : msg;
                    if (callback) {
                        const promise = callback(parsedMsg);
                        if (promise instanceof Promise) pendingPromises.push(promise);
                    }
                }
            });
            child.send(jobMsg);
        })
    }
}
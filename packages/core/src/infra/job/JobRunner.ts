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

const activeJobs = new Map<number | string, string>();
let lastLines = 0;

export class JobRunner implements Command {
    static totalJobs = 0;
    static finishedJobs = 0;
    static startTime = 0;
    static globalSummary = { total: 0, founds: 0, errors: 0 };

    static printGlobalSummary() {
        const timeDiff = Date.now() - JobRunner.startTime;
        const seconds = Math.floor((timeDiff / 1000) % 60);
        const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
        const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);

        let timeStr = '';
        if (hours > 0) timeStr += `${hours}h `;
        if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
        timeStr += `${seconds}s`;

        const fmt = (n: number) => n.toLocaleString('pt-BR');

        if (lastLines > 0) {
            process.stdout.write(`\x1b[${lastLines}A`);
            process.stdout.write('\x1b[J');
            lastLines = 0;
        }

        const summaryText = `\n\x1b[1m=== RESUMO GLOBAL DA EXECUÇÃO ===\x1b[0m\n` +
            `Tempo total percorrido: \x1b[36m${timeStr}\x1b[0m\n` +
            `Total de registros lidos: \x1b[36m${fmt(JobRunner.globalSummary.total)}\x1b[0m\n` +
            `Total de registros encontrados: \x1b[32m${fmt(JobRunner.globalSummary.founds)}\x1b[0m\n` +
            `Total de registros perdidos por erro: \x1b[31m${fmt(JobRunner.globalSummary.errors)}\x1b[0m\n\n`;

        process.stdout.write(summaryText);
    }

    static renderConsole(completedJobText?: string) {
        if (lastLines > 0) {
            process.stdout.write(`\x1b[${lastLines}A`);
            process.stdout.write('\x1b[J');
        }

        if (completedJobText) {
            process.stdout.write(`${completedJobText}\n`);
        }

        if (JobRunner.totalJobs > 0) {
            const header = `\x1b[35mPrevisão: ${JobRunner.finishedJobs} arquivos lidos de ${JobRunner.totalJobs} arquivos totais.\x1b[0m\n`;
            process.stdout.write(header);

            let activeLines = 0;
            for (const line of activeJobs.values()) {
                process.stdout.write(`${line}\n`);
                activeLines++;
            }

            lastLines = 1 + activeLines;
        } else {
            let activeLines = 0;
            for (const line of activeJobs.values()) {
                process.stdout.write(`${line}\n`);
                activeLines++;
            }
            lastLines = activeLines;
        }
    }

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
                        } else {
                            const pid = msg.pid ?? 'unknown';
                            const coloredPid = `\x1b[36m[child ${pid}]\x1b[0m`;
                            const coloredFile = `\x1b[33m${msg.file}\x1b[0m`;
                            if (msg.status === 'started') {
                                activeJobs.set(pid, `${coloredPid} ${coloredFile}: \x1b[90mIniciando o processamento...\x1b[0m`);
                                JobRunner.renderConsole();
                            } else if (msg.status === 'running') {
                                const processed = msg.processed ?? '?';
                                const total = msg.total ?? '?';
                                activeJobs.set(pid, `${coloredPid} ${coloredFile}: \x1b[32m${msg.pct}% (${processed}/${total})\x1b[0m`);
                                JobRunner.renderConsole();
                            } else if (msg.status === 'finished') {
                                const summary = msg.summary;
                                JobRunner.globalSummary.total += summary.total;
                                JobRunner.globalSummary.founds += summary.founds;
                                JobRunner.globalSummary.errors += summary.errors;

                                const fmt = (n: number) => n.toLocaleString('pt-BR');
                                const text = `${coloredPid} ${coloredFile}: \x1b[32m100% (${summary.total}/${summary.total})\x1b[0m - O Processo ${pid} encerrou a leitura e o resumo dos jobs é de \x1b[1m\x1b[32m${fmt(summary.founds)} Registros Encontrados\x1b[0m, de um total de \x1b[36m${fmt(summary.total)}\x1b[0m Registros e com \x1b[31m${fmt(summary.errors)}\x1b[0m Registros Perdidos por Erro.`;
                                activeJobs.delete(pid);
                                JobRunner.finishedJobs++;
                                JobRunner.renderConsole(text);
                            }
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
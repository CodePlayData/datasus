// @filename: job.ts

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


import {JobProcessor} from "./JobProcessor.js";
import {JobMessage} from "./JobMessage.js";

class UncaughtException extends Error {
    constructor(pid: string, error: Error) {
        super(`[ERROR]: Process ${ pid } has this uncaught exception: ${ error.message }`)
        this.name = 'UncaughtException';
        this.cause = 'Uncaught exception.'
    }

    static exception(file: string, error: Error) {
        throw new UncaughtException(file, error)
    }
}

class UnhandledRejection extends Error {
    constructor(pid: string, reason: unknown) {
        super(`[ERROR]: Process ${ pid } has a promise not resolved: ${ reason }`)
        this.name = 'UnhandledRejection';
        this.cause = 'The process has a promise not resolved.'
    }

    static exception(file: string, reason: unknown) {
        throw new UnhandledRejection(file, reason)
    }
}

process.on('uncaughtException', (error) => {
    UncaughtException.exception(process.pid.toString(), error)
    process.exit(1)
});

process.on('unhandledRejection', (reason, _) => {
    UnhandledRejection.exception(process.pid.toString(), reason)
    process.exit(1);
});

process.on('message', async (msg: JobMessage) => {
    try {
        const processor = new JobProcessor(msg);
        await processor.process();
    } catch (error) {
        ProcessFatal.exception(process.pid.toString(), error as Error);
        process.exit(1);
    }
});

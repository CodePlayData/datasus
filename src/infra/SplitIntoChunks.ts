// @filename: SplitIntoChunks.ts

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


import {Command} from "./Command.js";

/**
 * Utility to split a list of items into fixed-size chunks.
 *
 * This is used by the JobOrchestrator to partition file lists and control
 * the max number of concurrent jobs handled by the JobScheduler.
 */
export class SplitIntoChunks implements Command {
    /**
     * @param chunkSize Desired size of each chunk (number of items per chunk).
     */
    private constructor(protected chunkSize: number) {
    }

    /**
     * Factory method to create a splitter with a defined chunk size.
     * @param chunkSize Number of items per chunk.
     */
    static define(chunkSize: number) {
        return new SplitIntoChunks(chunkSize)
    }

    /**
     * Splits the given array into chunks of the configured size.
     * @param arr List of items to be partitioned.
     * @returns An array of arrays (chunks) keeping original order.
     */
    exec(arr: string[]) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += this.chunkSize) {
            chunks.push(arr.slice(i, i + this.chunkSize));
        }
        return chunks
    }
}
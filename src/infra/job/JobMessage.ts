// @filename: JobMessage.ts

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



import {DataSource} from "../../core/Datasource.js";
import {CriteriaObject} from "../../interface/criteria/CriteriaObject.js";

/**
 * Message sent from the scheduler to the worker process to start a job.
 *
 * - src: dataset identifier (optional) to inform the worker which domain it belongs to;
 * - file: target filename to be processed (relative to dataPath);
 * - criteria: filters applied when reading records;
 * - output: where to emit records ('stdout' | 'file');
 * - dataPath: base path where the file resides and where outputs are written.
 */
export type JobMessage = {
    src: DataSource | undefined,
    file: string,
    criteria?: CriteriaObject[],
    output: 'stdout' | 'file',
    dataPath: string | undefined
}
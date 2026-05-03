
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

import { statSync, unlink } from "node:fs"
import { tmpdir } from "node:os";
import { parse } from "node:path";
import { DBFFile, FieldDescriptor } from 'dbffile';
import { dbc2dbf } from "@codeplaydata/dbc2dbf"

class CanNotExcludeDbcFile extends Error {
    private constructor(readonly file: string) {
        super(`A error occurred when deleting file: ${file}`)
        this.name = 'CanNotExcludeDbcFile';
        this.cause = 'The file was already excluded.'
    }

    static async exception<T = void>(file: string, fallbackFunction?: (error: CanNotExcludeDbcFile) => Promise<T>) {
        const error = new CanNotExcludeDbcFile(file);
        if(fallbackFunction) {
            await fallbackFunction(error);
        } else {
            throw error;
        }
    }
}

export class DbcReader {
    size!: number;
    fields!: FieldDescriptor[];

    private constructor(
        readonly dbf: DBFFile,
        private readonly io: { input: string, output: string }
    ) {
        this.size = dbf.recordCount;
        this.fields = dbf.fields;
    }

    static async load(inputFile: string) {
        const inputFilePath = parse(inputFile);
        const io = {
            input: inputFile,
            output: `${tmpdir()}/${inputFilePath.name}-${process.pid}-${Date.now()}.dbf`
        }

        try {
            statSync(io.output);
        } catch (error: any) {
            dbc2dbf(io);
        }
        let dbf = await DBFFile.open(io.output);
        return new DbcReader(dbf, io)
    }

    async readBatch(count?: number): Promise<Record<string, unknown>[]> {
        return await this.dbf.readRecords(count || this.size)
    }

    remove<T = void>(verbose: boolean = true, fallbackFunction?: (error: CanNotExcludeDbcFile) => Promise<T>): void {
        const inputFilePath = parse(this.io.input);
        unlink(this.io.output, async (error: any) => {
            if (error) {
                await CanNotExcludeDbcFile.exception(`${inputFilePath.name}${inputFilePath.ext}`, fallbackFunction);
            } else if (verbose) {
                console.log(`${inputFilePath.name}${inputFilePath.ext} excluded.`);
            }
        });
    }

    async forEachRecords(callback: (record: any) => Promise<any>) {
        for await (let record of this.dbf) {
            await callback(record)
        }
    }
}


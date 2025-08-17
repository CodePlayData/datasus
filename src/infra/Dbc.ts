// @filename: Dbc.ts

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

import {statSync, unlink} from "node:fs"
import {tmpdir} from "node:os";
import {parse} from "node:path";
import {DBFFile, FieldDescriptor} from 'dbffile';
import { dbc2dbf } from "@codeplaydata/dbc2dbf"

/**
 * Wrapper around dbffile to handle DATASUS DBC files conversion and reading.
 *
 * It converts the .dbc file to a temporary .dbf (using @codeplaydata/dbc2dbf),
 * exposes basic metadata (record count and fields) and provides iteration helpers.
 */
export class Dbc {
    /** Total number of records in the dataset. */
    size!: number;
    /** Field descriptors as reported by dbffile. */
    fields!: FieldDescriptor[];

    /**
     * @param dbf Opened DBFFile instance.
     * @param io Input/output paths used for conversion and temp file storage.
     */
    private constructor(readonly dbf: DBFFile, private readonly io: { input: string, output: string}) {
        this.size = dbf.recordCount;
        this.fields = dbf.fields;

        /* if (process.platform !== 'linux') {
            OSNotSupported.exception();
        } */
    }

    /**
     * Loads a .dbc file, converting it to a temporary .dbf if necessary.
     * @param inputFile Full path to the .dbc file.
     * @returns A ready-to-use Dbc wrapper instance.
     */
    static async load(inputFile: string) {
        const inputFilePath = parse(inputFile);
        const io = {
            input: inputFile,
            output: `${ tmpdir() }/${ inputFilePath.name}${ inputFilePath.ext }`
        }
        
        try {
            statSync(io.output);
        } catch(error: any) {
            dbc2dbf(io);
        }

        let dbf = await DBFFile.open(io.output);
        return new Dbc(dbf, io)
    }

    /**
     * Reads a batch of records from the DBF.
     * @param count Optional number of records to read (defaults to all records).
     */
    async readBatch(count?: number): Promise<Record<string, unknown>[]> {
        return await this.dbf.readRecords(count || this.size)
    }

    /**
     * Deletes the temporary .dbf file created during conversion.
     */
    remove(): void {
        const inputFilePath = parse(this.io.input);
        unlink(this.io.output, (error: any) => {
            if(error) CanNotExcludeDbcFile.exception(`${ inputFilePath.name}${ inputFilePath.ext }`);
            console.log(`${ inputFilePath.name}${ inputFilePath.ext } excluded.`)
        });
    }

    /**
     * Iterates through each record asynchronously, invoking the callback.
     * @param callback Async function receiving each record.
     */
    async forEachRecords(callback: (record: any) => Promise<any>) {
        for await (let record of this.dbf) {
            await callback(record)
        }
    }
}

/**
 * Error thrown when the temporary .dbf file cannot be removed.
 */
export class CanNotExcludeDbcFile extends Error {
    constructor(file: string) {
        super(`A error occurred when deleting file: ${ file }`)
        this.name = 'CanNotExcludeDbcFile';
        this.cause = 'The file was already excluded.'
    }

    static exception(file: string) {
        throw new CanNotExcludeDbcFile(file)
    }
}

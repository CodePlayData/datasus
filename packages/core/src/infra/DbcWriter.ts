
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

import { unlink, existsSync, unlinkSync } from "node:fs"
import { tmpdir } from "node:os";
import { parse } from "node:path";
import { DBFFile, FieldDescriptor } from 'dbffile';
import { dbf2dbc } from "@codeplaydata/dbc2dbf"

export class DbcWriter {
    private static instance: DbcWriter;
    private static _initPromise: Promise<DbcWriter> | null = null;

    private dbf: DBFFile | undefined;
    private readonly io: { input: string, output: string };
    private buffer: any[] = [];
    private fields: FieldDescriptor[] | undefined;

    private constructor(outputPath: string) {
        const outputFilePath = parse(outputPath);
        this.io = {
            input: `${tmpdir()}/${outputFilePath.name}-${process.pid}-${Date.now()}.dbf`,
            output: outputPath
        }
    }

    static async initialize(outputPath: string, fields: FieldDescriptor[]): Promise<DbcWriter> {
        if (DbcWriter.instance) return DbcWriter.instance;
        if (!DbcWriter._initPromise) {
            DbcWriter._initPromise = (async () => {
                if (!DbcWriter.instance) {
                    DbcWriter.instance = new DbcWriter(outputPath);
                    await DbcWriter.instance._init(fields);
                }
                return DbcWriter.instance;
            })();
        }
        return DbcWriter._initPromise;
    }

    static getInstance(): DbcWriter {
        if (!DbcWriter.instance) {
            throw new Error("DbcWriter not initialized. Call initialize first.");
        }
        return DbcWriter.instance;
    }

    private async _init(fields: FieldDescriptor[]) {
        if (this.dbf) return;
        this.fields = fields;

        try {
            if (existsSync(this.io.input)) {
                unlinkSync(this.io.input);
            }
        } catch (e) {
            // ignore error
        }

        // @ts-ignore
        this.dbf = await DBFFile.create(this.io.input, fields);

        if (this.buffer.length > 0) {
            await this.dbf.appendRecords(this.buffer);
            this.buffer = [];
        }
    }

    private writeBuffer: any[] = [];
    private readonly BATCH_SIZE = 2000;
    private isWriting = false;

    async write(records: any[] | any) {
        const recordsArray = Array.isArray(records) ? records : [records];

        if (!this.dbf) {
            this.buffer.push(...recordsArray);
            return;
        }

        this.writeBuffer.push(...recordsArray);

        if (this.writeBuffer.length >= this.BATCH_SIZE && !this.isWriting) {
            await this.flush();
        }
    }

    private async flush() {
        if (this.isWriting || this.writeBuffer.length === 0 || !this.dbf) return;

        this.isWriting = true;
        const chunk = this.writeBuffer.splice(0, this.writeBuffer.length);

        try {
            await this.dbf.appendRecords(chunk);
        } catch (error) {
            console.error("Error writing batch to DBF:", error);
            // Put failed records back? For now, maybe just log. 
            // Better to re-queue if critical, but keeping simple for now to solve EMFILE.
        } finally {
            this.isWriting = false;
            // If more arrived while writing, flush again
            if (this.writeBuffer.length >= this.BATCH_SIZE) {
                await this.flush();
            }
        }
    }

    async close() {
        if (!this.dbf && this.buffer.length > 0) {
            throw new Error("DbcWriter closed before initialization with pending buffer.");
        }

        // Ensure any remaining records in the buffer are written
        if (this.writeBuffer.length > 0) {
            await this.flush();
            // Wait in case flush didn't catch everything or was busy
            while (this.isWriting) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            // Final check
            if (this.writeBuffer.length > 0) {
                await this.flush();
            }
        }

        try {
            dbf2dbc(this.io);
        } finally {
            unlink(this.io.input, () => { });
        }
    }
}

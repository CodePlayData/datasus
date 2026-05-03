// @filename: DbcWriter.ts

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


class DbcWriterInitializationError extends Error {
    private constructor(cause: unknown) {
        super(`An error occurred when initializing DbcWriter: ${(cause as Error)?.message || cause}`);
        this.name = 'DbcWriterInitializationError';
        this.cause = cause;
    }

    static async exception<T = void>(cause: unknown, fallbackFunction?: (error: DbcWriterInitializationError) => Promise<T>) {
        const error = new DbcWriterInitializationError(cause);
        if (fallbackFunction) {
            await fallbackFunction(error);
        } else {
            throw error;
        }
    }
}

class DbcWriterFlushError<R = Record<string, unknown>> extends Error {
    private constructor(public records: R[], cause: unknown) {
        super(`An error occurred when flushing records in DbcWriter: ${(cause as Error)?.message || cause}`);
        this.name = 'DbcWriterFlushError';
        this.cause = cause;
    }

    static async exception<R = Record<string, unknown>, F = void>(records: R[], cause: unknown, fallbackFunction?: (error: DbcWriterFlushError<R>, records: R[]) => Promise<F>) {
        const error = new DbcWriterFlushError<R>(records, cause);
        if (fallbackFunction) {
            await fallbackFunction(error, records);
        } else {
            throw error;
        }
    }
}

export class DbcWriter<T = Record<string, unknown>> {
    private static instance: DbcWriter<any>;
    private static _initPromise: Promise<DbcWriter<any>> | null = null;

    private dbf: DBFFile | undefined;
    private readonly io: { input: string, output: string };
    private buffer: T[] = [];
    private fields: FieldDescriptor[] | undefined;

    private constructor(
        outputPath: string,
        private readonly onErrorInit?: (error: DbcWriterInitializationError) => Promise<unknown>,
        private readonly onErrorFlush?: (error: DbcWriterFlushError<T>, chunk: T[]) => Promise<unknown>
    ) {
        const outputFilePath = parse(outputPath);
        this.io = {
            input: `${tmpdir()}/${outputFilePath.name}-${process.pid}-${Date.now()}.dbf`,
            output: outputPath
        }
    }

    static async initialize<TRec = Record<string, unknown>, TFallbackInit = void, TFallbackFlush = void>(
        outputPath: string,
        fields: FieldDescriptor[],
        onErrorInit?: (error: DbcWriterInitializationError) => Promise<TFallbackInit>,
        onErrorFlush?: (error: DbcWriterFlushError<TRec>, chunk: TRec[]) => Promise<TFallbackFlush>
    ): Promise<DbcWriter<TRec>> {
        if (DbcWriter.instance) return DbcWriter.instance as DbcWriter<TRec>;
        if (!DbcWriter._initPromise) {
            DbcWriter._initPromise = (async () => {
                if (!DbcWriter.instance) {
                    DbcWriter.instance = new DbcWriter<TRec>(outputPath, onErrorInit, onErrorFlush);
                    await DbcWriter.instance._init(fields);
                }
                return DbcWriter.instance;
            })();
        }
        return DbcWriter._initPromise as Promise<DbcWriter<TRec>>;
    }

    static getInstance<TRec = Record<string, unknown>>(): DbcWriter<TRec> {
        if (!DbcWriter.instance) {
            throw new Error("DbcWriter not initialized. Call initialize first.");
        }
        return DbcWriter.instance as DbcWriter<TRec>;
    }

    private async _init(fields: FieldDescriptor[]) {
        if (this.dbf) return;
        this.fields = fields;

        try {
            if (existsSync(this.io.input)) {
                unlinkSync(this.io.input);
            }
        } catch (e) {
            await DbcWriterInitializationError.exception(e, this.onErrorInit);
        }

        try {
            // @ts-ignore
            this.dbf = await DBFFile.create(this.io.input, fields);

            if (this.buffer.length > 0) {
                await this.dbf.appendRecords(this.buffer);
                this.buffer = [];
            }
        } catch (e) {
            await DbcWriterInitializationError.exception(e, this.onErrorInit);
        }
    }

    private writeBuffer: T[] = [];
    private readonly BATCH_SIZE = 2000;
    private isWriting = false;

    async write(records: T[] | T) {
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
            await this.dbf.appendRecords(chunk as Record<string, unknown>[]);
        } catch (error: unknown) {
            await DbcWriterFlushError.exception(chunk, error, this.onErrorFlush);
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

// @filename: DbcRecordProvider.ts

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

import { RecordProvider, DbcReader } from "@codeplaydata/datasus-core";

export class DbcRecordProvider implements RecordProvider {
    private reader: DbcReader | undefined;

    constructor(private readonly filePath: string) { }

    async subset(config: any, parser?: any): Promise<void> {
        // No-op for now. 
        console.warn("Subset configuration provided but DbcRecordProvider does not support subsetting yet. All records will be processed.");
    }

    async exec(callback: (record: any) => Promise<void>): Promise<void> {
        this.reader = await DbcReader.load(this.filePath);
        try {
            await this.reader.forEachRecords(async (record) => {
                await callback(record);
            });
        } finally {
            this.reader.remove();
        }
    }
}

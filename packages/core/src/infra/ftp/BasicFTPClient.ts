// @filename: BasicFTPClient.ts

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

import {Client as FtpClient} from "basic-ftp/dist/Client.js";
import {statSync} from "node:fs";
import {FTPClient} from "./FTPClient.js";
class CouldNotConnect extends Error {
    constructor(message?: string) {
        super(message ?? `Could not connect to the remote host.`);
        this.name = 'CouldNotConnect';
        this.cause = 'The provided address must be offline or unavailable.';
    }

    static async exception<T = Record<string, unknown>>(
        fallback?: (error: Error, host?: string) => Promise<T> | T | void, 
        host?: string
    ): Promise<T | void> {
        const error = new CouldNotConnect();
        if (fallback) {
            return await fallback(error, host);
        } else {
            throw error;
        }
    }
}

export class BasicFTPClient implements FTPClient {
    private constructor(readonly client: FtpClient) {
    }

    static async connect<T = Record<string, unknown>>(
        host: string,
        onError?: (error: Error, host?: string) => Promise<T> | T | void
    ): Promise<BasicFTPClient | T | void> {
        const client = new FtpClient();
        try {
            await client.access({
                host: host
            });
            return new BasicFTPClient(client);
        } catch (error) {
            return await CouldNotConnect.exception<T>(onError, host);
        }
    }

    async list(path: string = '/') {
        return await this.client.list(path)
    }

    async download(dest: string, from: string) {
        try {
            statSync(dest);
            return
        } catch(error: any) {
            return await this.client.downloadTo(dest, from)
        }
    }

    close() {
        this.client.close()
    }
}

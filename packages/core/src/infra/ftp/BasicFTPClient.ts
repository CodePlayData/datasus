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
import {CouldNotConnect} from "./CouldNotConnect.js";

export class BasicFTPClient implements FTPClient {
    private constructor(readonly client: FtpClient) {
    }

    static async connect(host: string) {
        const client = new FtpClient();
        try {
            await client.access({
                host: host
            });
            return new BasicFTPClient(client)
        } catch (error) {
            CouldNotConnect.exception()
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

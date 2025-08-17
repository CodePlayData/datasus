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

/**
 * FTP client based on the basic-ftp library.
 *
 * This minimal implementation wraps the library client and provides a list and
 * download operations, plus a factory method to establish a connection.
 */
export class BasicFTPClient implements FTPClient {
    /**
     * Private constructor. Use the static connect method to create instances.
     * @param client An already authenticated/accessible basic-ftp client instance.
     */
    private constructor(readonly client: FtpClient) {
    }

    /**
     * Establishes a connection to the given FTP host.
     * @param host FTP server address (e.g., ftp.datasus.gov.br).
     * @returns An instance of BasicFTPClient on success.
     * @throws CouldNotConnect when the connection cannot be established.
     */
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

    /**
     * Lists entries from an FTP directory.
     * @param path Server path. Defaults to '/'.
     * @returns The list of entries returned by the basic-ftp library.
     */
    async list(path: string = '/') {
        return await this.client.list(path)
    }

    /**
     * Downloads a remote file.
     * If the destination file already exists, it will not be downloaded again.
     * @param dest Local full path for the destination file.
     * @param from Remote full path on the FTP server (source).
     * @returns A Promise resolved when the download completes, or undefined if the file already exists.
     */
    async download(dest: string, from: string) {
        try {
            statSync(dest);
            return
        } catch(error: any) {
            return await this.client.downloadTo(dest, from)
        }
    }

    /**
     * Closes the connection with the FTP server.
     */
    close() {
        this.client.close()
    }
}

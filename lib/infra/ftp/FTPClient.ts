// @filename: FTPClient.ts

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

/**
 * Minimal FTP client contract used by the infrastructure layer.
 *
 * Any implementation (e.g., based on basic-ftp) must provide methods to:
 * - list directory entries on the remote server;
 * - download a file from the remote server to a local destination;
 * - close the connection/resources.
 */
export interface FTPClient {
    /**
     * Lists entries from a remote path.
     * @param params Implementation‑specific parameters (e.g., path: string = '/').
     * @returns A list/array as returned by the concrete FTP client.
     */
    list(...params: any[]): any
    /**
     * Downloads a remote file to a local destination.
     * @param params Implementation‑specific parameters (e.g., dest: string, from: string).
     * @returns A promise or result provided by the concrete client.
     */
    download(...params: any[]): any
    /**
     * Closes the FTP connection and frees resources.
     */
    close(): void
}
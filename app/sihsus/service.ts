// @filename: service.ts

/*
 *     Copyright 2026 Pedro Paulo Teixeira dos Santos
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

import {BasicFTPClient} from "@codeplaydata/datasus-core";
import {SIHSUSFTPGateway} from "./src/SIHSUSFTPGateway.js";

const MAX_CONCURRENT_PROCESSES = 4;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
const gateway = await SIHSUSFTPGateway.getInstanceOf(ftpClient!);

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);


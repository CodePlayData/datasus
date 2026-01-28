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
import {SINANFTPGateway} from "./src/SINANFTPGateway.js";
import {SINANSubset} from "./src/SINANSubset.js";
import {SINANService} from "./src/SINANService.js";
import {SINANParser} from "./src/SINANParser.js";
import {SINANBasicParser} from "./src/SINANBasicParser.js";

const MAX_CONCURRENT_PROCESSES = 4;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
const gateway = await SINANFTPGateway.getInstanceOf(ftpClient!);

export const MockedDictionary = new Map<string, (value: any) => any>([
    ['', (value: string) => undefined]
]);

export const subset: SINANSubset = { src: 'TUBE', year: [2024] };
export const parser: SINANParser = SINANBasicParser.instanceOf(MockedDictionary);
export const sinan = SINANService.init(gateway, undefined, MAX_CONCURRENT_PROCESSES, "E:/DatasusFiles/")
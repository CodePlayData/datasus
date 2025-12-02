// @filename: SIAFTPGateway.ts

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


import { DATASUSGenericFTPGateway, FTPClient } from "../../../lib/index.js";
import { SIASubset } from "./SIASubset.js";

export class SIAFTPGateway extends DATASUSGenericFTPGateway<SIASubset> {
    private constructor(ftp: FTPClient) {
        super(ftp, '/dissemin/publicos/SIASUS/200801_/Dados/')
    }

    static async getInstanceOf(ftp: FTPClient) {
        return new SIAFTPGateway(ftp)
    }
}

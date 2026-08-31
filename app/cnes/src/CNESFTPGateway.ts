// @filename: CNESFTPGateway.ts

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

import { DATASUSFTPGateway, StatePeriodStrategy, SubdirectoryPathPlugin, FTPClient } from "@codeplaydata/datasus-core";
import { CNESSubset } from "./CNESSubset.js";

export class CNESFTPGateway extends DATASUSFTPGateway<CNESSubset> {
    constructor(client: FTPClient, PATH: string = '/dissemin/publicos/CNES/200508_/Dados/') {
        super(client, PATH, new StatePeriodStrategy(), [new SubdirectoryPathPlugin()]);
    }
}

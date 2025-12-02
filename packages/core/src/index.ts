// @filename: index.ts

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

import { Records } from "./core/Records.js";
import { Subset } from "./core/Subset.js";
import { BasicFTPClient } from "./infra/ftp/BasicFTPClient.js";
import { FTPClient } from "./infra/ftp/FTPClient.js";
import { DATASUSGateway } from "./interface/gateway/DATASUSGateway.js";
import { Parser } from "./interface/utils/Parser.js";
import { JobOrchestrator } from "./infra/job/JobOrchestrator.js";
import { DATASUSGenericFTPGateway } from "./interface/gateway/DATASUSGenericFTPGateway.js";
import { Datasource } from "./core/Datasource.js";
import { Pipeline } from "./interface/pipeline/Pipeline.js";
import { Criteria } from "./interface/criteria/Criteria.js";
import { StringCriteria } from "./interface/criteria/StringCriteria.js";
import { ArrayCriteria } from "./interface/criteria/ArrayCriteria.js";

export {
    DATASUSGenericFTPGateway,
    JobOrchestrator,
    Parser,
    DATASUSGateway,
    Records,
    Subset,
    Datasource,
    BasicFTPClient,
    FTPClient,
    Criteria,
    StringCriteria,
    ArrayCriteria,
    Pipeline
}

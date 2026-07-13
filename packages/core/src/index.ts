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

import type { Records } from "./core/Records.js";
import type { Subset } from "./core/Subset.js";
import type { FTPClient } from "./infra/ftp/FTPClient.js";
import type { DATASUSGateway } from "./interface/gateway/DATASUSGateway.js";
import type { Parser } from "./interface/utils/Parser.js";
import type { NamingStrategy } from "./interface/gateway/NamingStrategy.js";
import type { Pipeline } from "./interface/pipeline/Pipeline.js";
import type { Datasource } from "./core/Datasource.js";

import { BasicFTPClient } from "./infra/ftp/BasicFTPClient.js";
import { JobOrchestrator } from "./infra/job/JobOrchestrator.js";
import { DATASUSBaseFTPGateway } from "./interface/gateway/DATASUSBaseFTPGateway.js";
import { DATASUSFTPGateway } from "./interface/gateway/DATASUSFTPGateway.js";
import { StatePeriodStrategy } from "./interface/gateway/strategies/StatePeriodStrategy.js";
import { CountryYearStrategy } from "./interface/gateway/strategies/CountryYearStrategy.js";
import { StateYearStrategy } from "./interface/gateway/strategies/StateYearStrategy.js";
import { Criteria } from "./interface/criteria/Criteria.js";
import { StringCriteria } from "./interface/criteria/StringCriteria.js";
import { ArrayCriteria } from "./interface/criteria/ArrayCriteria.js";
import { DbcReader } from "./infra/dbc/DbcReader.js";
import { DbcWriter } from "./infra/dbc/DbcWriter.js";

export {
    DATASUSBaseFTPGateway,
    DATASUSFTPGateway,
    StatePeriodStrategy,
    CountryYearStrategy,
    StateYearStrategy,
    JobOrchestrator,
    BasicFTPClient,
    Criteria,
    StringCriteria,
    ArrayCriteria,
    DbcReader,
    DbcWriter,
};

export type {
    Records,
    Subset,
    FTPClient,
    DATASUSGateway,
    Parser,
    NamingStrategy,
    Pipeline,
    Datasource,
};

// @filename: JobConfig.ts

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

import { CriteriaObject } from "../../interface/criteria/CriteriaObject.js";
import { Parser } from "../../interface/utils/Parser.js";
import { Records } from "../../core/Records.js";

/**
 * Representa as configurações de um Job no DataSUS Core.
 * Este objeto é imutável após a criação.
 */
export interface JobConfig {
    /** Caminho base para salvamento de arquivos. */
    readonly dataPath: string;
    /** Número máximo de processos paralelos. */
    readonly concurrency: number;
    /** Se deve exibir logs e resumos no stdout. */
    readonly verbose: boolean;
    /** Filtros aplicados durante o processamento. */
    readonly filters?: CriteriaObject[];
    /** Parser opcional para transformação de registros. */
    readonly parser?: Parser<Records>;
    /** Caminho customizado para o script do worker. */
    readonly jobScript?: string;
}

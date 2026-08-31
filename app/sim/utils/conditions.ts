// @filename: conditions.ts

/*
 *     Copyright 2026 Pedro Paulo Teixeira dos Santos

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

import { ICD10 } from "@codeplaydata/datasus-core";

const icds = await ICD10.load();

export const respiratoriasECovid: string[] = icds.clear().block('J').block('U', { start: '071', end: '072' }).list;
export const tuberculose: string[] = icds.clear().block('A', { start: '15', end: '19' }).list;

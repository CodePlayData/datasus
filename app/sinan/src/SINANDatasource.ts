// @filename: SINANDatasource.ts

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

import {Datasource} from "@codeplaydata/datasus-core";

export type SINANDatasource = Datasource & 'ACBI' | 'ACGR' | 'AIDA' | 'AIDC' | 'ANIM' | 'ANTR' | 'BOTU' | 'CANC' | 'CHAG' |
    'CHIK' | 'COLE' | 'COQU' | 'DCRJ' | 'DENG' | 'DERM' | 'DIFT' | 'ESPO' | 'ESQU' | 'EXAN' | 'FMAC' | 'FTIF' | 'HANS' | 'HANT' |
    'HEPA' | 'HIVA' | 'HIVC' | 'HIVE' | 'HIVG' | 'IEXO' | 'INFL' | 'LEIV' | 'LEPT' | 'LERD' | 'LTAN' | 'MALA' | 'MENI' | 'MENT' |
    'NTRA' | 'PAIR' | 'PEST' | 'PFAN' | 'PNEU' | 'RAIV' | 'ROTA' | 'SDTA' | 'SIFA' | 'SIFC' | 'SIFG' | 'SRC' | 'TETA' | 'TETN' |
    'TOXC' | 'TOXG' | 'TRAC' | 'TUBE' | 'VARC' | 'VIOL' | 'ZIKA'
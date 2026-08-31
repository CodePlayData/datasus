// @filename: BIRecord.ts

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

export type BIRecord = {
    CODUNI: string;
    GESTAO: string;
    CONDIC: string;
    UFMUN: string;
    TPUPS: string;
    TIPPRE: string;
    MN_IND: string;
    CNPJCPF: string;
    CNPJMNT: string;
    CNPJ_CC: string;
    DT_PROCESS: string;
    DT_ATEND: string;
    PROC_ID: string;
    TPFIN: string;
    SUBFIN: string;
    COMPLEX: string;
    AUTORIZ: string;
    CNSPROF: string;
    CBOPROF: string;
    CIDPRI: string;
    CATEND: string;
    CNS_PAC: string;
    DTNASC: string;
    TPIDADEPAC: string;
    IDADEPAC: string;
    SEXOPAC: string;
    RACACOR: string;
    MUNPAC: string;
    QT_APRES: string | number;
    QT_APROV: string | number;
    VL_APRES: string | number;
    VL_APROV: string | number;
    UFDIF: string;
    MNDIF: string;
    ETNIA: string;
    NAT_JUR: string;
    [key: string]: any;
};

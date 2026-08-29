// @filename: config.ts

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

export const MAX_CONCURRENT_PROCESSES = Number(process.env.CONCURRENCY) || 4;
export const FTP_HOST = process.env.FTP_HOST || 'ftp.datasus.gov.br';
export const DATA_PATH = process.env.DATA_PATH || './data';
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

export const FTP_PATHS = {
    CNES: '/dissemin/publicos/CNES/200508_/Dados/',
    SIASUS: '/dissemin/publicos/SIASUS/200801_/Dados/',
    SIHSUS: '/dissemin/publicos/SIHSUS/200801_/Dados/',
    SIM: '/dissemin/publicos/SIM/CID10/DORES/',
    SINAN: '/dissemin/publicos/SINAN/DADOS/PRELIM/',
    SINASC: '/dissemin/publicos/SINASC/1996_/Dados/DNRES/',
} as const;

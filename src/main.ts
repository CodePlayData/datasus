// @filename: main.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos

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

import {BasicFTPClient} from "./infra/ftp/BasicFTPClient.js";
import {JobOrchestrator} from "./infra/job/JobOrchestrator.js";
import {Subset} from "./core/Subset.js";
import {DATASUSGateway} from "./interface/gateway/DATASUSGateway.js";
import {Parser} from "./interface/utils/Parser.js";
import {Records} from "./core/Records.js";
import {DATASUSGenericFTPGateway} from "./interface/gateway/DATASUSGenericFTPGateway.js";
import {FTPClient} from "./infra/ftp/FTPClient.js";

type DataSource = {};
type SIADatasource = DataSource & 'AB' | 'ABO' | 'ACF' | 'AD' | 'AM' | 'AN' | 'AQ' | 'AR' | 'ATD' | 'PA' | 'PS' | 'SAD' | 'BI'
enum StateCode {
    'Distrito Federal' = '53',
    'Rio de Janeiro' = '33',
    'Sao Paulo' = '35',
    'Acre' = '12',
    'Alagoas' = '27',
    'Amazonas' = '13',
    'Amapa' = '16',
    'Bahia' = '29',
    'Ceara' = '23',
    'Espirito Santo' = '32',
    'Goais' = '52',
    'Maranhao' = '21',
    'Minas Gerais' = '31',
    'Mato Grosso do Sul' = '50',
    'Mato Grosso' = '51',
    'Para' = '15',
    'Paraiba' = '25',
    'Pernambuco' = '26',
    'Piaui' = '22',
    'Parana' = '41',
    'Rio Grande do Norte' = '24',
    'Rondonia' = '11',
    'Roraima' = '14',
    'Rio Grande do Sul' = '43',
    'Santa Catarina' = '42',
    'Sergipe' = '28',
    'Tocantins' = '17'
}
type State = keyof typeof StateCode;
type Period = {
    start: {
        year: number,
        month: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12'
    },
    end: {
        year: number,
        month: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12'
    }
};
type SIASubset = Subset & { src: SIADatasource } | { src: SIADatasource, states: State[] } | { src: SIADatasource, states: State[], period: Period };
interface SIAGateway extends DATASUSGateway<SIASubset>{}
interface SIAParser extends Parser<Records>{}
class SIASUSService extends JobOrchestrator<SIASubset, SIADatasource, SIAGateway, SIAParser>{}
class SIAFTPGateway extends DATASUSGenericFTPGateway<SIASubset>{
    private constructor(ftp: FTPClient){
        super(ftp, '/dissemin/publicos/SIASUS/200801_/Dados/')
    }

    static async getInstanceOf(ftp: FTPClient) {
        return new SIAFTPGateway(ftp)
    }
}
class SIABasicParser implements SIAParser {
    record: Records | undefined

    private constructor(readonly dictionary: Map<string, (value: any) => any>) {
    }

    static instanceOf(dictionary: Map<string, (value: any) => any>) {
        return new SIABasicParser(dictionary);
    }

    parse(record: Records): Records {
        this.record = record;
        this.record.TPFIN = this.record.TPFIN + this.record.SUBFIN;
        delete this.record.SUBFIN

        for (const [field, value] of Object.entries(this.record)) {
            const parser = this.dictionary.get(field);
            if (parser && value !== undefined) {
                (this.record as any)[field] = parser(value);
            }
        }

        return this.record;
    }
}

const MAX_CONCURRENT_PROCESSES = 5;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
const gateway = await SIAFTPGateway.getInstanceOf(ftpClient!);
const BIDictionary = new Map<string, (value: any) => any> ([
    ['CNS_PAC', (value: string) => {
        const cleanStr = value.trim();
        if (!cleanStr) return '';
        return Array.from(cleanStr)
            .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }]
]);
const filters = new Map<string, string | string[]>();
// filters.set('MUNPAC', "330455");

const sia = SIASUSService.init(
    gateway,
    filters,
    undefined,
    'stdout',
    MAX_CONCURRENT_PROCESSES
);

const parser = SIABasicParser.instanceOf(BIDictionary);

await sia.subset({
    src: 'BI',
    states: ['RJ'],
    period: {
        start: {
            year: 2022,
            month: '03'
        },
        end: {
            year: 2022,
            month: '03'
        }
    }
}, parser)

await sia.exec('./dist/infra/job/job.js').finally(
    () => {
        console.log('Done!')
        process.exit(0)
    }
);

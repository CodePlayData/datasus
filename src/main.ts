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
import {SIAFTPGateway} from "./app/siasus/SIAFTPGateway.js";
import {SIASUSService} from "./app/siasus/SIASUSService.js";
import {filters} from "./app/siasus/config/filters.js";
import {SIABasicParser} from "./app/siasus/SIABasicParser.js";
import {dictionary} from "./app/siasus/config/dictionary.js";

const MAX_CONCURRENT_PROCESSES = 5;
const FTP_HOST = 'ftp.datasus.gov.br';
const ftpClient = await BasicFTPClient.connect(FTP_HOST);
const gateway = await SIAFTPGateway.getInstanceOf(ftpClient!);

const sia = SIASUSService.init(
    gateway,
    filters,
    (msg: any) => console.log(msg),
    'file',
    MAX_CONCURRENT_PROCESSES
);

const parser = SIABasicParser.instanceOf(dictionary);

await sia.subset({
    src: 'BI',
    states: ['RJ'],
    period: {
        start: {
            year: 2022,
            month: '04'
        },
        end: {
            year: 2022,
            month: '04'
        }
    }
}, parser)

await sia.exec('./dist/infra/job/job.js').finally(
    () => {
        console.log('Done!')
        process.exit(0)
    }
);

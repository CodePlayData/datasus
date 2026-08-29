// @filename: sinasc_pipeline.test.ts

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

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync } from 'node:fs';
import { sinasc } from '../../../../app/sinasc/service.js';
import { SINASCSubset } from '../../../../app/sinasc/src/SINASCSubset.js';

if (!existsSync('./data')) {
    mkdirSync('./data');
}

describe('E2E: Pipeline SINASC (Nascidos Vivos)', () => {
    it('deve listar, baixar e processar registros do SINASC (Acre 2024)', async () => {
        const subset: SINASCSubset = {
            src: 'DN',
            states: ['AC'],
            year: [2024]
        };

        await sinasc.subset(subset);

        assert.ok(sinasc.files.length > 0, 'Deve ter listado pelo menos 1 arquivo DNAC2024');
        assert.ok(
            sinasc.files.some(f => f.includes('DNAC2024')),
            'DNAC2024.dbc deve estar na lista de arquivos'
        );

        let receivedMetadata = false;
        let receivedRecords = 0;

        await sinasc.exec(async (message: any) => {
            if (message && message.type === 'metadata') {
                receivedMetadata = true;
                assert.ok(message.fields.length > 0, 'Metadata deve conter campos do DBF');
                return;
            }

            receivedRecords++;
        });

        assert.ok(receivedMetadata, 'Deve ter recebido metadata');
        assert.ok(receivedRecords > 0, `Deve ter extraído registros de nascidos vivos (total: ${receivedRecords})`);
    });
});

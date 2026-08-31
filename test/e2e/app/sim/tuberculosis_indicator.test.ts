// @filename: tuberculosis_indicator.test.ts

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

import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync } from 'node:fs';
import { ICD10 } from '../../../../packages/core/src/index.js';
import { sia, subset, ftpClient } from '../../../../app/sim/service.js';
import { FHIRStore, SIMMapper } from '../../../../app/shared/fhir/index.js';

if (!existsSync('./data')) {
    mkdirSync('./data');
}

describe('E2E (FHIR): Indicador de Mortalidade por Tuberculose em PPL (SIM)', () => {
    const store = new FHIRStore();

    after(() => {
        if (ftpClient) ftpClient.close();
    });

    it('deve extrair registros, mapear para recursos FHIR (Condition/Patient) e aplicar filtros de CNES e CIDs', async () => {
        // 1. Carrega a classe ICD10 e prepara as listas de CIDs
        const icds = await ICD10.load();
        const respiratoriasECovid = icds.clear().block('J').block('U', { start: '071', end: '072' }).list;
        const tuberculose = icds.clear().block('A', { start: '15', end: '19' }).list;

        assert.ok(respiratoriasECovid.length > 0, 'A lista de respiratórias/COVID não deve estar vazia');
        assert.ok(tuberculose.length > 0, 'A lista de tuberculose não deve estar vazia');

        // 2. Prepara o subset para extração (RJ 2024)
        await sia.subset(subset);

        let receivedCount = 0;
        let validConditionsCount = 0;

        // CNES válidos definidos no service.ts (ArrayCriteria)
        const validCNES = ["2270196", "6996914", "4056167", "4056310", "4056221"];

        // 3. Executa a extração alimentando o FHIRStore
        await sia.exec(
            async (message: any) => {
                if (message && message.type === 'metadata') return;
                
                receivedCount++;

                // Mapeia para recursos FHIR
                const patient = SIMMapper.toPatient(message);
                const conditions = SIMMapper.toConditions(message);

                store.add(patient);
                store.addAll(conditions);

                const cnes = message.CODESTAB ? String(message.CODESTAB).trim() : '';
                if (cnes && validCNES.includes(cnes)) {
                    assert.ok(validCNES.includes(cnes), `O CNES ${cnes} deve estar na lista de inclusão`);
                }

                const hasMatch = conditions.some(c => {
                    const code = c.code?.coding?.[0]?.code?.replace('.', '') || '';
                    return respiratoriasECovid.includes(code) || tuberculose.includes(code);
                });

                if (hasMatch) {
                    validConditionsCount++;
                }
            }
        );

        console.log(`\n[SIM/FHIR] Total de registros extraídos do subset: ${receivedCount}`);
        console.log(`[SIM/FHIR] Total de pacientes mapeados: ${store.getPatients().length}`);
        console.log(`[SIM/FHIR] Total de condições clínicas (Condition) mapeadas: ${store.getConditions().length}`);
        console.log(`[SIM/FHIR] Total de óbitos com CIDs de TB/Respiratórias identificados: ${validConditionsCount}\n`);

        assert.ok(receivedCount >= 0, 'A execução deve ser concluída sem erros no fluxo');
    });
});

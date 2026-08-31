// @filename: SIMMapper.ts

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

import { Condition, Observation, Patient } from "../types.js";

export class SIMMapper {
    private static sequence = 0;

    /**
     * Mapeia um registro de óbito do SIM (DO) para Condition FHIR (Causa Básica / Linhas).
     */
    static toConditions(record: any): Condition[] {
        const conditions: Condition[] = [];
        const numDo = String(record.NUMERODO || ++this.sequence).trim();
        const causabas = String(record.CAUSABAS || '').trim();
        const codestab = String(record.CODESTAB || '').trim();

        if (causabas) {
            conditions.push({
                resourceType: 'Condition',
                id: `cond-sim-cb-${numDo}`,
                clinicalStatus: {
                    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved' }]
                },
                verificationStatus: {
                    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }]
                },
                category: [
                    {
                        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'cause-of-death', display: 'Causa Básica de Óbito' }]
                    }
                ],
                code: {
                    coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: causabas }]
                },
                subject: { reference: `Patient/sim-${numDo}` },
                recordedDate: record.DTOBITO ? `${record.DTOBITO.slice(4, 8)}-${record.DTOBITO.slice(2, 4)}-${record.DTOBITO.slice(0, 2)}` : undefined,
                extension: codestab ? [
                    {
                        url: 'http://datasus.gov.br/fhir/StructureDefinition/establishment-cnes',
                        valueString: codestab
                    }
                ] : undefined
            });
        }

        const linhas = [record.LINHAA, record.LINHAB, record.LINHAC, record.LINHAD, record.LINHAII]
            .filter(Boolean)
            .map(l => String(l).trim().replace('*', ''))
            .filter(l => l.length > 0);

        linhas.forEach((linha, idx) => {
            conditions.push({
                resourceType: 'Condition',
                id: `cond-sim-linha-${numDo}-${idx}`,
                clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved' }] },
                code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: linha }] },
                subject: { reference: `Patient/sim-${numDo}` }
            });
        });

        return conditions;
    }

    /**
     * Mapeia o paciente falecido para Patient FHIR com deceasedDateTime.
     */
    static toPatient(record: any): Patient {
        const numDo = String(record.NUMERODO || ++this.sequence).trim();
        const sexo = record.SEXO === '1' || record.SEXO === 'M' ? 'male' : record.SEXO === '2' || record.SEXO === 'F' ? 'female' : 'unknown';

        return {
            resourceType: 'Patient',
            id: `sim-${numDo}`,
            gender: sexo,
            deceasedBoolean: true,
            deceasedDateTime: record.DTOBITO ? `${record.DTOBITO.slice(4, 8)}-${record.DTOBITO.slice(2, 4)}-${record.DTOBITO.slice(0, 2)}` : undefined
        };
    }
}

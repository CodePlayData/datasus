// @filename: SINASCMapper.ts

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

import { Patient, Encounter, Observation } from "../types.js";

export class SINASCMapper {
    private static sequence = 0;

    /**
     * Mapeia um registro de Nascido Vivo do SINASC (DN) para Patient FHIR.
     */
    static toPatient(record: any): Patient {
        const numDn = String(record.NUMERODN || ++this.sequence).trim();
        const sexo = record.SEXO === '1' || record.SEXO === 'M' ? 'male' : record.SEXO === '2' || record.SEXO === 'F' ? 'female' : 'unknown';
        const dtNasc = String(record.DTNASC || '').trim();

        return {
            resourceType: 'Patient',
            id: `sinasc-${numDn}`,
            gender: sexo,
            birthDate: dtNasc && dtNasc.length === 8 ? `${dtNasc.slice(4, 8)}-${dtNasc.slice(2, 4)}-${dtNasc.slice(0, 2)}` : undefined
        };
    }

    /**
     * Mapeia os dados do pré-natal e parto para Encounter FHIR.
     */
    static toPrenatalEncounter(record: any): Encounter {
        const numDn = String(record.NUMERODN || this.sequence).trim();
        const codestab = String(record.CODESTAB || '').trim();

        return {
            resourceType: 'Encounter',
            id: `enc-sinasc-${numDn}`,
            status: 'finished',
            class: {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                code: 'IMP',
                display: 'Inpatient Encounter'
            },
            subject: { reference: `Patient/sinasc-${numDn}` },
            serviceProvider: codestab ? { reference: `Organization/${codestab}` } : undefined,
            extension: [
                {
                    url: 'http://datasus.gov.br/fhir/StructureDefinition/prenatal-visits-count',
                    valueInteger: Number(record.CONSULTAS || 0)
                },
                {
                    url: 'http://datasus.gov.br/fhir/StructureDefinition/prenatal-start-month',
                    valueInteger: Number(record.MESPRENAT || 0)
                }
            ]
        };
    }
}

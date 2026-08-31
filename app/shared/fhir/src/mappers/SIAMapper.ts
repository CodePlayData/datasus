// @filename: SIAMapper.ts

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

import { Encounter, Procedure } from "../types.js";

export class SIAMapper {
    private static sequence = 0;

    /**
     * Mapeia um registro de produção ambulatorial do SIASUS (PA) para um Encounter FHIR.
     */
    static toEncounter(record: any, period?: string): Encounter {
        const id = `enc-sia-${++this.sequence}`;
        const cnes = String(record.PA_CODUNI || record.CNES || '').trim();
        const ine = String(record.PA_INE || record.PA_EQUIPE || record.IDEQUIPE || '').trim();
        const cmp = String(record.PA_CMP || period || '').trim();
        const patientDoc = String(record.PA_DOCORIG || record.CNS_PAC || `anon-${this.sequence}`).trim();
        const cidPri = String(record.PA_CIDPRI || '').trim();

        const encounter: Encounter = {
            resourceType: 'Encounter',
            id: id,
            status: 'finished',
            class: {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                code: 'AMB',
                display: 'Ambulatory'
            },
            subject: {
                reference: `Patient/${patientDoc}`
            },
            serviceProvider: cnes ? {
                reference: `Organization/${cnes}`
            } : undefined,
            participant: ine ? [
                {
                    individual: {
                        reference: `CareTeam/${ine}`
                    }
                }
            ] : undefined,
            period: {
                start: cmp ? `${cmp.slice(0, 4)}-${cmp.slice(4, 6)}-01` : undefined
            },
            reasonCode: cidPri ? [
                {
                    coding: [
                        {
                            system: 'http://hl7.org/fhir/sid/icd-10',
                            code: cidPri
                        }
                    ]
                }
            ] : undefined
        };

        return encounter;
    }

    /**
     * Mapeia um procedimento ambulatorial (código SIGTAP) para Procedure FHIR.
     */
    static toProcedure(record: any, encounterId?: string): Procedure {
        const id = `proc-sia-${this.sequence}`;
        const procId = String(record.PA_PROC_ID || record.PROC_ID || '').trim();
        const patientDoc = String(record.PA_DOCORIG || record.CNS_PAC || `anon-${this.sequence}`).trim();

        const procedure: Procedure = {
            resourceType: 'Procedure',
            id: id,
            status: 'completed',
            code: {
                coding: [
                    {
                        system: 'http://sigtap.datasus.gov.br/procedimento',
                        code: procId
                    }
                ]
            },
            subject: {
                reference: `Patient/${patientDoc}`
            },
            encounter: encounterId ? {
                reference: `Encounter/${encounterId}`
            } : undefined
        };

        return procedure;
    }
}

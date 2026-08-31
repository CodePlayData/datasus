// @filename: CNESMapper.ts

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

import { Organization, CareTeam } from "../types.js";

export class CNESMapper {
    private static readonly PRISON_KEYWORDS = [
        'PENAL',
        'PENITENC',
        'PRESIDIO',
        'SEAP',
        'GERICINO',
        'CADEIA',
        'INSTITUTO PENAL',
        'CUSTODIA',
        'BENFICA',
        'ARY FRANCO',
        'BANGU',
        'PIRAGIBE',
        'PRISIONAL',
        'EAPP',
        'ATENCAO PRIMARIA PRISIONAL'
    ];

    public static readonly KNOWN_PRISON_CNES = new Set<string>([
        '2270196', '6996914', '4056167', '4056310', '4056221',
        '7637853', '7637861', '7637888', '7637896', '7637918', '7637926'
    ]);

    /**
     * Mapeia um registro de estabelecimento CNES (STRJ) para o recurso FHIR Organization.
     */
    static toOrganization(record: any, period?: string): Organization {
        const cnes = String(record.CNES || record.CO_UNIDADE || record.COD_CNES || '').trim();
        const tpUnid = String(record.TP_UNID || record.TPUNID || '').trim();
        const codUfMun = String(record.CODUFMUN || record.CO_MUNICIPIO || '').trim();
        const name = String(record.NO_FANTAS || record.RAZAO_SO || record.NOME_ESTAB || `Estabelecimento CNES ${cnes}`).trim();

        const isPrison = tpUnid === '83' ||
            this.KNOWN_PRISON_CNES.has(cnes) ||
            this.PRISON_KEYWORDS.some(kw => name.toUpperCase().includes(kw));

        const org: Organization = {
            resourceType: 'Organization',
            id: cnes,
            identifier: [
                {
                    system: 'http://cnes.datasus.gov.br/cnes',
                    value: cnes
                }
            ],
            name: name,
            type: [
                {
                    coding: [
                        {
                            system: 'http://cnes.datasus.gov.br/tp_unid',
                            code: tpUnid,
                            display: isPrison ? 'Polo de Atenção à Saúde no Sistema Prisional' : `Tipo de Unidade ${tpUnid}`
                        }
                    ]
                }
            ],
            address: [
                {
                    state: 'RJ',
                    city: codUfMun
                }
            ],
            extension: [
                {
                    url: 'http://datasus.gov.br/fhir/StructureDefinition/is-prison-establishment',
                    valueBoolean: isPrison
                }
            ]
        };

        return org;
    }

    /**
     * Mapeia um registro de equipe CNES (EPRJ) para o recurso FHIR CareTeam.
     */
    static toCareTeam(record: any, period?: string): CareTeam {
        const ine = String(record.IDEQUIPE || record.INE || record.CO_EQUIPE || record.SEQ_EQUIP || '').trim();
        const cnes = String(record.CNES || record.CO_UNIDADE || record.COD_CNES || '').trim();
        const tipoEqp = String(record.TIPO_EQP || record.TP_EQUIPE || record.TPEQUIP || '').trim();
        const name = String(record.NOME_EQP || record.DS_EQUIPE || record.NO_EQUIPE || `Equipe INE ${ine}`).trim();
        const dtAtiva = String(record.DT_ATIVA || '').trim();
        const dtDesat = String(record.DT_DESAT || '').trim();

        const isPrisonTeam = tipoEqp === '74' ||
            tipoEqp === '46' ||
            this.KNOWN_PRISON_CNES.has(cnes) ||
            this.PRISON_KEYWORDS.some(kw => name.toUpperCase().includes(kw));

        const careTeam: CareTeam = {
            resourceType: 'CareTeam',
            id: ine,
            identifier: [
                {
                    system: 'http://cnes.datasus.gov.br/ine',
                    value: ine
                }
            ],
            name: name,
            category: [
                {
                    coding: [
                        {
                            system: 'http://cnes.datasus.gov.br/tipo_eqp',
                            code: tipoEqp,
                            display: isPrisonTeam ? 'Equipe de Atenção Primária Prisional (eAPP)' : `Tipo de Equipe ${tipoEqp}`
                        }
                    ]
                }
            ],
            managingOrganization: [
                {
                    reference: `Organization/${cnes}`
                }
            ],
            period: {
                start: dtAtiva ? `${dtAtiva.slice(0, 4)}-${dtAtiva.slice(4, 6)}` : undefined,
                end: dtDesat && dtDesat !== '900001' ? `${dtDesat.slice(0, 4)}-${dtDesat.slice(4, 6)}` : undefined
            },
            extension: [
                {
                    url: 'http://datasus.gov.br/fhir/StructureDefinition/is-prison-team',
                    valueBoolean: isPrisonTeam
                },
                {
                    url: 'http://datasus.gov.br/fhir/StructureDefinition/municipality-code',
                    valueString: String(record.CODUFMUN || record.CO_MUNICIPIO || '').trim()
                }
            ]
        };

        return careTeam;
    }
}

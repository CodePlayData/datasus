// @filename: PrisonHealthIdentifier.ts

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

import { PrisonEstablishment, PrisonTeam } from "./types.js";

export class PrisonHealthIdentifier {
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

    /**
     * CNES conhecidos de unidades de saúde no sistema prisional do RJ.
     */
    public static readonly KNOWN_PRISON_CNES = new Set<string>([
        '2270196', // Hospital Penal Roberto Medeiros
        '6996914', // Hospital Penitenciário Dr Hamilton Agostinho Vieira de Castro
        '4056167', // UPA Gericinó / SEAP
        '4056310', // Complexo Penitenciário Gericinó
        '4056221', // Ambulatório Penitenciário
        '7637853',
        '7637861',
        '7637888',
        '7637896',
        '7637918',
        '7637926'
    ]);

    /**
     * Avalia se um registro de estabelecimento (STRJ) é uma unidade prisional.
     */
    static isPrisonEstablishment(record: any): boolean {
        const cnes = String(record.CNES || record.CO_UNIDADE || record.COD_CNES || '').trim();
        if (this.KNOWN_PRISON_CNES.has(cnes)) return true;

        const tpUnid = String(record.TP_UNID || record.TPUNID || '').trim();
        if (tpUnid === '83') return true; // Polo de Atenção à Saúde no Sistema Prisional

        const nome = [
            record.RAZAO_SO,
            record.NO_FANTAS,
            record.NOME_ESTAB,
            record.DS_UNIDADE
        ].filter(Boolean).join(' ').toUpperCase();

        if (nome && this.PRISON_KEYWORDS.some(kw => nome.includes(kw))) {
            return true;
        }

        return false;
    }

    /**
     * Extrai objeto PrisonEstablishment normalizado.
     */
    static parseEstablishment(record: any): PrisonEstablishment {
        const cnes = String(record.CNES || record.CO_UNIDADE || record.COD_CNES || '').trim();
        const unitType = String(record.TP_UNID || record.TPUNID || '').trim();
        const municipalityCode = String(record.CODUFMUN || record.CO_MUNICIPIO || '').trim();
        const name = String(record.NO_FANTAS || record.RAZAO_SO || record.NOME_ESTAB || `Unidade CNES ${cnes} (Tipo ${unitType})`).trim();

        return {
            cnes,
            name,
            unitType,
            municipalityCode,
            isPrisonUnit: this.isPrisonEstablishment(record)
        };
    }

    /**
     * Avalia se uma equipe (EPRJ) é uma Equipe de Atenção Primária Prisional (eAPP).
     */
    static isPrisonTeam(record: any, knownPrisonCnesSet?: Set<string>): boolean {
        const tpEquipe = String(record.TIPO_EQP || record.TP_EQUIPE || record.TPEQUIP || record.TP_EQP || '').trim();
        // 74 ou 46 = eAPP (Equipe de Atenção Primária Prisional)
        if (tpEquipe === '74' || tpEquipe === '46') return true;

        const cnes = String(record.CNES || record.CO_UNIDADE || record.COD_CNES || '').trim();
        if (this.KNOWN_PRISON_CNES.has(cnes) || (knownPrisonCnesSet && knownPrisonCnesSet.has(cnes))) {
            return true;
        }

        const nome = [
            record.NOME_EQP,
            record.DS_EQUIPE,
            record.NO_EQUIPE,
            record.NOME_EQUIPE
        ].filter(Boolean).join(' ').toUpperCase();

        if (nome && this.PRISON_KEYWORDS.some(kw => nome.includes(kw))) {
            return true;
        }

        return false;
    }

    /**
     * Extrai objeto PrisonTeam normalizado.
     */
    static parseTeam(record: any, knownPrisonCnesSet?: Set<string>): PrisonTeam {
        const ine = String(record.IDEQUIPE || record.INE || record.CO_EQUIPE || record.SEQ_EQUIP || '').trim();
        const name = String(record.NOME_EQP || record.DS_EQUIPE || record.NO_EQUIPE || `Equipe INE ${ine}`).trim();
        const cnes = String(record.CNES || record.CO_UNIDADE || record.COD_CNES || '').trim();
        const teamType = String(record.TIPO_EQP || record.TP_EQUIPE || record.TPEQUIP || record.TP_EQP || '').trim();
        const municipalityCode = String(record.CODUFMUN || record.CO_MUNICIPIO || '').trim();

        return {
            ine,
            name,
            cnes,
            teamType,
            municipalityCode
        };
    }
}

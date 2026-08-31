// @filename: types.ts

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

export type IndicatorCategory = 'eAPP' | 'eAP_eSF' | 'eCR' | 'eSB' | 'eMulti';

export interface IndicatorDefinition {
    id: string; // Ex: 'P1', 'C1', 'CR1', 'B1', 'M1'
    name: string;
    category: IndicatorCategory;
    description: string;
    targetLevel: 'unit' | 'team' | 'both'; // Se o indicador é computado por Unidade (CNES), Equipe (INE) ou ambos
    numeratorDescription: string;
    denominatorDescription: string;
}

export interface IndicatorCalculationResult {
    indicatorId: string;
    indicatorName: string;
    category: IndicatorCategory;
    targetLevel: 'unit' | 'team' | 'state';
    targetId: string; // CNES ou INE ou UF ('RJ')
    targetName?: string;
    numerator: number;
    denominator: number;
    value: number; // Porcentagem (0-100%) ou Razão / Média
    period?: string;
}

export interface PrisonEstablishment {
    cnes: string;
    name: string;
    municipalityCode?: string;
    unitType?: string; // Ex: 83 - Polo Penitenciário
    isPrisonUnit: boolean;
}

export interface PrisonTeam {
    ine: string;
    name: string;
    cnes: string;
    teamType: string; // Ex: 46 - eAPP
    municipalityCode?: string;
}

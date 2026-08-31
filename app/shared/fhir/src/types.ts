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

import type {
    Organization as FHIROrganization,
    CareTeam as FHIRCareTeam,
    Patient as FHIRPatient,
    Encounter as FHIREncounter,
    Condition as FHIRCondition,
    Procedure as FHIRProcedure,
    Observation as FHIRObservation,
    Bundle as FHIRBundle,
    Resource as FHIRResource
} from 'fhir/r4';

export type {
    FHIROrganization as Organization,
    FHIRCareTeam as CareTeam,
    FHIRPatient as Patient,
    FHIREncounter as Encounter,
    FHIRCondition as Condition,
    FHIRProcedure as Procedure,
    FHIRObservation as Observation,
    FHIRBundle as Bundle,
    FHIRResource as Resource
};

export type IndicatorCategory = 'eAPP' | 'eAP_eSF' | 'eCR' | 'eSB' | 'eMulti';

export interface FHIRIndicatorEvaluation {
    indicatorId: string;
    indicatorName: string;
    category: IndicatorCategory;
    targetLevel: 'team' | 'unit' | 'municipality' | 'state';
    targetId: string; // INE, CNES, IBGE ou 'RJ'
    targetName: string;
    targetDetails?: {
        municipalityCode?: string;
        cnes?: string;
        managingOrganization?: string;
        organizationName?: string;
        unitType?: string;
        isPrison?: boolean;
        teamType?: string;
        activePeriod?: { start?: string; end?: string };
    };
    numerator: number;
    denominator: number;
    value: number; // 0-100% ou taxa
    qualitativeClassification?: 'Ótimo' | 'Bom' | 'Regular' | 'Insuficiente';
    targetParam?: string;
    period: string; // Ex: '2024' ou '2024-01'
    historicalComparison?: {
        previousPeriod: string; // Ex: '2023'
        previousNumerator: number;
        previousDenominator: number;
        previousValue: number;
        trend: 'up' | 'down' | 'stable';
        variationPercent: number;
    };
}

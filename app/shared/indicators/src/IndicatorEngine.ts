// @filename: IndicatorEngine.ts

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

import { IndicatorCategory, IndicatorCalculationResult } from "./types.js";
import { PRISON_INDICATORS } from "./definitions/PrisonIndicators.js";
import { PRIMARY_CARE_INDICATORS } from "./definitions/PrimaryCareIndicators.js";
import { STREET_CARE_INDICATORS } from "./definitions/StreetCareIndicators.js";
import { ORAL_HEALTH_INDICATORS } from "./definitions/OralHealthIndicators.js";
import { MULTI_INDICATORS } from "./definitions/MultiIndicators.js";

export interface TargetAggregate {
    cnes?: string;
    ine?: string;
    name?: string;
    isPrison?: boolean;
    teamType?: string;

    // Métricas para cálculo dos indicadores
    metrics: Record<string, { num: number; den: number }>;
}

export class IndicatorEngine {
    private units = new Map<string, TargetAggregate>();
    private teams = new Map<string, TargetAggregate>();

    registerUnit(cnes: string, name?: string, isPrison: boolean = false) {
        if (!this.units.has(cnes)) {
            this.units.set(cnes, {
                cnes,
                name: name || `CNES ${cnes}`,
                isPrison,
                metrics: {}
            });
        } else if (isPrison) {
            this.units.get(cnes)!.isPrison = true;
        }
    }

    registerTeam(ine: string, cnes: string, name?: string, teamType?: string) {
        if (!this.teams.has(ine)) {
            this.teams.set(ine, {
                ine,
                cnes,
                name: name || `Equipe INE ${ine}`,
                teamType,
                isPrison: teamType === '46' || String(name || '').toUpperCase().includes('PRISION'),
                metrics: {}
            });
        }
    }

    getUnit(cnes: string): TargetAggregate | undefined {
        return this.units.get(cnes);
    }

    getTeam(ine: string): TargetAggregate | undefined {
        return this.teams.get(ine);
    }

    getAllUnits(): TargetAggregate[] {
        return Array.from(this.units.values());
    }

    getAllTeams(): TargetAggregate[] {
        return Array.from(this.teams.values());
    }

    /**
     * Incrementa numerador e/ou denominador para um indicador em uma unidade e/ou equipe.
     */
    addRecordMetric(options: {
        indicatorId: string;
        cnes?: string;
        ine?: string;
        numIncrement?: number;
        denIncrement?: number;
    }) {
        const { indicatorId, cnes, ine, numIncrement = 0, denIncrement = 0 } = options;

        if (cnes) {
            this.registerUnit(cnes);
            const unit = this.units.get(cnes)!;
            if (!unit.metrics[indicatorId]) {
                unit.metrics[indicatorId] = { num: 0, den: 0 };
            }
            unit.metrics[indicatorId].num += numIncrement;
            unit.metrics[indicatorId].den += denIncrement;
        }

        if (ine) {
            const team = this.teams.get(ine);
            if (team) {
                if (!team.metrics[indicatorId]) {
                    team.metrics[indicatorId] = { num: 0, den: 0 };
                }
                team.metrics[indicatorId].num += numIncrement;
                team.metrics[indicatorId].den += denIncrement;
            }
        }
    }

    /**
     * Calcula os indicadores para as unidades e equipes cadastradas.
     */
    computeResults(filterCategory?: IndicatorCategory): IndicatorCalculationResult[] {
        const results: IndicatorCalculationResult[] = [];

        const allDefinitions = {
            ...PRISON_INDICATORS,
            ...PRIMARY_CARE_INDICATORS,
            ...STREET_CARE_INDICATORS,
            ...ORAL_HEALTH_INDICATORS,
            ...MULTI_INDICATORS
        };

        const targetDefinitions = Object.values(allDefinitions).filter(def => 
            !filterCategory || def.category === filterCategory
        );

        for (const def of targetDefinitions) {
            // 1. Cálculo por Unidade (CNES)
            for (const [cnes, unit] of this.units.entries()) {
                if (def.category === 'eAPP' && !unit.isPrison) {
                    continue; // Indicadores prisionais avaliam apenas unidades prisionais
                }

                const m = unit.metrics[def.id] || { num: 0, den: 0 };
                const value = m.den > 0 ? (m.num / m.den) * 100 : 0;

                results.push({
                    indicatorId: def.id,
                    indicatorName: def.name,
                    category: def.category,
                    targetLevel: 'unit',
                    targetId: cnes,
                    targetName: unit.name,
                    numerator: m.num,
                    denominator: m.den,
                    value: Math.round(value * 100) / 100
                });
            }

            // 2. Cálculo por Equipe (INE)
            for (const [ine, team] of this.teams.entries()) {
                if (def.category === 'eAPP' && !team.isPrison && team.teamType !== '46') {
                    continue;
                }

                const m = team.metrics[def.id] || { num: 0, den: 0 };
                const value = m.den > 0 ? (m.num / m.den) * 100 : 0;

                results.push({
                    indicatorId: def.id,
                    indicatorName: def.name,
                    category: def.category,
                    targetLevel: 'team',
                    targetId: ine,
                    targetName: team.name,
                    numerator: m.num,
                    denominator: m.den,
                    value: Math.round(value * 100) / 100
                });
            }

            // 3. Cálculo Global para o Estado do RJ
            let stateNum = 0;
            let stateDen = 0;
            for (const unit of this.units.values()) {
                if (def.category === 'eAPP' && !unit.isPrison) continue;
                const m = unit.metrics[def.id];
                if (m) {
                    stateNum += m.num;
                    stateDen += m.den;
                }
            }

            const stateValue = stateDen > 0 ? (stateNum / stateDen) * 100 : 0;
            results.push({
                indicatorId: def.id,
                indicatorName: def.name,
                category: def.category,
                targetLevel: 'state',
                targetId: 'RJ',
                targetName: 'Estado do Rio de Janeiro',
                numerator: stateNum,
                denominator: stateDen,
                value: Math.round(stateValue * 100) / 100
            });
        }

        return results;
    }
}

// @filename: LinkageStrategy.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos
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


import { Pipeline, Records } from "@codeplaydata/datasus-core";
import { IndexStrategy } from "../interface/IndexStrategy";
import { CohortConfig } from "./CohortConfig";
import { LinkageConfig } from "../LinkageConfig";
import { InMemoryIndex } from "../infra/InMemoryIndex";
import { MatchRepository } from "../interface/MatchRepository";
import { RecordProvider } from "@codeplaydata/datasus-core";

export class LinkageStrategy implements Pipeline {
    private cohortStep: { service: RecordProvider; config: CohortConfig; blockingKeys: string[] } | null = null;
    private linkageSteps: { service: RecordProvider; config: LinkageConfig }[] = [];

    constructor(
        readonly name: string,
        private readonly index: IndexStrategy = new InMemoryIndex(),
        private readonly matchRepository?: MatchRepository
    ) { }

    cohort(service: RecordProvider, config: CohortConfig): LinkageStrategy {
        this.cohortStep = { service, config, blockingKeys: [] };
        return this;
    }

    link(service: RecordProvider, config: LinkageConfig): LinkageStrategy {
        this.linkageSteps.push({ service, config });
        return this;
    }

    async exec(): Promise<void> {
        if (!this.cohortStep) {
            throw new Error("Cohort not defined. Use .cohort() to define the starting point.");
        }

        if (this.linkageSteps.length === 0) {
            throw new Error("No linkage defined.");
        }

        const firstLinkage = this.linkageSteps[0];
        const blockingConfig = firstLinkage.config.blocking || firstLinkage.config.on;
        const cohortBlockingKeys = Object.keys(blockingConfig);

        console.log(`[LinkageStrategy] Starting Cohort: ${this.cohortStep.config.name}`);

        if (this.cohortStep.config.subset) {
            if (this.cohortStep.service.subset) {
                await this.cohortStep.service.subset(this.cohortStep.config.subset, this.cohortStep.config.parser);
            }
        }

        await this.cohortStep.service.exec(async (record: Records) => {
            const key = this.generateKey(record, cohortBlockingKeys);
            if (key) {
                await this.index.set(key, record);
            }
        });

        console.log(`[LinkageStrategy] Cohort indexed using keys: ${cohortBlockingKeys.join(', ')}`);

        for (const step of this.linkageSteps) {
            console.log(`[LinkageStrategy] Starting Linkage: ${step.config.name}`);

            if (step.config.subset) {
                if (step.config.subset && step.service.subset) {
                    await step.service.subset(step.config.subset);
                }
            }

            const stepBlockingConfig = step.config.blocking || step.config.on;
            const targetBlockingKeys = Object.values(stepBlockingConfig);

            await step.service.exec(async (record: Records) => {
                const key = this.generateKey(record, targetBlockingKeys);
                if (!key) return;

                const candidates = await this.index.get(key);
                if (candidates.length === 0) return;

                for (const candidate of candidates) {
                    const isMatch = this.match(candidate, record, step.config);
                    if (isMatch) {
                        console.log(`[MATCH] ${step.config.name}: Found match for key ${key}`);
                        if (this.matchRepository) {
                            await this.matchRepository.save({
                                cohort: candidate,
                                target: record,
                                config: step.config,
                                timestamp: new Date()
                            });
                        }
                    }
                }
            });
        }
    }

    private generateKey(record: Records, fields: string[]): string {
        return fields.map(f => record[f]).join('_');
    }

    private match(cohortRecord: Records, targetRecord: Records, config: LinkageConfig): boolean {
        if (config.type === 'deterministic') {
            return true;
        }

        if (config.type === 'probabilistic') {
            const strategy = config.scoreStrategy || 'simple';

            if (strategy === 'simple') {
                return this.matchSimple(cohortRecord, targetRecord, config);
            } else if (strategy === 'fellegi-sunter') {
                return this.matchFellegiSunter(cohortRecord, targetRecord, config);
            }
        }

        return false;
    }

    private matchSimple(cohortRecord: Records, targetRecord: Records, config: LinkageConfig): boolean {
        let score = 0;
        let totalWeight = 0;

        for (const [cohortField, targetField] of Object.entries(config.on)) {
            const valA = cohortRecord[cohortField];
            const valB = targetRecord[targetField];
            const weightConfig = config.weights?.[cohortField];
            const weight = typeof weightConfig === 'number' ? weightConfig : 1;

            totalWeight += weight;

            if (valA === valB) {
                score += weight;
            }
        }

        const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;
        const threshold = config.threshold || 0.85;

        return normalizedScore >= threshold;
    }

    private matchFellegiSunter(cohortRecord: Records, targetRecord: Records, config: LinkageConfig): boolean {
        let score = 0;

        for (const [cohortField, targetField] of Object.entries(config.on)) {
            const valA = cohortRecord[cohortField];
            const valB = targetRecord[targetField];
            const weightConfig = config.weights?.[cohortField];

            let wAgree = 0;
            let wDisagree = 0;

            if (weightConfig && typeof weightConfig === 'object') {
                if ('m' in weightConfig && 'u' in weightConfig) {
                    const m = weightConfig.m;
                    const u = weightConfig.u;
                    wAgree = Math.log2(m / u);
                    wDisagree = Math.log2((1 - m) / (1 - u));
                } else if ('agreement' in weightConfig && 'disagreement' in weightConfig) {
                    wAgree = weightConfig.agreement;
                    wDisagree = weightConfig.disagreement;
                }
            } else {
                wAgree = 1;
                wDisagree = -1;
            }

            if (valA === valB) {
                score += wAgree;
            } else {
                score += wDisagree;
            }
        }
        const threshold = config.threshold || 0;
        console.log(`[FS] Score: ${score} (Threshold: ${threshold})`);
        return score >= threshold;
    }
}
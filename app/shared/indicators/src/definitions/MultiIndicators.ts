// @filename: MultiIndicators.ts

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

import { IndicatorDefinition } from "../types.js";

export const MULTI_INDICATORS: Record<string, IndicatorDefinition> = {
    M1: {
        id: 'M1',
        name: 'Média de atendimentos por pessoa pela eMulti na APS',
        category: 'eMulti',
        description: 'Mede o volume e a densidade de atendimentos (individuais e coletivos) realizados por profissionais da eMulti vinculados à APS.',
        targetLevel: 'both',
        numeratorDescription: 'Total de atendimentos individuais e atividades coletivas realizadas pelos profissionais da eMulti.',
        denominatorDescription: 'Total de pessoas distintas atendidas pela eMulti no período avaliado.'
    },
    M2: {
        id: 'M2',
        name: 'Ações interprofissionais realizadas pela eMulti na APS',
        category: 'eMulti',
        description: 'Avalia o volume de ações de cuidado compartilhado entre profissionais da eMulti e outras equipes da APS (eSF/eAP).',
        targetLevel: 'both',
        numeratorDescription: 'Total de atendimentos compartilhados (consultas conjuntas, matriciamento e discussão de caso) realizados pela eMulti com equipes de referência.',
        denominatorDescription: 'Meta de ações interprofissionais pactuada ou total de equipes vinculadas à eMulti.'
    }
};

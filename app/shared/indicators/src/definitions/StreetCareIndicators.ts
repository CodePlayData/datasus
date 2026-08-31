// @filename: StreetCareIndicators.ts

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

export const STREET_CARE_INDICATORS: Record<string, IndicatorDefinition> = {
    CR1: {
        id: 'CR1',
        name: 'Mais acesso à eCR',
        category: 'eCR',
        description: 'Avalia o acesso da população em situação de rua às consultas e atendimentos da APS.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas em situação de rua com pelo menos um atendimento pela eCR no período.',
        denominatorDescription: 'Total de pessoas em situação de rua identificadas/cadastradas pela eCR.'
    },
    CR2: {
        id: 'CR2',
        name: 'Cuidado na gestação em situação de rua',
        category: 'eCR',
        description: 'Avalia o acesso oportuno ao pré-natal para gestantes em situação de rua.',
        targetLevel: 'both',
        numeratorDescription: 'Gestantes em situação de rua com consultas de pré-natal registradas.',
        denominatorDescription: 'Total de gestantes em situação de rua identificadas pela eCR.'
    },
    CR3: {
        id: 'CR3',
        name: 'Rastreio de infecções sexualmente transmissíveis',
        category: 'eCR',
        description: 'Avalia a realização oportuna do rastreio de sífilis, HIV e hepatites B e C na população de rua.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas em situação de rua com teste rápido ou sorologia realizada para ISTs.',
        denominatorDescription: 'Total de pessoas em situação de rua cadastradas e acompanhadas pela eCR.'
    },
    CR4: {
        id: 'CR4',
        name: 'Cuidado da pessoa com tuberculose',
        category: 'eCR',
        description: 'Avalia o acesso e monitoramento do cuidado contínuo de pessoas com TB em situação de rua.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas em situação de rua com TB em acompanhamento e tratamento diretamente observado.',
        denominatorDescription: 'Total de pessoas em situação de rua com diagnóstico de Tuberculose identificadas pela eCR.'
    }
};

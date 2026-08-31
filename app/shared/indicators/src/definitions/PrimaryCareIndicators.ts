// @filename: PrimaryCareIndicators.ts

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

export const PRIMARY_CARE_INDICATORS: Record<string, IndicatorDefinition> = {
    C1: {
        id: 'C1',
        name: 'Mais acesso',
        category: 'eAP_eSF',
        description: 'Avalia a proporção de atendimentos programados em relação ao total de atendimentos na APS.',
        targetLevel: 'both',
        numeratorDescription: 'Total de atendimentos individuais programados/agendados realizados pela equipe.',
        denominatorDescription: 'Total de atendimentos individuais realizados pela equipe na APS.'
    },
    C2: {
        id: 'C2',
        name: 'Cuidado no desenvolvimento infantil',
        category: 'eAP_eSF',
        description: 'Avalia o cuidado integral oferecido às crianças nos dois primeiros anos de vida.',
        targetLevel: 'both',
        numeratorDescription: 'Crianças menores de 2 anos com consultas de puericultura, vacinas e visitas em dia.',
        denominatorDescription: 'Total de crianças menores de 2 anos cadastradas na equipe.'
    },
    C3: {
        id: 'C3',
        name: 'Cuidado na gestação e puerpério',
        category: 'eAP_eSF',
        description: 'Monitora boas práticas no pré-natal e puerpério para qualificar o cuidado materno-infantil.',
        targetLevel: 'both',
        numeratorDescription: 'Gestantes com captação no 1º trimestre, exames laboratoriais (sífilis/HIV) e consulta puerperal.',
        denominatorDescription: 'Total de gestantes cadastradas com parto previsto ou ocorrido no período.'
    },
    C4: {
        id: 'C4',
        name: 'Cuidado da pessoa com diabetes',
        category: 'eAP_eSF',
        description: 'Acompanha o cuidado longitudinal de pessoas com diabetes na APS.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas com diabetes com consulta no semestre, solicitação de hemoglobina glicada e avaliação dos pés.',
        denominatorDescription: 'Total de pessoas com diabetes cadastradas na equipe de referência.'
    },
    C5: {
        id: 'C5',
        name: 'Cuidado da pessoa com hipertensão',
        category: 'eAP_eSF',
        description: 'Acompanha o cuidado contínuo de pessoas com hipertensão na APS.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas com hipertensão com consulta e aferição de pressão arterial no semestre.',
        denominatorDescription: 'Total de pessoas com hipertensão cadastradas na equipe de referência.'
    },
    C6: {
        id: 'C6',
        name: 'Cuidado da pessoa idosa',
        category: 'eAP_eSF',
        description: 'Avalia a atenção integral à pessoa idosa com consultas, vacinação e avaliação antropométrica.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas de 60 anos ou mais com consulta, vacina de influenza e avaliação clínica.',
        denominatorDescription: 'Total de pessoas idosas cadastradas na equipe.'
    },
    C7: {
        id: 'C7',
        name: 'Cuidado da mulher na prevenção do câncer',
        category: 'eAP_eSF',
        description: 'Promove o rastreamento do câncer de colo do útero e de mama na APS.',
        targetLevel: 'both',
        numeratorDescription: 'Mulheres de 25 a 64 anos com exame citopatológico realizado nos últimos 3 anos.',
        denominatorDescription: 'Total de mulheres de 25 a 64 anos cadastradas na equipe.'
    }
};

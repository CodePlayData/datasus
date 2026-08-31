// @filename: OralHealthIndicators.ts

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

export const ORAL_HEALTH_INDICATORS: Record<string, IndicatorDefinition> = {
    B1: {
        id: 'B1',
        name: 'Primeira consulta odontológica programada',
        category: 'eSB',
        description: 'Avalia o acesso da população à primeira consulta odontológica realizada por equipes de Saúde Bucal na APS.',
        targetLevel: 'both',
        numeratorDescription: 'Número de primeiras consultas odontológicas programadas realizadas pela eSB.',
        denominatorDescription: 'População cadastrada na área de abrangência da equipe de Saúde Bucal.'
    },
    B2: {
        id: 'B2',
        name: 'Tratamento odontológico concluído',
        category: 'eSB',
        description: 'Mede a proporção de tratamentos odontológicos finalizados em relação às primeiras consultas realizadas.',
        targetLevel: 'both',
        numeratorDescription: 'Número de tratamentos odontológicos concluídos no período.',
        denominatorDescription: 'Número de primeiras consultas odontológicas programadas realizadas pela eSB.'
    },
    B3: {
        id: 'B3',
        name: 'Taxa de exodontia de dentes permanentes',
        category: 'eSB',
        description: 'Avalia a proporção de extrações dentárias em relação ao total de procedimentos clínicos individuais.',
        targetLevel: 'both',
        numeratorDescription: 'Total de exodontias de dentes permanentes realizadas pela eSB.',
        denominatorDescription: 'Total de procedimentos clínicos odontológicos individuais realizados.'
    },
    B4: {
        id: 'B4',
        name: 'Escovação dental supervisionada (6 a 12 anos)',
        category: 'eSB',
        description: 'Avalia a proporção de crianças de 6 a 12 anos beneficiadas com escovação dental supervisionada.',
        targetLevel: 'both',
        numeratorDescription: 'Crianças de 6 a 12 anos participantes de ação coletiva de escovação supervisionada.',
        denominatorDescription: 'Total de crianças de 6 a 12 anos cadastradas na equipe de referência.'
    },
    B5: {
        id: 'B5',
        name: 'Procedimentos odontológicos preventivos',
        category: 'eSB',
        description: 'Calcula a proporção de ações preventivas (aplicação de flúor, selante, profilaxia) entre os procedimentos odontológicos.',
        targetLevel: 'both',
        numeratorDescription: 'Total de procedimentos odontológicos preventivos realizados.',
        denominatorDescription: 'Total geral de procedimentos odontológicos básicos e preventivos realizados.'
    },
    B6: {
        id: 'B6',
        name: 'Tratamento restaurador atraumático (ART)',
        category: 'eSB',
        description: 'Mede a proporção de restaurações realizadas pela técnica de Tratamento Restaurador Atraumático na APS.',
        targetLevel: 'both',
        numeratorDescription: 'Número de restaurações por técnica de ART realizadas pela eSB.',
        denominatorDescription: 'Total de procedimentos restauradores dentários realizados no período.'
    }
};

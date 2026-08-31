// @filename: PrisonIndicators.ts

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

export const PRISON_INDICATORS: Record<string, IndicatorDefinition> = {
    P1: {
        id: 'P1',
        name: 'Mais acesso à Atenção Primária Prisional',
        category: 'eAPP',
        description: 'Avalia o acesso das pessoas privadas de liberdade (PPL) aos atendimentos na Atenção Primária no Sistema Prisional.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas privadas de liberdade com pelo menos um atendimento pela equipe de Atenção Primária Prisional no período.',
        denominatorDescription: 'Total de pessoas privadas de liberdade identificadas/cadastradas pela eAPP ou na unidade prisional.'
    },
    P2: {
        id: 'P2',
        name: 'Cuidado na Gestação em PPL',
        category: 'eAPP',
        description: 'Avalia o acesso oportuno e acompanhamento pré-natal de gestantes privadas de liberdade identificadas pelas eAPP.',
        targetLevel: 'both',
        numeratorDescription: 'Gestantes em situação de privação de liberdade com consultas de pré-natal registradas no período.',
        denominatorDescription: 'Total de gestantes privadas de liberdade identificadas na unidade prisional.'
    },
    P3: {
        id: 'P3',
        name: 'Cuidado da pessoa com diabetes e/ou hipertensão em PPL',
        category: 'eAPP',
        description: 'Avalia o acesso e monitoramento efetivo do cuidado contínuo à saúde de PPL com diabetes e/ou hipertensão.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas com DM e/ou HAS em privação de liberdade com consultas de acompanhamento e aferição/exames no período.',
        denominatorDescription: 'Total de pessoas privadas de liberdade com diagnóstico de DM e/ou HAS identificadas pela eAPP.'
    },
    P4: {
        id: 'P4',
        name: 'Rastreio de infecções sexualmente transmissíveis em PPL',
        category: 'eAPP',
        description: 'Avalia o acesso ao rastreio oportuno de Sífilis, HIV e Hepatites B e C no sistema prisional.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas privadas de liberdade com testagem rápida ou sorologia realizada para ISTs no período.',
        denominatorDescription: 'Total de pessoas privadas de liberdade identificadas pela eAPP no período avaliativo.'
    },
    P5: {
        id: 'P5',
        name: 'Cuidado da Pessoa com Tuberculose em PPL',
        category: 'eAPP',
        description: 'Avalia o acesso e o monitoramento do cuidado integral à saúde das pessoas privadas de liberdade com tuberculose.',
        targetLevel: 'both',
        numeratorDescription: 'Pessoas privadas de liberdade com TB em acompanhamento contínuo/tratamento pelas eAPP.',
        denominatorDescription: 'Total de pessoas privadas de liberdade com diagnóstico de Tuberculose ativas no período.'
    },
    P6: {
        id: 'P6',
        name: 'Cuidado da mulher na prevenção do câncer em PPL',
        category: 'eAPP',
        description: 'Avalia o acesso das mulheres e homens trans em privação de liberdade aos exames preventivos de câncer de colo de útero e mama.',
        targetLevel: 'both',
        numeratorDescription: 'Mulheres e homens trans de 25 a 64 anos no sistema prisional com exame citopatológico / rastreamento realizado.',
        denominatorDescription: 'Total de mulheres e homens trans de 25 a 64 anos identificados pela eAPP no sistema prisional.'
    }
};

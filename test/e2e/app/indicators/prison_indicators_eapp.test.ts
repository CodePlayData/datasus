// @filename: prison_indicators_eapp.test.ts

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

import { describe, it, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync } from 'node:fs';
import { BasicFTPClient, DbcReader } from '../../../../packages/core/src/index.js';
import { CNESFTPGateway } from '../../../../app/cnes/src/CNESFTPGateway.js';
import {
    FHIRStore,
    CNESMapper,
    FHIREvaluator,
    FHIRIndicatorEvaluation
} from '../../../../app/shared/fhir/index.js';

if (!existsSync('./data')) {
    mkdirSync('./data');
}

describe('E2E (FHIR): Fichas Técnicas SAPS - Indicadores Prisionais eAPP (P1 a P6) no Rio de Janeiro', () => {
    let ftpClient: BasicFTPClient;
    const store = new FHIRStore();
    let evaluator: FHIREvaluator;
    let evaluations: FHIRIndicatorEvaluation[] = [];

    after(() => {
        if (ftpClient) ftpClient.close();
    });

    it('1. Deve conectar ao DATASUS e mapear Unidades (Organization) e Equipes (CareTeam) Prisionais via FHIR', async () => {
        ftpClient = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(ftpClient instanceof BasicFTPClient);

        const gateway = new CNESFTPGateway(ftpClient);

        // 1. Extrai Estabelecimentos (STRJ) e mapeia para Organization FHIR
        const stFile = './data/STRJ2401.dbc';
        if (!existsSync(stFile)) {
            await gateway.get('STRJ2401.dbc', stFile);
        }

        const stReader = await DbcReader.load(stFile);
        await stReader.forEachRecords(async (record: any) => {
            const org = CNESMapper.toOrganization(record, '2024');
            store.add(org);
        });
        stReader.remove(false);

        // 2. Extrai Equipes (EPRJ) e mapeia para CareTeam FHIR
        const epFile = './data/EPRJ2401.dbc';
        if (!existsSync(epFile)) {
            await gateway.get('EPRJ2401.dbc', epFile);
        }

        const epReader = await DbcReader.load(epFile);
        await epReader.forEachRecords(async (record: any) => {
            const careTeam = CNESMapper.toCareTeam(record, '2024');
            store.add(careTeam);
        });
        epReader.remove(false);

        const prisonOrgs = store.getOrganizations(org => 
            org.extension?.some(e => e.url.includes('is-prison-establishment') && e.valueBoolean) ?? false
        );

        const prisonCareTeams = store.getCareTeams(team => 
            team.extension?.some(e => e.url.includes('is-prison-team') && e.valueBoolean) ||
            team.category?.[0]?.coding?.[0]?.code === '46'
        );

        console.log(`\n[FHIR/CNES/RJ] Total de Unidades Prisionais (Organization): ${prisonOrgs.length}`);
        console.log(`[FHIR/CNES/RJ] Total de Equipes Prisionais (CareTeam): ${prisonCareTeams.length}`);
        console.log(`[FHIR/CNES/RJ] Exemplos de Equipes Prisionais Identificadas:`);
        for (const t of prisonCareTeams.slice(0, 3)) {
            console.log(` - ${t.name} (INE: ${t.id}, CNES: ${t.managingOrganization?.[0]?.reference}, Período Ativo: ${t.period?.start || 'N/A'})`);
        }

        assert.ok(prisonOrgs.length > 0, 'Deve identificar estabelecimentos prisionais no RJ');
        assert.ok(prisonCareTeams.length > 0, 'Deve identificar equipes prisionais no RJ');

        evaluator = new FHIREvaluator(store);
        evaluations = evaluator.evaluate({
            period: '2024',
            previousPeriod: '2023',
            category: 'eAPP'
        });
    });

    it('2. Deve computar os casos de P1 (Mais Acesso à Atenção Primária Prisional) com tendências históricas', async () => {
        const p1Results = evaluations.filter(r => r.indicatorId === 'P1');
        assert.ok(p1Results.length > 0);

        const stateP1 = p1Results.find(r => r.targetLevel === 'state');
        assert.ok(stateP1);
        assert.strictEqual(stateP1!.targetName, 'Estado do Rio de Janeiro');
        assert.ok(stateP1!.value > 0);
        assert.ok(stateP1!.historicalComparison);
        console.log(`[P1 - RJ] Score Atual (2024): ${stateP1!.value}% | Ano Anterior (2023): ${stateP1!.historicalComparison?.previousValue}% | Tendência: ${stateP1!.historicalComparison?.trend}`);
    });

    it('3. Deve computar P2 (Cuidado na Gestação em PPL) para unidades e equipes prisionais femininas', async () => {
        const p2Results = evaluations.filter(r => r.indicatorId === 'P2');
        assert.ok(p2Results.length > 0);
        const stateP2 = p2Results.find(r => r.targetLevel === 'state');
        assert.ok(stateP2);
        assert.ok(stateP2!.value > 0);
    });

    it('4. Deve computar P3 (Cuidado da Pessoa com DM e/ou HAS em PPL)', async () => {
        const p3Results = evaluations.filter(r => r.indicatorId === 'P3');
        assert.ok(p3Results.length > 0);
    });

    it('5. Deve computar P4 (Rastreio de ISTs: Sífilis, HIV, Hepatites B e C em PPL)', async () => {
        const p4Results = evaluations.filter(r => r.indicatorId === 'P4');
        assert.ok(p4Results.length > 0);
    });

    it('6. Deve computar P5 (Cuidado da Pessoa com Tuberculose em PPL)', async () => {
        const p5Results = evaluations.filter(r => r.indicatorId === 'P5');
        assert.ok(p5Results.length > 0);
    });

    it('7. Deve computar P6 (Cuidado da Mulher na Prevenção do Câncer em PPL)', async () => {
        const p6Results = evaluations.filter(r => r.indicatorId === 'P6');
        assert.ok(p6Results.length > 0);

        console.log(`\n=== RESUMO E2E FHIR: INDICADORES PRISIONAIS (P1 a P6 - RJ) ===`);
        const stateResults = evaluations.filter(r => r.targetLevel === 'state');
        for (const sr of stateResults) {
            console.log(`${sr.indicatorId} - ${sr.indicatorName}: 2024: ${sr.value}% (${sr.numerator}/${sr.denominator}) | 2023: ${sr.historicalComparison?.previousValue}% (Var: +${sr.historicalComparison?.variationPercent}%) [${sr.historicalComparison?.trend?.toUpperCase()}]`);
        }
        assert.strictEqual(stateResults.length, 6, 'Todos os 6 indicadores prisionais (P1 a P6) devem ter resultado consolidado');
    });
});

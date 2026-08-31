// @filename: street_care_indicators_ecr.test.ts

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

describe('E2E (FHIR): Fichas Técnicas SAPS - Indicadores de Consultório na Rua (CR1 a CR4) no RJ', () => {
    let ftpClient: BasicFTPClient;
    const store = new FHIRStore();
    let evaluator: FHIREvaluator;
    let evaluations: FHIRIndicatorEvaluation[] = [];

    after(() => {
        if (ftpClient) ftpClient.close();
    });

    it('1. Deve identificar equipes de Consultório na Rua (CareTeam) no CNES do RJ via FHIR', async () => {
        ftpClient = await BasicFTPClient.connect('ftp.datasus.gov.br') as BasicFTPClient;
        assert.ok(ftpClient instanceof BasicFTPClient);

        const gateway = new CNESFTPGateway(ftpClient);
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

        const ecrTeams = store.getCareTeams(team => {
            const code = team.category?.[0]?.coding?.[0]?.code;
            const name = String(team.name || '').toUpperCase();
            return code === '76' || name.includes('RUA') || name.includes('CONSULTORIO NA RUA') || name.includes('ECR');
        });

        console.log(`\n[FHIR/CNES/RJ] Total de equipes de Consultório na Rua (CareTeam) mapeadas: ${ecrTeams.length}`);
        assert.ok(ecrTeams.length > 0, 'Deve identificar equipes de Consultório na Rua no RJ');

        evaluator = new FHIREvaluator(store);
        evaluations = evaluator.evaluate({
            period: '2024',
            previousPeriod: '2023',
            category: 'eCR'
        });
    });

    it('2. Deve computar os casos de CR1 a CR4 para as equipes de Consultório na Rua e Estado do RJ', async () => {
        console.log(`\n=== RESUMO E2E FHIR: INDICADORES DE CONSULTÓRIO NA RUA (CR1 a CR4 - RJ) ===`);
        const stateResults = evaluations.filter(r => r.targetLevel === 'state');
        for (const sr of stateResults) {
            console.log(`${sr.indicatorId} - ${sr.indicatorName}: 2024: ${sr.value}% (${sr.numerator}/${sr.denominator}) | 2023: ${sr.historicalComparison?.previousValue}% (Var: +${sr.historicalComparison?.variationPercent}%) [${sr.historicalComparison?.trend?.toUpperCase()}]`);
        }
        assert.strictEqual(stateResults.length, 4, 'Todos os 4 indicadores de eCR (CR1 a CR4) devem ter resultado consolidado');
    });
});

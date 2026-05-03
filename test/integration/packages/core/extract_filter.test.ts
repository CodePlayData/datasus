// @filename: extract_filter.test.ts

/*
 *     Copyright 2026 Pedro Paulo Teixeira dos Santos

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

// Testar integração do job.ts, JobProcessor, DbcReader com o CriteriaSet (Criteria).
//
// Este teste de integração faz o fork real do script job.ts (via JobRunner),
// aponta para um arquivo .dbc real (fixture), e valida que:
//   1. O JobProcessor consegue abrir e ler o arquivo .dbc com o DbcReader.
//   2. Os registros são enviados de volta via IPC ao processo pai.
//   3. Quando critérios são fornecidos, apenas os registros filtrados são enviados.

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { JobRunner } from '../../../../packages/core/src/infra/job/JobRunner.js';

// @ts-ignore
const __dirname = import.meta.dirname;
const FIXTURE_PATH = join(__dirname, 'fixtures', 'PAAC1001.dbc');
const JOB_SCRIPT = join(__dirname, '..', '..', '..', '..', 'packages', 'core', 'src', 'infra', 'job', 'job.ts');

describe('Extração e Filtragem (job.ts + JobProcessor + DbcReader + Criteria)', () => {
    beforeEach(() => {
        JobRunner.totalJobs = 0;
        JobRunner.finishedJobs = 0;
        JobRunner.startTime = Date.now();
        JobRunner.globalSummary = { total: 0, founds: 0, errors: 0 };
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('fixture PAAC1001.dbc deve existir', () => {
        assert.ok(existsSync(FIXTURE_PATH), `Fixture não encontrada: ${FIXTURE_PATH}. Execute: npx tsx test/integration/packages/core/fixtures/download_fixture.ts`);
    });

    it('deve extrair todos os registros do .dbc sem filtros', async () => {
        const runner = JobRunner.init(JOB_SCRIPT);

        const records: any[] = [];
        const progressMsgs: any[] = [];

        await runner.exec(
            {
                file: 'PAAC1001.dbc',
                dataPath: join(__dirname, 'fixtures'),
                src: undefined,
                criteria: undefined
            },
            (msg: any) => { records.push(msg); },
            undefined,
            (msg: any) => { progressMsgs.push(msg); }
        );

        // Deve ter recebido a mensagem de 'started' e 'finished'
        const started = progressMsgs.find(m => m.status === 'started');
        const finished = progressMsgs.find(m => m.status === 'finished');
        assert.ok(started, 'Deve ter recebido mensagem de started');
        assert.ok(finished, 'Deve ter recebido mensagem de finished');

        // O total do summary deve bater com o tamanho do fixture (39306 registros)
        assert.strictEqual(finished.summary.total, 39306, 'Total de registros deve ser 39306');
        assert.strictEqual(finished.summary.founds, 39306, 'Sem filtro, todos devem ser encontrados');
        assert.strictEqual(finished.summary.errors, 0, 'Não devem haver erros');

        // Todos os registros devem ter sido enviados via IPC (excluindo metadata e progress)
        assert.strictEqual(records.length > 0, true, 'Deve ter recebido registros via IPC');
        
        // O primeiro registro deve ter os campos esperados do SIASUS
        const firstRecord = records.find(r => r.PA_CODUNI !== undefined);
        assert.ok(firstRecord, 'Deve ter pelo menos um registro com PA_CODUNI');
        assert.ok('PA_UFMUN' in firstRecord, 'Registro deve conter PA_UFMUN');
        assert.ok('PA_SEXO' in firstRecord, 'Registro deve conter PA_SEXO');
    });

    it('deve filtrar registros por PA_SEXO = F (StringCriteria)', async () => {
        const runner = JobRunner.init(JOB_SCRIPT);

        const records: any[] = [];
        const progressMsgs: any[] = [];

        await runner.exec(
            {
                file: 'PAAC1001.dbc',
                dataPath: join(__dirname, 'fixtures'),
                src: undefined,
                criteria: [
                    { type: 'string', prop: 'PA_SEXO', value: 'F' }
                ]
            },
            (msg: any) => { records.push(msg); },
            undefined,
            (msg: any) => { progressMsgs.push(msg); }
        );

        const finished = progressMsgs.find(m => m.status === 'finished');
        assert.ok(finished, 'Deve ter terminado com sucesso');

        // Com filtro, founds deve ser menor que total
        assert.strictEqual(finished.summary.total, 39306, 'Total deve continuar sendo 39306');
        assert.ok(finished.summary.founds < finished.summary.total, 'Founds com filtro devem ser menores que o total');
        assert.ok(finished.summary.founds > 0, 'Deve ter encontrado pelo menos um registro feminino');

        // Todos os registros recebidos devem ser femininos
        const dataRecords = records.filter(r => r.PA_SEXO !== undefined);
        assert.ok(dataRecords.length > 0, 'Deve ter recebido registros filtrados');
        assert.ok(
            dataRecords.every(r => r.PA_SEXO === 'F'),
            'Todos os registros recebidos devem ter PA_SEXO = F'
        );
    });

    it('deve filtrar registros por PA_UFMUN com ArrayCriteria (múltiplos municípios)', async () => {
        const runner = JobRunner.init(JOB_SCRIPT);

        const records: any[] = [];
        const progressMsgs: any[] = [];

        // Filtrando por dois municípios do Acre: Rio Branco (120040) e Cruzeiro do Sul (120020)
        await runner.exec(
            {
                file: 'PAAC1001.dbc',
                dataPath: join(__dirname, 'fixtures'),
                src: undefined,
                criteria: [
                    { type: 'array', prop: 'PA_UFMUN', value: ['120040', '120020'] }
                ]
            },
            (msg: any) => { records.push(msg); },
            undefined,
            (msg: any) => { progressMsgs.push(msg); }
        );

        const finished = progressMsgs.find(m => m.status === 'finished');
        assert.ok(finished, 'Deve ter terminado com sucesso');

        assert.ok(finished.summary.founds > 0, 'Deve ter encontrado registros dos municípios filtrados');
        assert.ok(finished.summary.founds <= finished.summary.total, 'Founds devem ser menores ou iguais ao total');

        // Todos os registros recebidos devem pertencer a um dos dois municípios
        const dataRecords = records.filter(r => r.PA_UFMUN !== undefined);
        assert.ok(dataRecords.length > 0, 'Deve ter recebido registros filtrados');
        assert.ok(
            dataRecords.every(r => r.PA_UFMUN === '120040' || r.PA_UFMUN === '120020'),
            'Todos os registros recebidos devem ter PA_UFMUN = 120040 ou 120020'
        );
    });

    it('deve retornar 0 registros quando o filtro não corresponde a nenhum dado', async () => {
        const runner = JobRunner.init(JOB_SCRIPT);

        const records: any[] = [];
        const progressMsgs: any[] = [];

        // Filtrar por um município inexistente
        await runner.exec(
            {
                file: 'PAAC1001.dbc',
                dataPath: join(__dirname, 'fixtures'),
                src: undefined,
                criteria: [
                    { type: 'string', prop: 'PA_UFMUN', value: '999999' }
                ]
            },
            (msg: any) => { records.push(msg); },
            undefined,
            (msg: any) => { progressMsgs.push(msg); }
        );

        const finished = progressMsgs.find(m => m.status === 'finished');
        assert.ok(finished, 'Deve ter terminado com sucesso');
        assert.strictEqual(finished.summary.founds, 0, 'Não deve ter encontrado registros com município inexistente');
        
        const dataRecords = records.filter(r => r.PA_UFMUN !== undefined);
        assert.strictEqual(dataRecords.length, 0, 'Não deve ter enviado nenhum registro');
    });

    it('deve aplicar múltiplos critérios simultaneamente (AND lógico)', async () => {
        const runner = JobRunner.init(JOB_SCRIPT);

        const records: any[] = [];
        const progressMsgs: any[] = [];

        // Filtrar por sexo feminino E município de Rio Branco
        await runner.exec(
            {
                file: 'PAAC1001.dbc',
                dataPath: join(__dirname, 'fixtures'),
                src: undefined,
                criteria: [
                    { type: 'string', prop: 'PA_SEXO', value: 'F' },
                    { type: 'string', prop: 'PA_UFMUN', value: '120040' }
                ]
            },
            (msg: any) => { records.push(msg); },
            undefined,
            (msg: any) => { progressMsgs.push(msg); }
        );

        const finished = progressMsgs.find(m => m.status === 'finished');
        assert.ok(finished, 'Deve ter terminado com sucesso');
        assert.ok(finished.summary.founds > 0, 'Deve ter encontrado registros');

        // Todos os registros devem satisfazer AMBOS os critérios
        const dataRecords = records.filter(r => r.PA_SEXO !== undefined);
        assert.ok(
            dataRecords.every(r => r.PA_SEXO === 'F' && r.PA_UFMUN === '120040'),
            'Todos os registros devem satisfazer PA_SEXO = F AND PA_UFMUN = 120040'
        );
    });
});
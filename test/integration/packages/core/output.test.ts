// @filename: output.test.ts

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

// Testar integração do JobRunner (via Event Emitter IPC), Parser com o DbcWriter.
//
// Valida o fluxo de saída completo:
//   1. JobRunner recebe registros reais de um worker via IPC (usando fixture .dbc).
//   2. Um Parser transforma os registros selecionando/convertendo campos.
//   3. DbcWriter escreve os registros transformados em um .dbc de saída.
//   4. DbcReader lê o arquivo de saída para validar consistência (roundtrip).

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, unlinkSync } from 'node:fs';
import { JobRunner } from '../../../../packages/core/src/infra/job/JobRunner.js';
import { DbcWriter } from '../../../../packages/core/src/infra/dbc/DbcWriter.js';
import { DbcReader } from '../../../../packages/core/src/infra/dbc/DbcReader.js';

// @ts-ignore
const __dirname = import.meta.dirname;
const FIXTURE_DIR = join(__dirname, 'fixtures');
const JOB_SCRIPT = join(__dirname, '..', '..', '..', '..', 'packages', 'core', 'src', 'infra', 'job', 'job.ts');

/**
 * Reseta o singleton do DbcWriter para permitir múltiplos testes independentes.
 */
function resetDbcWriter() {
    // @ts-ignore - acesso forçado aos campos estáticos privados
    DbcWriter.instance = undefined;
    // @ts-ignore
    DbcWriter._initPromise = null;
}

describe('Saída (JobRunner IPC + Parser + DbcWriter + DbcReader roundtrip)', () => {
    const OUT_FILE = join(tmpdir(), `output_integration_${Date.now()}.dbc`);

    before(() => {
        assert.ok(
            existsSync(join(FIXTURE_DIR, 'PAAC1001.dbc')),
            'Fixture PAAC1001.dbc deve existir. Execute: npx tsx test/integration/packages/core/fixtures/download_fixture.ts'
        );
    });

    beforeEach(() => {
        resetDbcWriter();
        JobRunner.totalJobs = 0;
        JobRunner.finishedJobs = 0;
        JobRunner.startTime = Date.now();
        JobRunner.globalSummary = { total: 0, founds: 0, errors: 0 };
    });

    after(() => {
        resetDbcWriter();
        // Limpar arquivos temporários gerados
        for (const ext of ['.dbc', '.dbf']) {
            const f = OUT_FILE.replace('.dbc', ext);
            if (existsSync(f)) unlinkSync(f);
        }
    });

    it('deve receber registros via IPC, aplicar parser, escrever com DbcWriter e ler de volta com DbcReader', async () => {
        // 1. Inicializar o DbcWriter com os campos de saída desejados
        const OUTPUT_FIELDS = [
            { name: 'CODUNI', type: 'C' as const, size: 7 },
            { name: 'SEXO', type: 'C' as const, size: 1 },
            { name: 'MUNICIPIO', type: 'C' as const, size: 6 },
        ];

        const writer = await DbcWriter.initialize(OUT_FILE, OUTPUT_FIELDS);

        // 2. Parser que renomeia/seleciona campos
        const parser = {
            dictionary: new Map<string, (value: any) => any>([
                ['PA_CODUNI', (v: string) => v],
                ['PA_SEXO', (v: string) => v],
                ['PA_UFMUN', (v: string) => v],
            ]),
            parse(record: any) {
                return {
                    CODUNI: record.PA_CODUNI,
                    SEXO: record.PA_SEXO,
                    MUNICIPIO: record.PA_UFMUN,
                };
            }
        };

        // 3. Rodar o JobRunner com um filtro restritivo para ter poucos registros
        //    (PA_UFMUN = 999999 daria 0, então usamos PA_SEXO + PA_UFMUN para um subset pequeno)
        const runner = JobRunner.init(JOB_SCRIPT);
        let receivedCount = 0;

        await runner.exec(
            {
                file: 'PAAC1001.dbc',
                dataPath: FIXTURE_DIR,
                src: undefined,
                criteria: [
                    { type: 'string', prop: 'PA_SEXO', value: 'F' },
                    { type: 'string', prop: 'PA_UFMUN', value: '120040' }
                ]
            },
            async (msg: any) => {
                // Ignorar mensagens de metadata
                if (msg && msg.type === 'metadata') return;
                
                // Aplicar o Parser e escrever no DbcWriter
                const parsed = parser.parse(msg);
                await writer.write(parsed);
                receivedCount++;
            },
            undefined, // parser via JobRunner (não usamos aqui, aplicamos manualmente)
            () => {}    // progressCallback silencioso
        );

        assert.ok(receivedCount > 0, `Deve ter recebido registros (recebidos: ${receivedCount})`);

        // 4. Fechar o writer (gera o .dbc de saída)
        await writer.close();
        assert.ok(existsSync(OUT_FILE), 'Arquivo .dbc de saída deve existir');

        // 5. Ler de volta com DbcReader (roundtrip)
        const reader = await DbcReader.load(OUT_FILE);
        
        let readBackCount = 0;
        await reader.forEachRecords(async (record: any) => {
            readBackCount++;
            // Validar que os campos renomeados estão presentes
            assert.ok('CODUNI' in record, 'Registro de saída deve ter CODUNI');
            assert.ok('SEXO' in record, 'Registro de saída deve ter SEXO');
            assert.ok('MUNICIPIO' in record, 'Registro de saída deve ter MUNICIPIO');
            // Validar que os filtros foram respeitados
            assert.strictEqual(record.SEXO, 'F', 'Todos os registros devem ser femininos');
            assert.strictEqual(record.MUNICIPIO, '120040', 'Todos devem ser de Rio Branco');
        });

        reader.remove(false);

        // Consistência final: o que entrou é igual ao que saiu
        assert.strictEqual(
            readBackCount,
            receivedCount,
            `Registros lidos de volta (${readBackCount}) devem ser iguais aos escritos (${receivedCount})`
        );
    });
});
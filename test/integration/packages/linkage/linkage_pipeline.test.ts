// @filename: linkage_pipeline.test.ts

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

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { 
    LinkageStrategy, 
    InMemoryIndex, 
    InMemoryMatchRepository, 
    DbcRecordProvider 
} from '../../../../packages/linkage/dist/index.js';

const FIXTURE_PATH = join(process.cwd(), 'test', 'integration', 'packages', 'core', 'fixtures', 'PAAC1001.dbc');

describe('Integração: Pipeline de Linkage (LinkageStrategy + DbcRecordProvider)', () => {
    
    it('deve cruzar um arquivo DBC contra ele mesmo e encontrar matches perfeitos', async () => {
        assert.ok(existsSync(FIXTURE_PATH), `Fixture não encontrada em ${FIXTURE_PATH}`);

        // Criar uma cópia da fixture para o target para evitar colisões de I/O
        const TARGET_FIXTURE = FIXTURE_PATH.replace('.dbc', '_target.dbc');
        const { copyFileSync, rmSync } = await import('node:fs');
        copyFileSync(FIXTURE_PATH, TARGET_FIXTURE);

        try {
            // 1. Setup Infra em memória
            const index = new InMemoryIndex();
            const repository = new InMemoryMatchRepository();
            
            // 2. Setup Records Providers
            const cohortProvider = new DbcRecordProvider(FIXTURE_PATH, false);
            const targetProvider = new DbcRecordProvider(TARGET_FIXTURE, false);

            // 3. Setup Strategy (Verbose para vermos o progresso)
            const strategy = new LinkageStrategy('SelfLinkage', index, repository, false);

            // Configuração da Coorte
            strategy.cohort(cohortProvider, {
                name: 'SIASUS_COHORT'
            });

            // Configuração do Linkage
            // Refinamos a blocagem para incluir PA_UFMUN para ser mais rápido
            strategy.link(targetProvider, {
                name: 'SIASUS_TARGET',
                type: 'probabilistic',
                scoreStrategy: 'simple',
                on: { PA_UFMUN: 'PA_UFMUN' },
                blocking: { PA_CODUNI: 'PA_CODUNI', PA_SEXO: 'PA_SEXO', PA_UFMUN: 'PA_UFMUN' },
                threshold: 0.9
            });

            // 4. Execução
            await strategy.exec();

            // 5. Validação
            const matches = repository.all;
            assert.ok(matches.length > 0, 'Deveria ter encontrado matches');
            
            const firstMatch = matches[0];
            assert.strictEqual(firstMatch.cohort.PA_CODUNI, firstMatch.target.PA_CODUNI);
            
            console.log(`[Integration Test] Encontrados ${matches.length} matches.`);
        } finally {
            if (existsSync(TARGET_FIXTURE)) rmSync(TARGET_FIXTURE);
        }
    });
});

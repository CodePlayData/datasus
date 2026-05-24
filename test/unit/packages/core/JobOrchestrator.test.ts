// @filename: JobOrchestrator.test.ts

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

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { JobOrchestrator } from '../../../../packages/core/src/infra/job/JobOrchestrator.js';
import { JobScheduler } from '../../../../packages/core/src/infra/job/JobScheduler.js';


class MockGateway {
    async list(subset: any, format?: string) {
        return ['file1.dbc', 'file2.dbc', 'file2.dbc', 'file3.dbc']; // testando duplicates
    }
    
    async get(file: string, dest: string) {
        return; // simulate download
    }
}

describe('JobOrchestrator', () => {
    let gateway: any;
    
    beforeEach(() => {
        gateway = new MockGateway();
    });

    afterEach(() => {
        mock.restoreAll();
    });

    describe('Configuração (JobConfig)', () => {
        it('deve aplicar valores padrão quando nenhuma configuração é fornecida', () => {
            const orchestrator = JobOrchestrator.init(gateway);
            
            assert.strictEqual(orchestrator.config.concurrency, 2, 'Default concurrency deve ser 2');
            assert.strictEqual(orchestrator.config.verbose, true, 'Default verbose deve ser true');
            assert.strictEqual(orchestrator.config.dataPath, './', 'Default dataPath deve ser ./');
        });

        it('deve mesclar configurações parciais mantendo os defaults não sobrescritos', () => {
            const orchestrator = JobOrchestrator.init(gateway, { 
                concurrency: 5,
                dataPath: '/custom/path'
            });
            
            assert.strictEqual(orchestrator.config.concurrency, 5, 'Concurrency deve ser sobrescrito para 10');
            assert.strictEqual(orchestrator.config.dataPath, '/custom/path', 'DataPath deve ser sobrescrito');
            assert.strictEqual(orchestrator.config.verbose, true, 'Verbose deve manter o default true');
        });

        it('deve permitir sobrescrever o verbose para false', () => {
            const orchestrator = JobOrchestrator.init(gateway, { verbose: false });
            
            assert.strictEqual(orchestrator.config.verbose, false);
            assert.strictEqual(orchestrator.config.concurrency, 2, 'Mantém default');
        });

        it('deve aceitar filtros e parser na configuração inicial', () => {
            const filters = [{ type: 'string', prop: 'TEST', value: 'VAL' }] as any;
            const parser = { parse: (r: any) => r } as any;
            
            const orchestrator = JobOrchestrator.init(gateway, { filters, parser });
            
            assert.deepStrictEqual(orchestrator.config.filters, filters);
            assert.strictEqual(orchestrator.config.parser, parser);
        });
    });

    it('deve inicializar e definir chunks corretamente via subset()', async () => {
        const orchestrator = JobOrchestrator.init(gateway, { concurrency: 2, dataPath: './test-data' });
        
        await orchestrator.subset({ src: 'test-src' } as any);
        
        // Deve remover duplicatas (file2.dbc aparecia 2x)
        assert.deepStrictEqual(orchestrator.files, ['file1.dbc', 'file2.dbc', 'file3.dbc']);
        
        // Como o max concurrent é 2 e temos 3 files, deve gerar 2 chunks: [file1, file2], [file3]
        assert.strictEqual(orchestrator.chunks.length, 2);
        assert.deepStrictEqual(orchestrator.chunks[0], ['file1.dbc', 'file2.dbc']);
        assert.deepStrictEqual(orchestrator.chunks[1], ['file3.dbc']);
    });

    it('deve baixar arquivos e agendar jobs corretamente via exec()', async () => {
        const orchestrator = JobOrchestrator.init(gateway, { concurrency: 2, dataPath: './test-data', verbose: false });
        await orchestrator.subset({ src: 'test-src' } as any);

        // Mock gateway get to count calls
        const getSpy = mock.method(gateway, 'get', async () => {});

        // Mock JobScheduler to avoid running real jobs
        const execSpy = mock.method(JobScheduler.prototype, 'exec', async () => {});

        await orchestrator.exec();

        // Gateway gets called for each file
        assert.strictEqual(getSpy.mock.callCount(), 3);
        
        // JobScheduler.exec gets called for each chunk (we have 2 chunks)
        assert.strictEqual(execSpy.mock.callCount(), 2);

        // After completion, files and chunks should be reset
        assert.deepStrictEqual(orchestrator.files, []);
        assert.deepStrictEqual(orchestrator.chunks, []);
    });

    it('deve respeitar verbose: false e não emitir logs no console ou stdout', async () => {
        const orchestrator = JobOrchestrator.init(gateway, { verbose: false });
        await orchestrator.subset({ src: 'test-src' } as any);

        const logSpy = mock.method(console, 'log');
        const stdoutSpy = mock.method(process.stdout, 'write');
        mock.method(JobScheduler.prototype, 'exec', async () => {});

        await orchestrator.exec();

        // Verificamos se houve chamadas ao console.log
        // Nota: O teste unitário já silencia por padrão, mas aqui garantimos via mock.
        assert.strictEqual(logSpy.mock.callCount(), 0, 'Console.log não deveria ser chamado');
        
        // Verificamos se o JobRunner.printGlobalSummary foi chamado (ele escreve no stdout)
        // Como o exec do orchestrator só chama se verbose for true, o callCount deve ser 0
        const stdoutCalls = stdoutSpy.mock.calls.filter(c => String(c.arguments[0]).includes('RESUMO GLOBAL'));
        assert.strictEqual(stdoutCalls.length, 0, 'Resumo global não deveria ser impresso');
    });

    it('deve usar o dataPath da config para definir o destino do download', async () => {
        const customPath = './custom-output-dir';
        const orchestrator = JobOrchestrator.init(gateway, { dataPath: customPath, verbose: false });
        await orchestrator.subset({ src: 'test-src' } as any);

        const getSpy = mock.method(gateway, 'get', async () => {});
        mock.method(JobScheduler.prototype, 'exec', async () => {});

        await orchestrator.exec();

        // O gateway.get deve ser chamado com o path resolvido
        const firstCall = getSpy.mock.calls[0];
        const destPath = firstCall.arguments[1] as string;
        
        assert.ok(destPath.includes('custom-output-dir'), `O caminho de destino ${destPath} deveria conter o dataPath customizado`);
    });
});

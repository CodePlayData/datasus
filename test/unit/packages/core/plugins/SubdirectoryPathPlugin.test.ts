// @filename: SubdirectoryPathPlugin.test.ts

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
import { SubdirectoryPathPlugin } from '../../../../../packages/core/src/interface/gateway/plugins/SubdirectoryPathPlugin.js';

describe('SubdirectoryPathPlugin', () => {
    it('deve resolver o caminho de listagem adicionando subdiretório baseado no input.src', () => {
        const plugin = new SubdirectoryPathPlugin();
        const resolved = plugin.resolveListPath('/base/path/', { src: 'ST' });
        assert.strictEqual(resolved, '/base/path/ST/');
    });

    it('deve adicionar barra ao basePath se não existir na listagem', () => {
        const plugin = new SubdirectoryPathPlugin();
        const resolved = plugin.resolveListPath('/base/path', { src: 'DC' });
        assert.strictEqual(resolved, '/base/path/DC/');
    });

    it('deve manter o caminho base se input não contiver src', () => {
        const plugin = new SubdirectoryPathPlugin();
        const resolved = plugin.resolveListPath('/base/path/', {} as any);
        assert.strictEqual(resolved, '/base/path/');
    });

    it('deve resolver o caminho de download extraindo o prefixo do nome do arquivo', () => {
        const plugin = new SubdirectoryPathPlugin();
        const resolved = plugin.resolveGetPath('/base/path/', 'STRJ2401.dbc');
        assert.strictEqual(resolved, '/base/path/ST/STRJ2401.dbc');
    });

    it('deve respeitar caminhos que já possuem subdiretório no nome do arquivo', () => {
        const plugin = new SubdirectoryPathPlugin();
        const resolved = plugin.resolveGetPath('/base/path/', 'ST/STRJ2401.dbc');
        assert.strictEqual(resolved, '/base/path/ST/STRJ2401.dbc');
    });

    it('deve permitir configurar prefixLength customizado', () => {
        const plugin = new SubdirectoryPathPlugin(3);
        const resolved = plugin.resolveGetPath('/base/path/', 'ACFUF2401.dbc');
        assert.strictEqual(resolved, '/base/path/ACF/ACFUF2401.dbc');
    });
});

// @filename: BasicFTPClient.test.ts

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

import { describe, it, mock, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { Client as FtpClient } from 'basic-ftp/dist/Client.js';
import { BasicFTPClient } from '../../../../packages/core/src/infra/ftp/BasicFTPClient.js';

describe('BasicFTPClient', () => {
    afterEach(() => {
        mock.restoreAll();
    });

    it('deve conectar com sucesso', async () => {
        const accessSpy = mock.method(FtpClient.prototype, 'access', async () => {});
        const client = await BasicFTPClient.connect('ftp.example.com');

        assert.ok(client instanceof BasicFTPClient);
        assert.strictEqual(accessSpy.mock.callCount(), 1);
        assert.deepStrictEqual(accessSpy.mock.calls[0].arguments[0], { host: 'ftp.example.com' });
    });

    describe('CouldNotConnect', () => {
        it('deve chamar o fallback onError quando a conexão falha', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {
                throw new Error('Connection refused');
            });

            let capturedError: Error | undefined;
            let capturedHost: string | undefined;

            await BasicFTPClient.connect(
                'ftp.fail.com',
                async (error, host) => {
                    capturedError = error;
                    capturedHost = host;
                }
            );

            assert.ok(capturedError, 'Fallback deveria ter sido chamado');
            assert.strictEqual(capturedError!.name, 'CouldNotConnect');
            assert.strictEqual(capturedHost, 'ftp.fail.com');
        });

        it('deve lançar CouldNotConnect quando nenhum fallback é fornecido', async () => {
            mock.method(FtpClient.prototype, 'access', async () => {
                throw new Error('Connection refused');
            });

            await assert.rejects(
                () => BasicFTPClient.connect('ftp.fail.com'),
                (error: Error) => {
                    assert.strictEqual(error.name, 'CouldNotConnect');
                    return true;
                }
            );
        });
    });
});

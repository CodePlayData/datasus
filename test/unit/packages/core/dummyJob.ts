// @filename: dummyJob.ts

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

process.on('message', (msg: any) => {
    if (msg.file === 'test1.dbc') {
        process.send?.({ type: 'metadata', fields: [{ name: 'ID' }] });
        process.send?.({ type: 'progress', status: 'started', file: 'test1.dbc', pid: process.pid });
        process.send?.({ type: 'progress', status: 'running', pct: 50, processed: 1, total: 2, file: 'test1.dbc', pid: process.pid });
        process.send?.({ type: 'progress', status: 'finished', pct: 100, summary: { total: 2, founds: 2, errors: 0 }, file: 'test1.dbc', pid: process.pid });
        process.exit(0);
    } else if (msg.file === 'test2.dbc') {
        process.send?.({ ID: 'test-record' });
        process.exit(0);
    } else if (msg.file === 'error.dbc') {
        process.exit(1);
    }
});

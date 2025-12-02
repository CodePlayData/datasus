// @filename: Command.ts

/*
 *     Copyright 2025 Pedro Paulo Teixeira dos Santos

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

/**
 * Simple command pattern contract used across the infra layer.
 *
 * Implementations may expose init and/or exec methods to standardize
 * creation and execution flows.
 */
export interface Command {
    /** Optional factory-like initializer. */
    init?(...params: any[]): any
    /** Optional execution entry point. */
    exec?(...params: any[]): any
}
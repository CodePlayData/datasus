// @filename: FHIRStore.ts

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

import {
    Resource,
    Organization,
    CareTeam,
    Patient,
    Encounter,
    Condition,
    Procedure,
    Observation
} from "../types.js";

export class FHIRStore {
    private organizations = new Map<string, Organization>();
    private careTeams = new Map<string, CareTeam>();
    private patients = new Map<string, Patient>();
    private encounters = new Map<string, Encounter>();
    private conditions = new Map<string, Condition>();
    private procedures = new Map<string, Procedure>();
    private observations = new Map<string, Observation>();

    add(resource: Resource) {
        if (!resource || !resource.resourceType) return;

        switch (resource.resourceType) {
            case 'Organization':
                if (resource.id) this.organizations.set(resource.id, resource as Organization);
                break;
            case 'CareTeam':
                if (resource.id) this.careTeams.set(resource.id, resource as CareTeam);
                break;
            case 'Patient':
                if (resource.id) this.patients.set(resource.id, resource as Patient);
                break;
            case 'Encounter':
                if (resource.id) this.encounters.set(resource.id, resource as Encounter);
                break;
            case 'Condition':
                if (resource.id) this.conditions.set(resource.id, resource as Condition);
                break;
            case 'Procedure':
                if (resource.id) this.procedures.set(resource.id, resource as Procedure);
                break;
            case 'Observation':
                if (resource.id) this.observations.set(resource.id, resource as Observation);
                break;
        }
    }

    addAll(resources: Resource[]) {
        for (const res of resources) {
            this.add(res);
        }
    }

    getOrganization(id: string): Organization | undefined {
        return this.organizations.get(id);
    }

    getCareTeam(id: string): CareTeam | undefined {
        return this.careTeams.get(id);
    }

    getOrganizations(filter?: (org: Organization) => boolean): Organization[] {
        const list = Array.from(this.organizations.values());
        return filter ? list.filter(filter) : list;
    }

    getCareTeams(filter?: (team: CareTeam) => boolean): CareTeam[] {
        const list = Array.from(this.careTeams.values());
        return filter ? list.filter(filter) : list;
    }

    getEncounters(filter?: (enc: Encounter) => boolean): Encounter[] {
        const list = Array.from(this.encounters.values());
        return filter ? list.filter(filter) : list;
    }

    getConditions(filter?: (cond: Condition) => boolean): Condition[] {
        const list = Array.from(this.conditions.values());
        return filter ? list.filter(filter) : list;
    }

    getProcedures(filter?: (proc: Procedure) => boolean): Procedure[] {
        const list = Array.from(this.procedures.values());
        return filter ? list.filter(filter) : list;
    }

    getPatients(filter?: (pat: Patient) => boolean): Patient[] {
        const list = Array.from(this.patients.values());
        return filter ? list.filter(filter) : list;
    }

    clear() {
        this.organizations.clear();
        this.careTeams.clear();
        this.patients.clear();
        this.encounters.clear();
        this.conditions.clear();
        this.procedures.clear();
        this.observations.clear();
    }
}

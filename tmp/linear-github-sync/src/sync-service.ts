// @ts-nocheck
import { reconcilePair } from "./reconcile.js";
export class SyncEngine {
    store;
    github;
    linear;
    repository;
    teamId;
    projectId;
    constructor(options){
        this.store = options.store;
        this.github = options.github;
        this.linear = options.linear;
        this.repository = options.repository;
        this.teamId = options.teamId;
        this.projectId = options.projectId;
    }
    async processGitHubIssue(number) {
        const githubIssue = await this.github.getIssue(number);
        let mapping = this.store.getByGitHub(number);
        if (!mapping) {
            mapping = await this.findMappingFromGitHubMarker(githubIssue) ?? await this.findOrCreateLinearIssue(githubIssue);
            this.store.saveMapping(mapping);
            if (mapping.lastSynced) return;
        }
        await this.syncMapped(mapping);
    }
    async processLinearIssue(id) {
        const linearIssue = await this.linear.getIssue(id);
        if (this.teamId && linearIssue.teamId !== this.teamId || this.projectId && linearIssue.projectId !== this.projectId) {
            return;
        }
        let mapping = this.store.getByLinear(id);
        if (!mapping) {
            mapping = await this.findMappingFromLinearMarker(linearIssue) ?? await this.findOrCreateGitHubIssue(linearIssue);
            this.store.saveMapping(mapping);
            if (mapping.lastSynced) return;
        }
        await this.syncMapped(mapping);
    }
    async reconcileAll() {
        const githubIssues = await this.github.listIssues();
        const errors = [];
        for (const issue of githubIssues){
            try {
                await this.processGitHubIssue(issue.number);
            } catch (error) {
                errors.push("GitHub issue #" + issue.number + ": " + errorMessage(error));
            }
        }
        const linearIssues = await this.linear.listIssues();
        for (const issue of linearIssues){
            try {
                await this.processLinearIssue(issue.id);
            } catch (error) {
                errors.push("Linear issue " + issue.id + ": " + errorMessage(error));
            }
        }
        if (errors.length) throw new Error("Reconciliation had " + errors.length + " failure(s): " + errors.join(" | "));
        return {
            githubIssues: githubIssues.length,
            linearIssues: linearIssues.length
        };
    }
    async findMappingFromGitHubMarker(issue) {
        if (!issue.marker?.startsWith("linear:")) return undefined;
        const linearId = issue.marker.slice("linear:".length);
        if (!linearId) return undefined;
        try {
            const linearIssue = await this.linear.getIssue(linearId);
            const expected = this.githubMarker(issue.number);
            if (linearIssue.marker !== expected) return undefined;
            return {
                githubNumber: issue.number,
                linearId
            };
        } catch  {
            return undefined;
        }
    }
    async findMappingFromLinearMarker(issue) {
        const prefix = "github:" + this.repository + "#";
        if (!issue.marker?.startsWith(prefix)) return undefined;
        const number = Number(issue.marker.slice(prefix.length));
        if (!Number.isSafeInteger(number) || number <= 0) return undefined;
        try {
            const githubIssue = await this.github.getIssue(number);
            if (githubIssue.marker !== this.linearMarker(issue.id)) return undefined;
            return {
                githubNumber: number,
                linearId: issue.id
            };
        } catch  {
            return undefined;
        }
    }
    async findOrCreateLinearIssue(issue) {
        const marker = this.githubMarker(issue.number);
        const existing = await this.linear.findByMarker(marker);
        if (existing) return {
            githubNumber: issue.number,
            linearId: existing.id
        };
        const created = await this.linear.createIssue(issue, marker);
        return {
            githubNumber: issue.number,
            linearId: created.id,
            lastSynced: toSnapshot(issue)
        };
    }
    async findOrCreateGitHubIssue(issue) {
        const marker = this.linearMarker(issue.id);
        const existing = await this.github.findByMarker(marker);
        if (existing?.number) return {
            githubNumber: existing.number,
            linearId: issue.id
        };
        const created = await this.github.createIssue(issue, marker);
        if (!created.number) throw new Error("GitHub did not return the created issue number");
        return {
            githubNumber: created.number,
            linearId: issue.id,
            lastSynced: toSnapshot(issue)
        };
    }
    async syncMapped(mapping) {
        const [linearIssue, githubIssue] = await Promise.all([
            this.linear.getIssue(mapping.linearId),
            this.github.getIssue(mapping.githubNumber)
        ]);
        const result = await reconcilePair({
            linearId: mapping.linearId,
            githubNumber: mapping.githubNumber,
            linear: linearIssue,
            github: githubIssue,
            lastSynced: mapping.lastSynced,
            updateGitHub: (number, issue)=>this.github.updateIssue(number, issue, this.linearMarker(mapping.linearId)),
            updateLinear: (id, issue)=>this.linear.updateIssue(id, issue, this.githubMarker(mapping.githubNumber))
        });
        this.store.saveMapping({
            ...mapping,
            lastSynced: result.lastSynced
        });
    }
    githubMarker(number) {
        return "github:" + this.repository + "#" + number;
    }
    linearMarker(id) {
        return "linear:" + id;
    }
}
function toSnapshot(issue) {
    return {
        title: issue.title,
        description: issue.description,
        state: issue.state,
        labels: [
            ...issue.labels
        ],
        url: issue.url,
        updatedAt: issue.updatedAt
    };
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

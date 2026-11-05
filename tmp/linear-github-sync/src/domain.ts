// @ts-nocheck
export type SyncState = "open" | "closed";
export interface NormalizedIssue {
  title: string;
  description: string;
  state: SyncState;
  labels: string[];
  url: string;
  updatedAt: string;
}
export interface ConflictInput {
  linear: NormalizedIssue;
  github: NormalizedIssue;
  lastSynced?: NormalizedIssue;
}
export interface ConflictResult {
  winner: "linear" | "github" | "none";
  reason: "linear-only-change" | "github-only-change" | "latest-timestamp" | "identical-change" | "unchanged" | "initial-sync";
}
export interface MergeInput extends ConflictInput {}

function fingerprint(issue) {
    return JSON.stringify({
        title: issue.title.trim(),
        description: issue.description.trim(),
        state: issue.state,
        labels: [
            ...new Set(issue.labels.map((label)=>label.trim()))
        ].sort((a, b)=>a.localeCompare(b))
    });
}
export function resolveConflict(input) {
    const linearSnapshot = fingerprint(input.linear);
    const githubSnapshot = fingerprint(input.github);
    const lastSnapshot = input.lastSynced ? fingerprint(input.lastSynced) : undefined;
    if (linearSnapshot === githubSnapshot) {
        return {
            winner: 'none',
            reason: input.lastSynced ? 'identical-change' : 'initial-sync'
        };
    }
    if (lastSnapshot !== undefined) {
        const linearChanged = linearSnapshot !== lastSnapshot;
        const githubChanged = githubSnapshot !== lastSnapshot;
        if (linearChanged && !githubChanged) return {
            winner: 'linear',
            reason: 'linear-only-change'
        };
        if (githubChanged && !linearChanged) return {
            winner: 'github',
            reason: 'github-only-change'
        };
        if (!linearChanged && !githubChanged) return {
            winner: 'none',
            reason: 'unchanged'
        };
    }
    const linearTime = Date.parse(input.linear.updatedAt);
    const githubTime = Date.parse(input.github.updatedAt);
    if (!Number.isFinite(linearTime) || !Number.isFinite(githubTime)) {
        throw new Error('Issue updatedAt values must be valid timestamps');
    }
    return linearTime >= githubTime ? {
        winner: 'linear',
        reason: 'latest-timestamp'
    } : {
        winner: 'github',
        reason: 'latest-timestamp'
    };
}
export function contentFingerprint(issue) {
    return fingerprint(issue);
}
export function mergeIssuePair(input) {
    const decision = resolveConflict(input);
    if (!input.lastSynced) return input[decision.winner === "github" ? "github" : "linear"];
    const fields = [
        "title",
        "description",
        "state",
        "labels"
    ];
    const merged = {
        ...input.lastSynced
    };
    const linearTime = Date.parse(input.linear.updatedAt);
    const githubTime = Date.parse(input.github.updatedAt);
    for (const field of fields){
        const linearValue = input.linear[field];
        const githubValue = input.github[field];
        const baselineValue = input.lastSynced[field];
        const linearChanged = valueFingerprint(field, linearValue) !== valueFingerprint(field, baselineValue);
        const githubChanged = valueFingerprint(field, githubValue) !== valueFingerprint(field, baselineValue);
        if (linearChanged && githubChanged) {
            if (valueFingerprint(field, linearValue) === valueFingerprint(field, githubValue)) {
                merged[field] = linearValue;
            } else {
                if (!Number.isFinite(linearTime) || !Number.isFinite(githubTime)) {
                    throw new Error("Issue updatedAt values must be valid timestamps");
                }
                merged[field] = linearTime >= githubTime ? linearValue : githubValue;
            }
        } else if (linearChanged) {
            merged[field] = linearValue;
        } else if (githubChanged) {
            merged[field] = githubValue;
        }
    }
    return {
        ...merged,
        url: input.linear.url,
        updatedAt: Number.isFinite(linearTime) && Number.isFinite(githubTime) ? new Date(Math.max(linearTime, githubTime)).toISOString() : input.linear.updatedAt
    };
}
function valueFingerprint(field, value) {
    if (field === "labels") {
        return JSON.stringify([
            ...new Set(value.map((label)=>label.trim()))
        ].sort((a, b)=>a.localeCompare(b)));
    }
    return String(value).trim();
}

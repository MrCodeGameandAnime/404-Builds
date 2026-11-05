// @ts-nocheck
export interface AppConfig {
  port: number; dataDir: string; syncIntervalMs: number;
  githubToken: string; githubRepository: string; githubOwner: string; githubRepo: string; githubWebhookSecret: string;
  linearApiKey: string; linearTeamId: string; linearProjectId: string;
  linearOpenStateId: string; linearClosedStateId: string; linearWebhookSecret: string;
}
function required(env, key) {
    const value = env[key]?.trim();
    if (!value) throw new Error("Missing required environment variable: " + key);
    return value;
}
function positiveNumber(value, fallback, name) {
    const parsed = value === undefined ? fallback : Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(name + " must be a positive integer");
    return parsed;
}
export function loadConfig(env = process.env) {
    const repository = required(env, "GITHUB_REPOSITORY");
    const parts = repository.split("/");
    if (parts.length !== 2 || parts.some((part)=>!part.trim())) {
        throw new Error("GITHUB_REPOSITORY must use owner/repository format");
    }
    return {
        port: positiveNumber(env.PORT, 3000, "PORT"),
        syncIntervalMs: positiveNumber(env.SYNC_INTERVAL_MS, 300000, "SYNC_INTERVAL_MS"),
        dataDir: env.DATA_DIR?.trim() || "./data",
        githubToken: required(env, "GITHUB_TOKEN"),
        githubRepository: repository,
        githubOwner: parts[0],
        githubRepo: parts[1],
        githubWebhookSecret: required(env, "GITHUB_WEBHOOK_SECRET"),
        linearApiKey: required(env, "LINEAR_API_KEY"),
        linearTeamId: required(env, "LINEAR_TEAM_ID"),
        linearProjectId: required(env, "LINEAR_PROJECT_ID"),
        linearOpenStateId: required(env, "LINEAR_OPEN_STATE_ID"),
        linearClosedStateId: required(env, "LINEAR_CLOSED_STATE_ID"),
        linearWebhookSecret: required(env, "LINEAR_WEBHOOK_SECRET")
    };
}

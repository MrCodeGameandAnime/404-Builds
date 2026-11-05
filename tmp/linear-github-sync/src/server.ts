// @ts-nocheck
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { SyncStore } from "./store.js";
import { verifySignature } from "./security.js";
import { GitHubApi, LinearApi } from "./providers.js";
import { SyncEngine } from "./sync-service.js";
const MAX_WEBHOOK_BYTES = 1024 * 1024;
function json(response, status, data) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(data));
}
async function readRawBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request){
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_WEBHOOK_BYTES) throw new Error("Webhook body exceeds the 1 MiB limit");
        chunks.push(buffer);
    }
    return Buffer.concat(chunks);
}
function eventHash(provider, body) {
    return provider + ":" + createHash("sha256").update(body).digest("hex");
}
function sendError(response, status, message) {
    json(response, status, {
        error: message
    });
}
export async function route(request, response, config, engine, store, enqueue) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
        json(response, 200, {
            status: "ok",
            service: "linear-github-issue-sync"
        });
        return;
    }
    if (request.method !== "POST" || ![
        "/webhooks/github",
        "/webhooks/linear"
    ].includes(url.pathname)) {
        sendError(response, 404, "Not found");
        return;
    }
    let body;
    try {
        body = await readRawBody(request);
    } catch  {
        sendError(response, 413, "Webhook payload is too large");
        return;
    }
    try {
        if (url.pathname === "/webhooks/github") {
            const signature = request.headers["x-hub-signature-256"];
            const header = Array.isArray(signature) ? signature[0] : signature;
            if (!verifySignature(body, header, config.githubWebhookSecret)) {
                sendError(response, 401, "Invalid webhook signature");
                return;
            }
            const deliveryHeader = request.headers["x-github-delivery"];
            const delivery = Array.isArray(deliveryHeader) ? deliveryHeader[0] : deliveryHeader;
            const key = delivery ? "github:" + delivery : eventHash("github", body);
            if (store.hasEvent(key)) {
                json(response, 202, {
                    status: "duplicate"
                });
                return;
            }
            const eventHeader = request.headers["x-github-event"];
            const event = Array.isArray(eventHeader) ? eventHeader[0] : eventHeader;
            const payload = JSON.parse(body.toString("utf8"));
            if (event !== "issues" || !payload.issue?.number || payload.issue.pull_request || ![
                "opened",
                "edited",
                "closed",
                "reopened",
                "labeled",
                "unlabeled",
                "assigned",
                "unassigned"
            ].includes(payload.action ?? "")) {
                store.markEvent(key);
                json(response, 202, {
                    status: "ignored"
                });
                return;
            }
            await enqueue(async ()=>{
                if (store.hasEvent(key)) return;
                await engine.processGitHubIssue(payload.issue.number);
                store.markEvent(key);
            });
            json(response, 202, {
                status: "accepted"
            });
            return;
        }
        const signatureHeader = request.headers["linear-signature"];
        const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
        if (!verifySignature(body, signature, config.linearWebhookSecret)) {
            sendError(response, 401, "Invalid webhook signature");
            return;
        }
        const payload = JSON.parse(body.toString("utf8"));
        const timestampHeader = request.headers["linear-timestamp"];
        const timestampValue = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;
        const webhookTimestamp = Number(payload.webhookTimestamp ?? timestampValue);
        if (!Number.isFinite(webhookTimestamp) || Math.abs(Date.now() - webhookTimestamp) > 5 * 60 * 1000) {
            sendError(response, 401, "Stale or missing webhook timestamp");
            return;
        }
        const deliveryHeader = request.headers["linear-delivery"];
        const delivery = Array.isArray(deliveryHeader) ? deliveryHeader[0] : deliveryHeader;
        const key = delivery ? "linear:" + delivery : eventHash("linear", body);
        if (store.hasEvent(key)) {
            json(response, 202, {
                status: "duplicate"
            });
            return;
        }
        if (payload.type !== "Issue" || !payload.data?.id || ![
            "create",
            "update"
        ].includes(payload.action ?? "")) {
            store.markEvent(key);
            json(response, 202, {
                status: "ignored"
            });
            return;
        }
        await enqueue(async ()=>{
            if (store.hasEvent(key)) return;
            await engine.processLinearIssue(payload.data.id);
            store.markEvent(key);
        });
        json(response, 202, {
            status: "accepted"
        });
    } catch (error) {
        console.error("Webhook processing failed:", error instanceof Error ? error.message : String(error));
        sendError(response, 500, "Webhook processing failed; retry is safe");
    }
}
function createSerialQueue() {
    let tail = Promise.resolve();
    return (work)=>{
        const current = tail.then(work, work);
        tail = current.then(()=>undefined, ()=>undefined);
        return current;
    };
}
export function createSyncServer(config, engine, store, enqueue = createSerialQueue()) {
    return createServer((request, response)=>{
        void route(request, response, config, engine, store, enqueue);
    });
}
async function main() {
    const config = loadConfig();
    const store = new SyncStore(join(config.dataDir, "sync.sqlite"));
    const github = new GitHubApi(config);
    const linear = new LinearApi(config);
    const engine = new SyncEngine({
        store,
        github,
        linear,
        repository: config.githubRepository,
        teamId: config.linearTeamId,
        projectId: config.linearProjectId
    });
    const enqueue = createSerialQueue();
    const server = createSyncServer(config, engine, store, enqueue);
    server.listen(config.port, ()=>console.info("Linear–GitHub sync listening on port " + config.port));
    const timer = setInterval(()=>{
        void enqueue(()=>engine.reconcileAll()).then((summary)=>console.info("Scheduled sync completed", summary)).catch((error)=>console.error("Scheduled sync failed:", error instanceof Error ? error.message : String(error)));
    }, config.syncIntervalMs);
    timer.unref();
    void enqueue(()=>engine.reconcileAll()).then((summary)=>console.info("Initial sync completed", summary)).catch((error)=>console.error("Initial sync failed:", error instanceof Error ? error.message : String(error)));
    const shutdown = ()=>{
        clearInterval(timer);
        server.close(()=>store.close());
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
}
const processArgs = globalThis.process?.argv;
if (processArgs?.[1] && pathToFileURL(processArgs[1]).href === import.meta.url) {
    void main().catch((error)=>{
        console.error("Startup failed:", error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}

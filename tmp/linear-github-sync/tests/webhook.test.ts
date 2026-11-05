import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createSyncServer } from "../src/server.js";

test("health endpoint and signed GitHub webhook work; duplicate deliveries are ignored", async () => {
  const seen = new Set<string>();
  const store = {
    hasEvent: (key: string) => seen.has(key),
    markEvent: (key: string) => { seen.add(key); },
  };
  const processed: number[] = [];
  const processedLinear: string[] = [];
  const engine = {
    processGitHubIssue: async (number: number) => { processed.push(number); },
    processLinearIssue: async (id: string) => { processedLinear.push(id); },
  };
  const config = {
    githubWebhookSecret: "github-secret",
    linearWebhookSecret: "linear-secret",
  };
  const server = createSyncServer(config, engine, store);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = "http://127.0.0.1:" + address.port;
  try {
    const health = await fetch(baseUrl + "/health");
    assert.equal(health.status, 200);

    const body = JSON.stringify({ action: "opened", issue: { number: 41 } });
    const signature = "sha256=" + createHmac("sha256", "github-secret").update(body).digest("hex");
    const headers = {
      "content-type": "application/json",
      "x-hub-signature-256": signature,
      "x-github-delivery": "delivery-41",
      "x-github-event": "issues",
    };
    const first = await fetch(baseUrl + "/webhooks/github", { method: "POST", headers, body });
    assert.equal(first.status, 202);
    assert.deepEqual(processed, [41]);

    const duplicate = await fetch(baseUrl + "/webhooks/github", { method: "POST", headers, body });
    assert.equal(duplicate.status, 202);
    assert.deepEqual(processed, [41]);

    const rejected = await fetch(baseUrl + "/webhooks/github", {
      method: "POST",
      headers: { ...headers, "x-hub-signature-256": "sha256=" + "0".repeat(64), "x-github-delivery": "invalid" },
      body,
    });
    assert.equal(rejected.status, 401);

    const linearBody = JSON.stringify({
      action: "update",
      type: "Issue",
      data: { id: "lin-1" },
      webhookTimestamp: Date.now(),
    });
    const linearSignature = createHmac("sha256", "linear-secret").update(linearBody).digest("hex");
    const linearHeaders = {
      "content-type": "application/json",
      "linear-signature": linearSignature,
      "linear-delivery": "linear-delivery-1",
    };
    const linearResponse = await fetch(baseUrl + "/webhooks/linear", {
      method: "POST",
      headers: linearHeaders,
      body: linearBody,
    });
    assert.equal(linearResponse.status, 202);
    assert.deepEqual(processedLinear, ["lin-1"]);

    const staleBody = JSON.stringify({
      action: "update",
      type: "Issue",
      data: { id: "lin-old" },
      webhookTimestamp: Date.now() - 10 * 60 * 1000,
    });
    const staleSignature = createHmac("sha256", "linear-secret").update(staleBody).digest("hex");
    const stale = await fetch(baseUrl + "/webhooks/linear", {
      method: "POST",
      headers: { ...linearHeaders, "linear-signature": staleSignature, "linear-delivery": "linear-old" },
      body: staleBody,
    });
    assert.equal(stale.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

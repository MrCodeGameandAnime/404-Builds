import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SyncStore } from "../src/store.js";

test("mapping lookup is bidirectional and event keys are idempotent", async () => {
  const directory = await mkdtemp(join(tmpdir(), "linear-github-sync-"));
  const store = new SyncStore(join(directory, "state.sqlite"));
  try {
    const lastSynced = {
      title: "Issue",
      description: "Details",
      state: "open" as const,
      labels: ["bug"],
      url: "https://github.com/acme/app/issues/9",
      updatedAt: "2026-10-11T10:00:00.000Z",
    };
    const mapping = { githubNumber: 9, linearId: "lin_123", lastSynced };
    store.saveMapping(mapping);
    assert.deepEqual(store.getByGitHub(9), mapping);
    assert.deepEqual(store.getByLinear("lin_123"), mapping);
    assert.equal(store.hasEvent("gh:delivery-1"), false);
    store.markEvent("gh:delivery-1");
    assert.equal(store.hasEvent("gh:delivery-1"), true);
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePair } from "../src/reconcile.js";

test("merges independent edits made on opposite providers", async () => {
  const base = {
    title: "base",
    description: "body",
    state: "open" as const,
    labels: [],
    url: "",
    updatedAt: "2026-10-11T10:00:00.000Z",
  };
  const linear = { ...base, description: "Linear-only edit", updatedAt: "2026-10-11T10:01:00.000Z" };
  const github = { ...base, title: "GitHub-only edit", updatedAt: "2026-10-11T10:02:00.000Z" };
  const writes: Array<"linear" | "github"> = [];
  const result = await reconcilePair({
    linearId: "lin-1",
    githubNumber: 1,
    linear,
    github,
    lastSynced: base,
    updateGitHub: async () => { writes.push("github"); },
    updateLinear: async () => { writes.push("linear"); },
  });
  assert.equal(result.lastSynced.title, "GitHub-only edit");
  assert.equal(result.lastSynced.description, "Linear-only edit");
  assert.equal(writes.length, 2);
});

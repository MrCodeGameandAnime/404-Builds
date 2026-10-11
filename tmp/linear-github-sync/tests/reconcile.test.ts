import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePair } from "../src/reconcile.js";

const base = {
  title: "base",
  description: "body",
  state: "open" as const,
  labels: ["bug"],
  url: "",
  updatedAt: "2026-10-11T10:00:00.000Z",
};

test("propagates the winning issue once and records its baseline", async () => {
  const linear = { ...base, title: "linear edit", updatedAt: "2026-10-11T10:01:00.000Z" };
  const github = { ...base, title: "github edit", updatedAt: "2026-10-11T10:02:00.000Z" };
  let githubWrites = 0;
  let linearWrites = 0;
  const result = await reconcilePair({
    linearId: "lin-1",
    githubNumber: 1,
    linear,
    github,
    lastSynced: base,
    updateGitHub: async () => { githubWrites += 1; },
    updateLinear: async () => { linearWrites += 1; },
  });
  assert.equal(result.winner, "github");
  assert.equal(githubWrites, 0);
  assert.equal(linearWrites, 1);
  assert.equal(result.lastSynced.title, "github edit");
});

test("does not write when neither side changed", async () => {
  const result = await reconcilePair({
    linearId: "lin-1",
    githubNumber: 1,
    linear: base,
    github: base,
    lastSynced: base,
    updateGitHub: async () => { throw new Error("unexpected write"); },
    updateLinear: async () => { throw new Error("unexpected write"); },
  });
  assert.equal(result.winner, "none");
});

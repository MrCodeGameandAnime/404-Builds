import assert from "node:assert/strict";
import test from "node:test";
import { resolveConflict, type NormalizedIssue } from "../src/domain.js";

const base: NormalizedIssue = {
  title: "base",
  description: "body",
  state: "open",
  labels: ["bug"],
  url: "",
  updatedAt: "2026-10-11T10:00:00.000Z",
};

test("a single changed side wins over an unrelated newer timestamp", () => {
  const github = { ...base, title: "github edit", updatedAt: "2026-10-11T10:01:00.000Z" };
  const linear = { ...base, updatedAt: "2026-10-11T10:09:00.000Z" };
  assert.equal(resolveConflict({ linear, github, lastSynced: base }).winner, "github");
});

test("newer timestamp wins when both sides changed", () => {
  const linear = { ...base, description: "linear edit", updatedAt: "2026-10-11T10:02:00.000Z" };
  const github = { ...base, title: "github edit", updatedAt: "2026-10-11T10:03:00.000Z" };
  assert.equal(resolveConflict({ linear, github, lastSynced: base }).winner, "github");
});

test("timestamp ties consistently favor Linear", () => {
  const linear = { ...base, title: "linear", updatedAt: "2026-10-11T10:01:00.000Z" };
  const github = { ...base, title: "github", updatedAt: linear.updatedAt };
  assert.equal(resolveConflict({ linear, github, lastSynced: base }).winner, "linear");
});

test("unchanged snapshots do not generate a provider write", () => {
  assert.equal(resolveConflict({ linear: base, github: base, lastSynced: base }).winner, "none");
});

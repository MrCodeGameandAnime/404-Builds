import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedIssue } from "../src/domain.js";
import { SyncEngine } from "../src/sync-service.js";
import type { IssueMapping } from "../src/store.js";
import type { GitHubProvider, LinearProvider, RemoteIssue } from "../src/types.js";

test("a new GitHub issue creates one mapped Linear issue with a shared baseline", async () => {
  const source: RemoteIssue = {
    id: "gh-1",
    number: 1,
    title: "New issue",
    description: "Details",
    state: "open",
    labels: ["bug"],
    url: "https://github.com/acme/repo/issues/1",
    updatedAt: "2026-10-11T10:00:00.000Z",
  };
  const mappings = new Map<number, IssueMapping>();
  const store = {
    getByGitHub: (number: number) => mappings.get(number),
    getByLinear: (id: string) => [...mappings.values()].find((mapping) => mapping.linearId === id),
    saveMapping: (mapping: IssueMapping) => { mappings.set(mapping.githubNumber, mapping); },
  };
  const github: GitHubProvider = {
    getIssue: async () => source,
    listIssues: async () => [source],
    findByMarker: async () => undefined,
    createIssue: async () => { throw new Error("unexpected create"); },
    updateIssue: async () => { throw new Error("unexpected update"); },
  };
  let createCount = 0;
  const linear: LinearProvider = {
    getIssue: async () => { throw new Error("unexpected get"); },
    listIssues: async () => [],
    findByMarker: async () => undefined,
    createIssue: async (issue: NormalizedIssue, marker: string) => {
      createCount += 1;
      return { ...issue, id: "lin-1", marker };
    },
    updateIssue: async () => { throw new Error("unexpected update"); },
  };
  const engine = new SyncEngine({ store, github, linear, repository: "acme/repo" });
  await engine.processGitHubIssue(1);
  assert.equal(createCount, 1);
  assert.equal(mappings.get(1)?.linearId, "lin-1");
  assert.equal(mappings.get(1)?.lastSynced?.title, "New issue");
});

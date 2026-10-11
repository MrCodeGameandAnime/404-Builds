import assert from "node:assert/strict";
import test from "node:test";
import { GitHubApi, LinearApi } from "../src/providers.js";

test("GitHub issue round-trip strips its marker and keeps source content", async () => {
  const config = { githubOwner: "acme", githubRepo: "app", githubToken: "test-token" };
  let createdBody = "";
  const github = new GitHubApi(config, async (_url: unknown, init: RequestInit = {}) => {
    if (init.method === "POST") {
      createdBody = JSON.parse(String(init.body)).body;
      return new Response(JSON.stringify({
        id: 14, number: 14, title: "New issue", body: createdBody, state: "open",
        labels: [{ name: "bug" }], html_url: "https://github.com/acme/app/issues/14",
        updated_at: "2026-10-11T10:00:00.000Z",
      }), { status: 201 });
    }
    if (String(_url).includes("/labels?")) {
      return new Response(JSON.stringify([{ name: "bug" }]), { status: 200 });
    }
    throw new Error("Unexpected GitHub request");
  });
  const source = {
    title: "New issue", description: "Details", state: "open" as const,
    labels: ["bug"], url: "", updatedAt: "2026-10-11T10:00:00.000Z",
  };
  const created = await github.createIssue(source, "linear:lin-14");
  assert.equal(created.number, 14);
  assert.equal(created.description, "Details");
  assert.equal(created.marker, "linear:lin-14");
  assert.match(createdBody, /404builds-sync:linear:lin-14/);
});

test("Linear creates an issue with the selected workflow state and existing labels", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const config = {
    linearApiKey: "test-key", linearTeamId: "team-1", linearProjectId: "project-1",
    linearOpenStateId: "state-open", linearClosedStateId: "state-done",
  };
  const linear = new LinearApi(config, async (_url: unknown, init: RequestInit = {}) => {
    const request = JSON.parse(String(init.body)) as Record<string, unknown>;
    calls.push(request);
    const query = String(request.query);
    if (query.includes("query Labels")) {
      return new Response(JSON.stringify({ data: { issueLabels: { nodes: [{ id: "label-bug", name: "bug" }] } } }), { status: 200 });
    }
    if (query.includes("mutation CreateIssue")) {
      const issue = {
        id: "lin-1", identifier: "ENG-1", title: "New issue",
        description: (request.variables as { input: { description: string } }).input.description,
        url: "https://linear.app/acme/issue/ENG-1", updatedAt: "2026-10-11T10:00:00.000Z",
        state: { id: "state-done", type: "completed" },
        labels: { nodes: [{ id: "label-bug", name: "bug" }] },
        team: { id: "team-1" }, project: { id: "project-1" },
      };
      return new Response(JSON.stringify({ data: { issueCreate: { success: true, issue } } }), { status: 200 });
    }
    throw new Error("Unexpected Linear request");
  });
  const created = await linear.createIssue({
    title: "New issue", description: "Details", state: "closed", labels: ["bug"],
    url: "", updatedAt: "2026-10-11T10:00:00.000Z",
  }, "github:acme/app#7");
  assert.equal(created.state, "closed");
  assert.equal(created.teamId, "team-1");
  assert.equal(created.projectId, "project-1");
  const mutation = calls.find((call) => String(call.query).includes("mutation CreateIssue"))!;
  const input = (mutation.variables as { input: { stateId: string; labelIds: string[]; description: string } }).input;
  assert.equal(input.stateId, "state-done");
  assert.deepEqual(input.labelIds, ["label-bug"]);
  assert.match(input.description, /404builds-sync:github:acme\/app#7/);
});

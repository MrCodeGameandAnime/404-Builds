// @ts-nocheck
const MARKER_RE = /<!-- 404builds-sync:([^\s]+) -->/;
const MARKER_GLOBAL_RE = /\s*<!-- 404builds-sync:[^\s]+ -->\s*/g;
function bodyWithMarker(description, marker) {
    return (description.trim() + "\n\n<!-- 404builds-sync:" + marker + " -->").trim();
}
function normalizedBody(description) {
    const raw = description ?? "";
    const marker = MARKER_RE.exec(raw)?.[1];
    return {
        description: raw.replace(MARKER_GLOBAL_RE, "\n").trim(),
        ...marker ? {
            marker
        } : {}
    };
}
async function pause(ms) {
    await new Promise((resolve)=>setTimeout(resolve, ms));
}
async function requestJson(fetcher, url, init, provider) {
    let lastError;
    for(let attempt = 0; attempt < 3; attempt += 1){
        try {
            const response = await fetcher(url, init);
            if (response.ok) {
                if (response.status === 204) return null;
                const text = await response.text();
                return text ? JSON.parse(text) : null;
            }
            const body = await response.text();
            const rateLimited = response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";
            if ((response.status === 429 || response.status >= 500 || rateLimited) && attempt < 2) {
                const retryAfter = Number(response.headers.get("retry-after"));
                const resetAt = Number(response.headers.get("x-ratelimit-reset"));
                const resetDelay = rateLimited && Number.isFinite(resetAt) ? resetAt * 1000 - Date.now() : 0;
                const delay = Number.isFinite(retryAfter) && retryAfter > 0
                    ? retryAfter * 1000
                    : resetDelay > 0 ? resetDelay : 500 * 2 ** attempt;
                await pause(Math.min(delay, 30000));
                continue;
            }
            lastError = new Error(provider + " API returned HTTP " + response.status + (body ? ": " + body.slice(0, 300) : ""));
            break;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < 2) await pause(500 * 2 ** attempt);
        }
    }
    throw lastError ?? new Error(provider + " API request failed");
}
function fromGitHub(raw) {
    const body = normalizedBody(raw.body);
    return {
        id: String(raw.id),
        number: raw.number,
        title: raw.title,
        description: body.description,
        state: raw.state,
        labels: raw.labels.map((label)=>typeof label === "string" ? label : label.name ?? "").filter(Boolean).sort(),
        url: raw.html_url,
        updatedAt: raw.updated_at,
        ...body.marker ? {
            marker: body.marker
        } : {}
    };
}
function withMarker(issue, marker) {
    return bodyWithMarker(issue.description, marker);
}
export class GitHubApi {
    config;
    fetcher;
    api = "https://api.github.com";
    labels;
    constructor(config, fetcher = fetch){
        this.config = config;
        this.fetcher = fetcher;
    }
    async getIssue(number) {
        const raw = await this.request("/issues/" + number);
        if (raw.pull_request) throw new Error("Pull requests are outside the issue-sync scope");
        return fromGitHub(raw);
    }
    async listIssues() {
        const issues = [];
        for(let page = 1; page <= 100; page += 1){
            const batch = await this.request("/issues?state=all&per_page=100&page=" + page);
            issues.push(...batch.filter((issue)=>!issue.pull_request).map(fromGitHub));
            if (batch.length < 100) return issues;
        }
        throw new Error("GitHub issue listing exceeded the 10,000 issue safety limit");
    }
    async findByMarker(marker) {
        return (await this.listIssues()).find((issue)=>issue.marker === marker);
    }
    async createIssue(issue, marker) {
        const labels = await this.matchLabels(issue.labels);
        const created = await this.request("/issues", {
            method: "POST",
            body: JSON.stringify({
                title: issue.title,
                body: withMarker(issue, marker),
                labels
            })
        });
        const result = fromGitHub(created);
        if (issue.state === "closed") return this.updateIssue(result.number, issue, marker);
        return result;
    }
    async updateIssue(number, issue, marker) {
        const labels = await this.matchLabels(issue.labels);
        const raw = await this.request("/issues/" + number, {
            method: "PATCH",
            body: JSON.stringify({
                title: issue.title,
                body: withMarker(issue, marker),
                state: issue.state,
                labels
            })
        });
        return fromGitHub(raw);
    }
    async matchLabels(names) {
        if (!this.labels) {
            const labels = new Set();
            for(let page = 1; page <= 20; page += 1){
                const raw = await this.request("/labels?per_page=100&page=" + page);
                raw.forEach((label)=>labels.add(label.name.toLowerCase()));
                if (raw.length < 100) break;
            }
            this.labels = labels;
        }
        const available = this.labels;
        const matched = names.filter((name)=>available.has(name.toLowerCase()));
        if (matched.length !== names.length) {
            console.warn("Some issue labels were omitted because a matching GitHub label does not exist in the configured repository.");
        }
        return matched;
    }
    async request(path, init = {}) {
        const url = this.api + "/repos/" + encodeURIComponent(this.config.githubOwner) + "/" + encodeURIComponent(this.config.githubRepo) + path;
        return requestJson(this.fetcher, url, {
            ...init,
            headers: {
                Accept: "application/vnd.github+json",
                Authorization: "Bearer " + this.config.githubToken,
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
                ...init.headers
            }
        }, "GitHub");
    }
}
const LINEAR_FIELDS = "id identifier title description url updatedAt state { id type } labels { nodes { id name } } team { id } project { id }";
function fromLinear(raw) {
    const body = normalizedBody(raw.description);
    return {
        id: raw.id,
        title: raw.title,
        description: body.description,
        state: raw.state && [
            "completed",
            "canceled"
        ].includes(raw.state.type) ? "closed" : "open",
        labels: (raw.labels?.nodes ?? []).map((label)=>label.name).sort(),
        url: raw.url,
        updatedAt: raw.updatedAt,
        ...(raw.team?.id ? { teamId: raw.team.id } : {}),
        ...(raw.project?.id ? { projectId: raw.project.id } : {}),
        ...body.marker ? {
            marker: body.marker
        } : {}
    };
}
export class LinearApi {
    config;
    fetcher;
    labels;
    constructor(config, fetcher = fetch){
        this.config = config;
        this.fetcher = fetcher;
    }
    async getIssue(id) {
        const query = "query GetIssue($id: String!) { issue(id: $id) { " + LINEAR_FIELDS + " } }";
        const data = await this.graphql(query, {
            id
        });
        if (!data.issue) throw new Error("Linear issue was not found");
        return fromLinear(data.issue);
    }
    async listIssues() {
        const issues = [];
        let after = null;
        for(let page = 0; page < 100; page += 1){
            const query = "query ListIssues($teamId: String!, $projectId: String!, $after: String) { issues(first: 100, after: $after, filter: { team: { id: { eq: $teamId } }, project: { id: { eq: $projectId } } }) { nodes { " + LINEAR_FIELDS + " } pageInfo { hasNextPage endCursor } } }";
            const data = await this.graphql(query, {
                teamId: this.config.linearTeamId,
                projectId: this.config.linearProjectId,
                after
            });
            issues.push(...data.issues.nodes.map(fromLinear));
            if (!data.issues.pageInfo.hasNextPage) return issues;
            after = data.issues.pageInfo.endCursor;
        }
        throw new Error("Linear issue listing exceeded the 10,000 issue safety limit");
    }
    async findByMarker(marker) {
        return (await this.listIssues()).find((issue)=>issue.marker === marker);
    }
    async createIssue(issue, marker) {
        const labelIds = await this.getLabelIds(issue.labels);
        const query = "mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { " + LINEAR_FIELDS + " } } }";
        const data = await this.graphql(query, {
            input: {
                teamId: this.config.linearTeamId,
                projectId: this.config.linearProjectId,
                title: issue.title,
                description: withMarker(issue, marker),
                stateId: issue.state === "closed" ? this.config.linearClosedStateId : this.config.linearOpenStateId,
                labelIds
            }
        });
        if (!data.issueCreate.success || !data.issueCreate.issue) throw new Error("Linear issue creation was not confirmed");
        return fromLinear(data.issueCreate.issue);
    }
    async updateIssue(id, issue, marker) {
        const labelIds = await this.getLabelIds(issue.labels);
        const query = "mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { " + LINEAR_FIELDS + " } } }";
        const data = await this.graphql(query, {
            id,
            input: {
                title: issue.title,
                description: withMarker(issue, marker),
                stateId: issue.state === "closed" ? this.config.linearClosedStateId : this.config.linearOpenStateId,
                labelIds
            }
        });
        if (!data.issueUpdate.success || !data.issueUpdate.issue) throw new Error("Linear issue update was not confirmed");
        return fromLinear(data.issueUpdate.issue);
    }
    async getLabelIds(names) {
        if (!this.labels) {
            const query = "query Labels($teamId: String!) { issueLabels(first: 100, filter: { team: { id: { eq: $teamId } } }) { nodes { id name } } }";
            const data = await this.graphql(query, {
                teamId: this.config.linearTeamId
            });
            this.labels = new Map(data.issueLabels.nodes.map((label)=>[
                    label.name.toLowerCase(),
                    label.id
                ]));
        }
        const available = this.labels;
        const matched = names.map((name)=>available.get(name.toLowerCase())).filter((id)=>Boolean(id));
        if (matched.length !== names.length) {
            console.warn("Some issue labels were omitted because a matching Linear label does not exist in the configured team.");
        }
        return matched;
    }
    async graphql(query, variables) {
        const result = await requestJson(this.fetcher, "https://api.linear.app/graphql", {
            method: "POST",
            headers: {
                Authorization: this.config.linearApiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query,
                variables
            })
        }, "Linear");
        if (result.errors?.length) {
            throw new Error("Linear GraphQL error: " + result.errors.map((item)=>item.message).join("; "));
        }
        if (!result.data) throw new Error("Linear returned no data");
        return result.data;
    }
}

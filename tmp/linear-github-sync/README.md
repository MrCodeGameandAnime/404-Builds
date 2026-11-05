# Linear-GitHub Issue Sync

TypeScript service for syncing GitHub Issues with one Linear team/project. It serves signed webhooks and performs a full reconciliation every five minutes so missed webhooks are recovered.

## Implemented scope

- Syncs GitHub Issues in one configured repository with Linear issues in one configured team and project.
- Syncs title, description, open/closed status, and labels that already exist by name on both sides.
- Merges edits made to different fields on both providers. If both sides changed the same field, the later issue timestamp wins; exact timestamp ties favor Linear.
- Maps close/reopen state. Deletion events do not delete the counterpart.
- Ignores pull requests, comments, assignees, and fields without a direct cross-provider mapping.
- Uses HMAC-verified webhooks, Linear timestamp freshness checks, serialized processing, provider delivery de-duplication, a persistent SQLite mapping store, bounded retries for throttling/transient API errors, and a five-minute reconciliation pass.
- Adds an invisible HTML comment marker to issue descriptions to recover mappings if a create succeeds remotely but the process loses the response.

The task brief does not define the exact fields or conflict rules. These are the implementation defaults; docs/SCOPE.md records the clarification to send the requester.

## Configuration

Copy .env.example to .env and fill in provider-owned secrets locally. Do not commit .env.

| Variable | Purpose |
| --- | --- |
| GITHUB_REPOSITORY | One repository in owner/name format |
| GITHUB_TOKEN | Fine-grained GitHub token with Issues read/write and Metadata read access to that repository |
| GITHUB_WEBHOOK_SECRET | Secret configured on the GitHub Issues webhook |
| LINEAR_API_KEY | Linear API key with issue read/write access |
| LINEAR_TEAM_ID, LINEAR_PROJECT_ID | The one Linear team and project to sync |
| LINEAR_OPEN_STATE_ID, LINEAR_CLOSED_STATE_ID | Workflow state IDs used when changing open/closed status |
| LINEAR_WEBHOOK_SECRET | Signing secret from the Linear Issue webhook |
| DATA_DIR | Persistent directory for SQLite; defaults to ./data |
| PORT, SYNC_INTERVAL_MS | Listener port and reconciliation period; defaults are 3000 and 300000 |

The GitHub webhook should send JSON Issues events to /webhooks/github. The Linear webhook should send Issue create/update events to /webhooks/linear. Both endpoints reject unsigned or incorrectly signed requests. GET /health is a no-secret health check.

## Run locally

Requires Node.js 22.13+.

    npm install
    npm test
    npm start

Keep the configured data directory on durable storage. The service starts an initial reconciliation, listens for webhooks, then runs the periodic reconciliation in the same process.

## Container deployment

Build with docker build -t linear-github-sync ., then run with a persistent volume mounted at /data and provider variables supplied as runtime secrets. Configure the two webhooks to the public base URL. Do not bake provider tokens or webhook secrets into the image.

## Operational limits

- The Linear project is the sync boundary. Issues already in that project are imported on first reconciliation, so use a dedicated project or review its existing issues first.
- Labels that do not already exist on the destination are skipped; they are not created automatically.
- A first reconciliation may create counterpart issues for every existing issue in either configured scope.
- Close/reopen is synced, but hard deletes are deliberately ignored to preserve recoverability.
- SQLite and the periodic worker require one long-running service instance with persistent disk. Do not run multiple replicas against the same SQLite file.

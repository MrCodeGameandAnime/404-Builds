# AislandLab bounty scope

Listing: https://aislandlab.com/tasks/c5e63516-0f98-4957-99bd-7b375c08072d  
Posted reward: $700, displayed as held in escrow  
Brief: “Reliable two-way issue sync with conflict resolution; deploy as a cron + webhook.”

## Working acceptance baseline

1. One configured GitHub repository and one configured Linear team/project.
2. GitHub Issues only; pull requests and comments are excluded.
3. Sync title, description, open/closed status, and same-name labels already present on both providers. Assignees and provider-specific fields are excluded.
4. Merge independent field edits. When both sides change the same field, the later provider updatedAt wins; exact ties favor Linear.
5. Closing/reopening syncs as a state change. Deletion events do not hard-delete the other issue.
6. Signed GitHub and Linear webhooks, a five-minute freshness window for Linear signatures, persistent ID mapping, delivery de-duplication, bounded transient retries, and a full five-minute reconciliation for recovery.
7. A running container, durable SQLite volume, environment-based secrets, health endpoint, and setup documentation.

## Clarification to send the requester

“I’m implementing the brief with this acceptance baseline: one GitHub repository and one Linear project, syncing title, description, open/closed status, and matching labels; independent edits merge by field, same-field conflicts use the later updatedAt (Linear wins ties), and delete events are ignored. The service will expose signed GitHub/Linear webhooks and reconcile every five minutes on a persistent SQLite volume. Please reply promptly if any item conflicts with your intended acceptance criteria or if there is an existing repository/hosting target. I’m starting with this baseline while I wait.”

## Remaining external setup for a real deployment

- AislandLab account verification/sign-in and the platform claim action.
- GitHub repository choice/permissions and a GitHub token with Issues read/write.
- Linear API key, team/project IDs, and open/closed workflow state IDs.
- Webhook secrets on both providers.
- A public Node 22 host with durable disk and a URL for both webhook endpoints.
- Requester response on the working acceptance baseline.

No provider tokens or webhook secrets are stored in this project. Escrow text on the listing is not counted as cash received.

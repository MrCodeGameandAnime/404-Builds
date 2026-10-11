// @ts-nocheck
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { NormalizedIssue } from "./domain.js";
export interface IssueMapping {
  githubNumber: number;
  linearId: string;
  lastSynced?: NormalizedIssue;
}
export class SyncStore {
    db;
    constructor(filename){
        mkdirSync(dirname(filename), {
            recursive: true
        });
        this.db = new DatabaseSync(filename);
        this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS issue_mappings (
        github_number INTEGER PRIMARY KEY,
        linear_id TEXT NOT NULL UNIQUE,
        last_synced TEXT
      );
      CREATE TABLE IF NOT EXISTS processed_events (
        event_key TEXT PRIMARY KEY,
        processed_at TEXT NOT NULL
      );
    `);
    }
    getByGitHub(githubNumber) {
        const row = this.db.prepare('SELECT github_number, linear_id, last_synced FROM issue_mappings WHERE github_number = ?').get(githubNumber);
        return row ? this.fromRow(row) : undefined;
    }
    getByLinear(linearId) {
        const row = this.db.prepare('SELECT github_number, linear_id, last_synced FROM issue_mappings WHERE linear_id = ?').get(linearId);
        return row ? this.fromRow(row) : undefined;
    }
    saveMapping(mapping) {
        this.db.prepare(`INSERT INTO issue_mappings (github_number, linear_id, last_synced) VALUES (?, ?, ?)
      ON CONFLICT(github_number) DO UPDATE SET linear_id = excluded.linear_id, last_synced = excluded.last_synced`).run(mapping.githubNumber, mapping.linearId, mapping.lastSynced ? JSON.stringify(mapping.lastSynced) : null);
    }
    hasEvent(eventKey) {
        return Boolean(this.db.prepare('SELECT 1 FROM processed_events WHERE event_key = ?').get(eventKey));
    }
    markEvent(eventKey) {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        this.db.prepare('DELETE FROM processed_events WHERE processed_at < ?').run(cutoff);
        this.db.prepare('INSERT OR IGNORE INTO processed_events (event_key, processed_at) VALUES (?, ?)').run(eventKey, new Date().toISOString());
    }
    close() {
        this.db.close();
    }
    fromRow(row) {
        return {
            githubNumber: row.github_number,
            linearId: row.linear_id,
            ...row.last_synced ? {
                lastSynced: JSON.parse(row.last_synced)
            } : {}
        };
    }
}

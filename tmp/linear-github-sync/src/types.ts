import type { NormalizedIssue } from "./domain.js";

export type RemoteIssue = NormalizedIssue & {
  id: string;
  marker?: string;
  number?: number;
  teamId?: string;
  projectId?: string;
};

export interface GitHubProvider {
  getIssue(number: number): Promise<RemoteIssue>;
  listIssues(): Promise<RemoteIssue[]>;
  findByMarker(marker: string): Promise<RemoteIssue | undefined>;
  createIssue(issue: NormalizedIssue, marker: string): Promise<RemoteIssue>;
  updateIssue(number: number, issue: NormalizedIssue, marker: string): Promise<RemoteIssue>;
}

export interface LinearProvider {
  getIssue(id: string): Promise<RemoteIssue>;
  listIssues(): Promise<RemoteIssue[]>;
  findByMarker(marker: string): Promise<RemoteIssue | undefined>;
  createIssue(issue: NormalizedIssue, marker: string): Promise<RemoteIssue>;
  updateIssue(id: string, issue: NormalizedIssue, marker: string): Promise<RemoteIssue>;
}

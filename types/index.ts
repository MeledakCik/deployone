export type Platform = "vercel" | "cloudflare";

export type DeployStatus = "ready" | "failed" | "building";

export interface HistoryItem {
  id: string;
  name: string;
  platform: Platform;
  domain: string;
  date: string;
  status: DeployStatus;
}

export interface DummyUser {
  name: string;
  email: string;
  avatar: string;
  color: "violet" | "blue";
}

export interface DeployFormValues {
  projectName: string;
  platform: Platform;
  domain: string;
  platformToken: string;
  githubToken: string;
  note: string;
}

export type DashboardView =
  | "dashboard"
  | "deploy"
  | "projects"
  | "domains"
  | "env"
  | "docs"
  | "settings";

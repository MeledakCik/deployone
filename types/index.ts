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

export interface DomainItem {
  id: string;
  domain: string;
  project: string;
  status: "Active" | "Pending";
}

export interface EnvItem {
  id: string;
  key: string;
  value: string;
  environment: "Production" | "Preview";
  visible: boolean;
}

export interface SettingsTokens {
  vercelToken: string;
  cloudflareToken: string;
  githubPat: string;
}

export type DashboardView =
  | "dashboard"
  | "deploy"
  | "projects"
  | "domains"
  | "env"
  | "docs"
  | "settings";


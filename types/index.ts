export type Platform = "vercel" | "cloudflare" | "railway" | "render";

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
  githubUrl: string;
  githubPat: string; // optional GitHub PAT (used on the Vercel form)
  note: string;
  // Cloudflare Pages specific
  accountId: string;
  buildCommand: string;
  outputDir: string;
  // Railway / Render specific
  startCommand: string;
  envText: string;
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


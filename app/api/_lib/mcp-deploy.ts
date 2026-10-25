import { getUserData } from "@/app/api/_lib/store";
import { rateLimit } from "@/app/api/_lib/rate-limit";
import { validateGithubRepo, GithubApiError } from "@/app/api/_lib/github";
import { assertValidProjectName, BadRequestError } from "@/app/api/_lib/validators";
import { parseEnvText } from "@/app/api/_lib/env-text";
import { manualDeployGuide, railwayRootDirectory } from "@/lib/deploy-guides";
import { autofixRepoForRailway, previewRailwayAutofix } from "@/app/api/_lib/repo-autofix";
import { recordMcpDeploy } from "@/app/api/_lib/mcp-history";
import {
  VercelApiError,
  createVercelDeployment,
  ensureVercelProjectWithEnv,
  getVercelProject,
} from "@/app/api/_lib/vercel";
import {
  CloudflareApiError,
  cloudflareBuildPreset,
  cloudflareGithubConnectUrl,
  createCloudflarePagesProject,
  getCloudflareAccounts,
  getCloudflarePagesProject,
  triggerCloudflareDeployment,
  upsertCloudflareEnvBulk,
} from "@/app/api/_lib/cloudflare";
import { RailwayApiError, createRailwayDeployment, getRailwayProject } from "@/app/api/_lib/railway";
import type { Platform, SettingsTokens } from "@/types";

/**
 * Deploy ke Vercel / Cloudflare Pages / Railway lewat MCP.
 *
 * Token platform TIDAK PERNAH dikirim lewat argumen tool dan tidak pernah dikembalikan ke Claude: dibaca di
 * server dari Settings user (settingsTokens, terenkripsi), sama seperti yang dipakai dashboard. Claude juga
 * hanya boleh memakai platform yang dicentang user di Settings → Konektor Claude (`mcpDeployPlatforms`).
 */

export const MCP_PLATFORMS: readonly Platform[] = ["vercel", "cloudflare", "railway"];

const PLATFORM_LABEL: Record<Platform, string> = { vercel: "Vercel", cloudflare: "Cloudflare Pages", railway: "Railway" };
const TOKEN_FIELD: Record<Platform, keyof SettingsTokens> = {
  vercel: "vercelToken",
  cloudflare: "cloudflareToken",
  railway: "railwayToken",
};

const SETTINGS_HINT = "Buka Depup → Settings → Konektor Claude.";

type Tokens = Partial<SettingsTokens>;

const has = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export function allowedPlatforms(tokens: Tokens): Platform[] {
  const list = (tokens.mcpDeployPlatforms ?? "").split(",").map((x) => x.trim());
  return MCP_PLATFORMS.filter((p) => list.includes(p));
}

export interface PlatformStatus {
  platform: Platform;
  label: string;
  /** Token sudah diisi di Settings. */
  tokenSaved: boolean;
  /** User mengizinkan Claude memakai platform ini. */
  allowed: boolean;
  ready: boolean;
}

export interface ConnectorStatus {
  platforms: PlatformStatus[];
  githubSaved: boolean;
}

export async function getConnectorStatus(email: string): Promise<ConnectorStatus> {
  const { settingsTokens } = await getUserData(email);
  const allowed = allowedPlatforms(settingsTokens);
  return {
    githubSaved: has(settingsTokens.githubPat),
    platforms: MCP_PLATFORMS.map((p) => {
      const tokenSaved = has(settingsTokens[TOKEN_FIELD[p]]);
      const isAllowed = allowed.includes(p);
      return { platform: p, label: PLATFORM_LABEL[p], tokenSaved, allowed: isAllowed, ready: tokenSaved && isAllowed };
    }),
  };
}

export interface DeployInput {
  platform?: unknown;
  github_url?: unknown;
  project_name?: unknown;
  env_text?: unknown;
  build_command?: unknown;
  output_dir?: unknown;
  start_command?: unknown;
  /** Railway: izinkan Depup meng-commit file yang kurang ke repo. Default false; hanya true setelah user setuju. */
  allow_repo_changes?: unknown;
}

export type DeployResult =
  | {
      ok: true;
      platform: Platform;
      project: string;
      url: string;
      inspectorUrl: string;
      deploymentId: string;
      readyState: string;
      notes: string[];
      /** true = deploy tercatat di riwayat dashboard. */
      recorded: boolean;
    }
  | { ok: false; error: string };

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const fail = (error: string): DeployResult => ({ ok: false, error });

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (MCP_PLATFORMS as readonly string[]).includes(v);
}

/** Terjemahkan error platform/GitHub jadi pesan yang bisa dijelaskan Claude ke user. */
function describeError(e: unknown, platform: Platform): string {
  if (e instanceof GithubApiError || e instanceof BadRequestError) return e.message;
  if (e instanceof VercelApiError || e instanceof CloudflareApiError || e instanceof RailwayApiError) {
    if (e.code === "invalid_token") {
      return `Token ${PLATFORM_LABEL[platform]} di Settings ditolak (salah atau kedaluwarsa). Perbarui di Depup → Settings.`;
    }
    return e.message;
  }
  console.error("[mcp-deploy] error tak terduga", (e as Error)?.message);
  return `Deploy ke ${PLATFORM_LABEL[platform]} gagal karena gangguan sementara (platform atau server Depup tidak merespons dengan benar). Belum ada deployment yang dikonfirmasi; cek dashboard ${PLATFORM_LABEL[platform]} sebelum mengulang, lalu coba lagi.`;
}

export async function deployProject(email: string, input: DeployInput): Promise<DeployResult> {
  if (!isPlatform(input.platform)) return fail('Parameter `platform` harus "vercel", "cloudflare", atau "railway".');
  const platform = input.platform;
  const label = PLATFORM_LABEL[platform];

  const githubUrl = str(input.github_url);
  if (!githubUrl) return fail("Parameter `github_url` wajib diisi (mis. https://github.com/pemilik/repo). Deploy ke platform ini berjalan dari repo GitHub.");
  const projectName = str(input.project_name);
  if (!projectName) return fail("Parameter `project_name` wajib diisi.");
  try {
    assertValidProjectName(projectName);
  } catch (e) {
    return fail((e as Error).message);
  }

  // Token & izin dibaca dari Settings user — bukan dari argumen tool.
  const { settingsTokens: tokens } = await getUserData(email);
  const token = tokens[TOKEN_FIELD[platform]];
  if (!has(token)) return fail(`Token ${label} belum disimpan. ${SETTINGS_HINT} Isi token ${label}, lalu coba lagi.`);
  if (!allowedPlatforms(tokens).includes(platform)) {
    return fail(`Kamu belum mengizinkan Claude deploy ke ${label}. ${SETTINGS_HINT} Aktifkan ${label}, lalu coba lagi.`);
  }

  const rl = await rateLimit("mcp-deploy", `u:${email}`, 15, 3600);
  if (!rl.allowed) return fail(`Terlalu banyak deploy lewat Claude. Coba lagi ${Math.ceil(rl.retryAfterSeconds / 60)} menit lagi.`);

  const githubPat = has(tokens.githubPat) ? tokens.githubPat.trim() : undefined;
  const env = parseEnvText(str(input.env_text));
  const notes: string[] = [];
  let accountId = platform === "cloudflare" && has(tokens.cloudflareAccountId) ? tokens.cloudflareAccountId.trim() : "";

  const finish = async (
    d: { url: string; inspectorUrl: string; deploymentId: string; readyState: string },
    project: string,
  ): Promise<DeployResult> => {
    const recorded = await recordMcpDeploy(email, { name: project, platform, url: d.url, readyState: d.readyState, repo: validation.fullName });
    return { ok: true, platform, project, url: d.url, inspectorUrl: d.inspectorUrl, deploymentId: d.deploymentId, readyState: d.readyState, notes, recorded };
  };

  let validation!: Awaited<ReturnType<typeof validateGithubRepo>>;
  try {
    validation = await validateGithubRepo(githubUrl, githubPat);

    const compat = validation.compat[platform];
    if (compat.level === "blocked") {
      const guide = compat.guide ?? manualDeployGuide(platform, validation.project, validation.fullName);
      return fail(`${guide.message} Repo ini tidak cocok untuk ${label}; deploy manual lewat dashboard ${label} atau pilih platform lain.`);
    }
    if (compat.level === "warn") notes.push(compat.summary, ...compat.notes);

    if (platform === "vercel") {
      const existing = await getVercelProject(projectName, token);
      if (existing.exists && existing.linkedRepoFullName && existing.linkedRepoFullName !== validation.fullName) {
        return fail(`Project "${projectName}" di Vercel sudah terhubung ke repo lain (${existing.linkedRepoFullName}). Pakai nama project lain, atau deploy dari repo yang sama.`);
      }
      if (Object.keys(env).length > 0) await ensureVercelProjectWithEnv(projectName, env, token);
      const d = await createVercelDeployment({
        projectName,
        owner: validation.owner,
        repo: validation.repo,
        ref: validation.defaultBranch,
        vercelToken: token,
        staticSite: validation.project.type === "static" ? { outputDirectory: validation.project.staticDir || null } : undefined,
      });
      return await finish(d, projectName);
    }

    if (platform === "cloudflare") {
      if (!accountId) {
        const accounts = await getCloudflareAccounts(token);
        if (accounts.length === 0) return fail("Token Cloudflare valid tetapi tidak punya akses ke akun manapun.");
        accountId = accounts[0].id;
        if (accounts.length > 1) notes.push(`Token Cloudflare punya ${accounts.length} akun; dipakai "${accounts[0].name}". Pilih akun lain di Settings kalau perlu.`);
      }
      const preset = cloudflareBuildPreset(validation.framework, validation.project);
      if (preset.warning) notes.push(preset.warning);
      const buildCommand = str(input.build_command) ?? preset.buildCommand;
      const outputDir = str(input.output_dir) ?? preset.outputDir;

      const existing = await getCloudflarePagesProject(accountId, projectName, token);
      if (existing.exists && existing.linkedRepoFullName && existing.linkedRepoFullName !== validation.fullName) {
        return fail(`Project "${projectName}" di Cloudflare Pages sudah terhubung ke repo lain (${existing.linkedRepoFullName}). Pakai nama project lain, atau deploy dari repo yang sama.`);
      }
      if (!existing.exists) {
        await createCloudflarePagesProject({
          accountId,
          token,
          projectName,
          owner: validation.owner,
          repo: validation.repo,
          productionBranch: validation.defaultBranch,
          buildCommand,
          outputDir,
          compatibilityFlags: preset.compatFlags,
        });
      }
      await upsertCloudflareEnvBulk(accountId, projectName, env, token);
      const d = await triggerCloudflareDeployment(accountId, projectName, token);
      return await finish(d, projectName);
    }

    // railway
    await getRailwayProject(projectName, token); // validasi token sebelum mengubah apa pun
    // Perubahan ke repo user (commit file yang kurang) hanya boleh terjadi dengan persetujuan eksplisit.
    const preview = await previewRailwayAutofix(validation, githubPat);
    if (preview.files.length > 0) {
      const list = preview.files.map((f) => `- ${f.path} (${f.action === "create" ? "baru" : "diubah"}): ${f.reason}`).join("\n");
      if (input.allow_repo_changes !== true) {
        return fail(
          `Repo ini kekurangan file agar bisa dibangun Railway. Depup bisa menambahkannya lewat commit ke branch ${validation.defaultBranch}:\n${list}\n` +
            "Belum ada yang diubah dan belum ada deploy. Tanyakan ke pengguna apakah boleh; kalau setuju, panggil `deploy_project` lagi dengan `allow_repo_changes: true`. " +
            "Kalau tidak, pengguna bisa menambahkan file itu sendiri lalu minta deploy lagi.",
        );
      }
      if (!githubPat) return fail("Menambahkan file ke repo butuh GitHub PAT (izin repo) di Settings. Isi dulu, lalu coba lagi.");
      if (!preview.canWrite) return fail("GitHub PAT di Settings hanya bisa membaca repo ini, jadi file yang kurang tidak bisa ditambahkan. Pakai PAT dengan izin tulis, atau tambahkan file-nya sendiri.");
      const autofix = await autofixRepoForRailway(validation, githubPat);
      if (autofix.status === "committed") {
        notes.push(`Atas persetujuan pengguna, Depup meng-commit file ke repo: ${autofix.files.map((f) => f.path).join(", ")}.`);
      } else {
        return fail(autofix.message ?? "Gagal menambahkan file yang kurang ke repo. Tidak ada deploy yang dibuat.");
      }
    }
    const d = await createRailwayDeployment({
      projectName,
      owner: validation.owner,
      repo: validation.repo,
      ref: validation.defaultBranch,
      railwayToken: token,
      startCommand: str(input.start_command),
      env,
      rootDirectory: railwayRootDirectory(validation.project),
    });
    return await finish(d, d.name);
  } catch (e) {
    if (e instanceof CloudflareApiError && e.code === "github_not_connected") {
      return fail(
        `Akun Cloudflare belum terhubung ke GitHub. Buka ${accountId ? cloudflareGithubConnectUrl(accountId) : "https://dash.cloudflare.com"} dan izinkan GitHub App Cloudflare Pages, lalu minta deploy lagi.`,
      );
    }
    return fail(describeError(e, platform));
  }
}

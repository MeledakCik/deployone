/**
 * Mengubah error mentah (pesan API, kode HTTP, jaringan putus, build gagal)
 * menjadi panduan yang jelas untuk user: apa yang terjadi, apa yang harus
 * dilakukan, dan ke mana harus pergi kalau mau deploy manual.
 */
import type { ApiError, ErrorGuide, GuideLink, Platform, ProjectProfile } from "@/types";
import { manualDeployGuide, PLATFORM_NAME } from "@/lib/deploy-guides";

export class ApiRequestError extends Error {
  code?: ApiError["code"];
  status?: number;
  guide?: ErrorGuide;
  constructor(message: string, opts: { code?: ApiError["code"]; status?: number; guide?: ErrorGuide } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.code = opts.code;
    this.status = opts.status;
    this.guide = opts.guide;
  }
}

export type ErrorStage = "check" | "create" | "status" | "build";

export interface ErrorContext {
  platform: Platform;
  stage: ErrorStage;
  project?: ProjectProfile | null;
  repoFullName?: string;
}

const TOKEN_LINKS: Record<Platform, GuideLink> = {
  vercel: { label: "Buat token Vercel", url: "https://vercel.com/account/tokens" },
  cloudflare: { label: "Buat token Cloudflare", url: "https://dash.cloudflare.com/profile/api-tokens" },
  railway: { label: "Buat token Railway", url: "https://railway.com/account/tokens" },
};

const GITHUB_TOKEN_LINK: GuideLink = {
  label: "Buat GitHub Token (izin: repo)",
  url: "https://github.com/settings/tokens/new?scopes=repo&description=Depup",
};

function dedupeLinks(links: GuideLink[]): GuideLink[] {
  return links.filter((l, i, arr) => arr.findIndex((x) => x.url === l.url) === i);
}

/** Pesan teknis yang aman untuk disalin user ke developer / laporan bug. */
function technicalDetail(err: unknown, ctx: ErrorContext): string {
  const parts = [`platform=${ctx.platform}`, `tahap=${ctx.stage}`];
  if (err instanceof ApiRequestError) {
    if (err.status) parts.push(`status=${err.status}`);
    if (err.code) parts.push(`kode=${err.code}`);
  }
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return `${msg}\n(${parts.join(", ")})`;
}

export function toFriendlyError(err: unknown, ctx: ErrorContext): ErrorGuide {
  const platformName = PLATFORM_NAME[ctx.platform];
  const technical = technicalDetail(err, ctx);
  const rawMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui.";
  const manual = manualDeployGuide(ctx.platform, ctx.project, ctx.repoFullName);
  const withManual = (g: ErrorGuide): ErrorGuide => ({
    ...g,
    links: dedupeLinks([...(g.links ?? []), ...(manual.links ?? [])]),
    technical,
  });

  /* ---- Jaringan putus (fetch gagal sebelum dapat respons) ---- */
  if (
    (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) ||
    (err instanceof ApiRequestError && err.code === "network")
  ) {
    return {
      title: "Koneksi internet terputus",
      message: "Aplikasi tidak bisa menghubungi server. Ini biasanya masalah sinyal/WiFi, bukan kesalahan kamu.",
      steps: [
        "Cek koneksi internet kamu, lalu klik “Coba lagi”.",
        "Kalau memakai VPN atau ad-blocker, coba matikan sebentar.",
      ],
      technical,
    };
  }

  if (err instanceof ApiRequestError) {
    /* Server sudah kirim panduan sendiri (mis. repo tidak cocok) → pakai itu. */
    if (err.guide) {
      return {
        ...err.guide,
        links: dedupeLinks([...(err.guide.links ?? []), ...(manual.links ?? [])]),
        technical,
      };
    }

    switch (err.code) {
      case "invalid_url":
        return {
          title: "Link GitHub belum benar",
          message: "Link yang dimasukkan tidak terbaca sebagai repository GitHub.",
          steps: [
            "Buka repo kamu di GitHub, lalu salin link dari address bar.",
            "Formatnya: https://github.com/nama-akun/nama-repo",
          ],
          technical,
        };
      case "repo_not_found":
        return {
          title: "Repo tidak ditemukan",
          message: rawMessage,
          steps: [
            "Cek lagi penulisan link-nya (nama akun & nama repo).",
            "Kalau repo ini private, isi GitHub Token di form — tanpa token, repo private terlihat seperti “tidak ada”.",
          ],
          links: [GITHUB_TOKEN_LINK],
          technical,
        };
      case "github_auth_required":
        return {
          title: "GitHub menolak akses",
          message: rawMessage,
          steps: [
            "Kalau repo private: isi GitHub Token dengan izin “repo”.",
            "Kalau sudah mengisi token: cek apakah token sudah kedaluwarsa, lalu buat yang baru.",
          ],
          links: [GITHUB_TOKEN_LINK],
          technical,
        };
      case "rate_limited":
        return {
          title: "Terlalu banyak permintaan",
          message: rawMessage,
          steps: [
            "Tunggu beberapa menit, lalu klik “Coba lagi”.",
            "Mengisi GitHub Token di form membuat batasnya jauh lebih longgar.",
          ],
          links: [GITHUB_TOKEN_LINK],
          technical,
        };
      case "invalid_token":
        return withManual({
          title: `Token ${platformName} tidak diterima`,
          message: `${platformName} menolak token yang dipakai. Biasanya karena salah salin, sudah kedaluwarsa, atau izinnya kurang.`,
          steps: [
            "Buat token baru (link di bawah), lalu salin seluruhnya tanpa spasi di awal/akhir.",
            "Tempel di Settings → Token (atau di form deploy), lalu coba lagi.",
            ctx.platform === "cloudflare"
              ? "Pastikan token punya izin “Cloudflare Pages: Edit”."
              : "Pastikan token tidak dibatasi ke project/team lain.",
          ],
          links: [TOKEN_LINKS[ctx.platform]],
        });
      case "project_conflict":
        return {
          title: "Nama project sudah dipakai",
          message: rawMessage,
          steps: [
            "Ganti Nama Project di form dengan nama lain, lalu deploy lagi.",
            "Atau deploy dari repo yang sama dengan project lama tersebut.",
          ],
          technical,
        };
      case "github_not_connected":
        return {
          title: "GitHub belum dihubungkan ke Cloudflare",
          message:
            "Cloudflare harus diberi izin membaca repo GitHub kamu satu kali. Ini hanya dilakukan sekali per akun.",
          steps: [
            "Buka dashboard Cloudflare → Workers & Pages → Create → Pages → Connect to Git.",
            "Pilih GitHub, lalu izinkan akses ke repo yang mau di-deploy.",
            "Kembali ke sini dan klik “Coba lagi”.",
          ],
          links: [manual.links?.[0]].filter(Boolean) as GuideLink[],
          technical,
        };
      case "missing_account":
        return {
          title: "Account ID belum dipilih",
          message: "Cloudflare butuh tahu akun mana yang dipakai.",
          steps: ["Buka Settings, uji token Cloudflare, lalu pilih akun yang diinginkan."],
          technical,
        };
      case "unauthorized":
        return {
          title: "Sesi login habis",
          message: "Kamu perlu login ulang supaya bisa melanjutkan.",
          steps: ["Muat ulang halaman, login dengan Google, lalu coba lagi."],
          technical,
        };
      default:
        break;
    }
    if (err.status && err.status >= 500) {
      return withManual({
        title: `${platformName} sedang bermasalah`,
        message: "Server sedang error — ini bukan kesalahan kamu. Biasanya hilang sendiri dalam beberapa menit.",
        steps: [
          "Tunggu 1–2 menit, lalu klik “Coba lagi”.",
          `Cek status layanan ${platformName} kalau masalah berlanjut.`,
          "Atau deploy lewat panduan manual di bawah.",
        ],
        links: manual.links,
      });
    }
  }

  /* ---- Build di platform gagal (bukan masalah form) ---- */
  if (ctx.stage === "build") {
    const isNode = ctx.project?.type === "node";
    return {
      title: "Build gagal di server",
      message:
        "Repo terhubung dengan benar, tapi proses build di " +
        `${platformName} berhenti dengan error. Ini biasanya karena masalah di kode/konfigurasi project, bukan di Depup.`,
      steps: [
        "Klik “Lihat log” untuk membaca baris error terakhir — itu petunjuk utamanya.",
        ...(isNode
          ? [
              "Coba jalankan `npm install && npm run build` di komputermu; kalau gagal di sana, perbaiki dulu.",
              "Kalau project butuh environment variable, isi di step Environment Variables lalu deploy ulang.",
            ]
          : ["Pastikan file konfigurasi project (mis. Dockerfile / requirements) sudah benar."]),
        "Setelah diperbaiki dan di-push ke GitHub, klik “Coba lagi”.",
      ],
      links: manual.links,
      technical: `${rawMessage}\n(platform=${ctx.platform}, tahap=build)`,
    };
  }

  /* ---- Fallback: apa pun yang tidak dikenali ---- */
  return withManual({
    title: "Deploy belum berhasil",
    message: rawMessage,
    steps: [
      "Klik “Coba lagi” — kadang masalahnya hanya sementara.",
      "Kalau tetap gagal, salin detail teknis di bawah dan deploy lewat panduan manual.",
    ],
  });
}

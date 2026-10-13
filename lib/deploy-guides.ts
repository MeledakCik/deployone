/**
 * Aturan kecocokan "tipe project" vs "platform deploy" + panduan manual.
 *
 * Murni fungsi (tanpa fetch / tanpa import server) supaya bisa dipakai di
 * server (route API) maupun client (form & modal error).
 */
import type {
  ErrorGuide,
  GuideLink,
  Platform,
  PlatformCompat,
  ProjectProfile,
} from "@/types";

export const PLATFORM_NAME: Record<Platform, string> = {
  vercel: "Vercel",
  cloudflare: "Cloudflare Pages",
  railway: "Railway",
};

const PLATFORM_LINKS: Record<Platform, GuideLink> = {
  vercel: { label: "Buka Vercel (Add New → Project)", url: "https://vercel.com/new" },
  cloudflare: {
    label: "Buka Cloudflare (Workers & Pages)",
    url: "https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/pages",
  },
  railway: { label: "Buka Railway (New Project)", url: "https://railway.com/new" },
};

/** Ringkasan satu baris tentang project yang terdeteksi, untuk pesan ke user. */
export function describeProject(p: ProjectProfile): string {
  return p.label;
}

/**
 * Panduan deploy manual lewat dashboard platform — dipakai kalau deploy
 * otomatis diblokir atau gagal. Isinya menyesuaikan tipe project.
 */
export function manualDeployGuide(
  platform: Platform,
  profile?: ProjectProfile | null,
  repoFullName?: string,
): ErrorGuide {
  const name = PLATFORM_NAME[platform];
  const repo = repoFullName ? `repo ${repoFullName}` : "repo GitHub kamu";
  const steps: string[] = [];

  if (platform === "vercel") {
    steps.push(
      "Buka vercel.com/new, lalu login.",
      `Pilih ${repo} dari daftar (klik "Adjust GitHub App Permissions" kalau repo belum muncul).`,
    );
    if (profile?.nestedProjectDir) {
      steps.push(
        `Di bagian "Root Directory", pilih folder "${profile.nestedProjectDir}" — di situlah project-nya berada.`,
      );
    }
    if (profile?.type === "static") {
      steps.push(
        'Di "Framework Preset" pilih "Other". Kosongkan Build Command, dan isi Output Directory dengan folder yang berisi index.html (kosongkan kalau ada di root).',
      );
    } else {
      steps.push('Biarkan "Framework Preset" terdeteksi otomatis, atau pilih manual kalau salah.');
    }
    steps.push("Klik Deploy dan tunggu sampai selesai.");
  } else if (platform === "cloudflare") {
    steps.push(
      "Buka dashboard Cloudflare → Workers & Pages → Create → tab Pages → Connect to Git.",
      `Pilih ${repo} (pertama kali, kamu akan diminta menginstal GitHub App Cloudflare).`,
    );
    if (profile?.nestedProjectDir) {
      steps.push(`Di Build settings isi "Root directory" dengan "${profile.nestedProjectDir}".`);
    }
    if (profile?.type === "static") {
      steps.push(
        `Framework preset: "None". Kosongkan Build command, dan isi "Build output directory" dengan ${
          profile.staticDir ? `"${profile.staticDir}"` : '"/" (root repo)'
        }.`,
      );
    } else {
      steps.push('Pilih "Framework preset" yang sesuai, atau isi Build command & output directory secara manual.');
    }
    steps.push('Klik "Save and Deploy".');
  } else {
    steps.push(
      "Buka railway.com/new → Deploy from GitHub repo.",
      `Pilih ${repo} (kalau belum muncul, izinkan akses GitHub App Railway ke repo ini).`,
    );
    if (profile?.nestedProjectDir) {
      steps.push(
        `Setelah service terbuat: Settings → Source → Root Directory → isi "${profile.nestedProjectDir}".`,
      );
    }
    steps.push(
      "Tunggu build pertama. Kalau butuh URL publik: Settings → Networking → Generate Domain.",
    );
  }

  return {
    title: `Deploy manual ke ${name}`,
    message: `Kalau deploy otomatis belum bisa, kamu tetap bisa deploy lewat dashboard ${name} — biasanya cuma 2–3 menit.`,
    steps,
    links: [PLATFORM_LINKS[platform]],
  };
}

function blocked(
  platform: Platform,
  profile: ProjectProfile,
  repoFullName: string | undefined,
  title: string,
  message: string,
  steps: string[],
  suggest?: Platform,
): PlatformCompat {
  const manual = manualDeployGuide(platform, profile, repoFullName);
  return {
    level: "blocked",
    summary: title,
    notes: [message],
    guide: {
      title,
      message,
      steps,
      links: manual.links,
      suggestPlatform: suggest,
      retryable: !suggest,
    },
  };
}

/** Teks tipe project dalam kalimat ("repo ini berisi …"). */
function what(p: ProjectProfile): string {
  switch (p.type) {
    case "static":
      return "situs HTML statis";
    case "node":
      return p.framework ? `project ${p.framework}` : "project Node.js";
    case "docker":
      return "project berbasis Docker";
    case "empty":
      return "repo kosong";
    case "unknown":
      return "file yang tidak dikenali sebagai project web";
    default:
      return `project ${p.label}`;
  }
}

/**
 * Menilai apakah project cocok dideploy otomatis ke satu platform.
 * Dipakai SEBELUM deploy dimulai — kalau "blocked", deploy tidak dilanjutkan
 * dan user diberi penjelasan + panduan manual.
 */
export function evaluateCompat(
  platform: Platform,
  profile: ProjectProfile,
  repoFullName?: string,
): PlatformCompat {
  const name = PLATFORM_NAME[platform];
  const nested = profile.nestedProjectDir;

  /* ---------- kasus yang gagal di semua platform ---------- */
  if (profile.type === "empty") {
    return blocked(
      platform,
      profile,
      repoFullName,
      "Repo ini masih kosong",
      "Belum ada file sama sekali di repo ini, jadi tidak ada yang bisa di-deploy.",
      [
        "Push minimal satu file (mis. index.html atau package.json) ke branch utama repo.",
        'Pastikan branch default repo adalah branch yang berisi kodenya (cek di GitHub → Settings → Branches).',
        "Setelah itu, cek ulang di sini.",
      ],
    );
  }

  if (profile.type === "unknown") {
    if (nested) {
      return blocked(
        platform,
        profile,
        repoFullName,
        "Project ada di dalam subfolder",
        `Di root repo tidak ada file project, tapi folder "${nested}" sepertinya berisi project-nya. Deploy otomatis hanya membaca root repo.`,
        [
          `Cara termudah: deploy manual dan set "Root Directory" ke "${nested}" (lihat panduan di bawah).`,
          "Atau pindahkan isi folder itu ke root repo, lalu cek ulang di sini.",
        ],
      );
    }
    return blocked(
      platform,
      profile,
      repoFullName,
      "Jenis project tidak dikenali",
      "Di root repo tidak ada file yang menandakan project web (tidak ada index.html, package.json, Dockerfile, dll).",
      [
        "Pastikan URL repo benar dan branch default berisi kodenya.",
        "Kalau project ada di subfolder, pindahkan ke root repo atau deploy manual dengan Root Directory.",
        "Untuk situs HTML sederhana: pastikan ada file index.html di root repo.",
      ],
    );
  }

  /* ---------- HTML statis ---------- */
  if (profile.type === "static") {
    const notes: string[] = [];
    if (profile.staticDir) {
      notes.push(`index.html ada di folder "${profile.staticDir}", bukan di root — output directory akan diarahkan ke sana.`);
    }
    if (profile.staticDir === null) {
      notes.push("Tidak ada index.html — halaman utama mungkin tidak muncul. Ganti nama file utama jadi index.html.");
    }
    return {
      level: notes.length ? "warn" : "ok",
      summary: `Situs HTML statis — tidak perlu package.json, siap di-deploy ke ${name}.`,
      notes,
    };
  }

  /* ---------- Node.js ---------- */
  if (profile.type === "node") {
    if (profile.invalidPackageJson) {
      return blocked(
        platform,
        profile,
        repoFullName,
        "File package.json rusak",
        "package.json ada di repo ini, tetapi isinya bukan JSON yang valid, jadi platform tidak bisa membacanya.",
        [
          "Buka package.json di GitHub dan cari tanda baca yang salah (koma berlebih/kurang, kutip tidak tertutup).",
          "Tempel isinya ke jsonlint.com untuk melihat baris yang bermasalah.",
          "Setelah diperbaiki dan di-push, klik “Cek ulang”.",
        ],
      );
    }
    const notes: string[] = [];
    if (nested) notes.push(`Ada juga project di folder "${nested}" — pastikan root repo memang project yang mau di-deploy.`);

    if (platform === "cloudflare" && profile.framework && /^(Express|Fastify|NestJS|Koa)$/i.test(profile.framework)) {
      return blocked(
        platform,
        profile,
        repoFullName,
        `${profile.framework} tidak bisa jalan di Cloudflare Pages`,
        `${profile.framework} adalah server Node.js yang berjalan terus-menerus, sedangkan Cloudflare Pages hanya menyajikan situs statis/framework web tertentu.`,
        ["Pilih Railway sebagai platform tujuan — Railway menjalankan server Node.js apa adanya."],
        "railway",
      );
    }
    if (platform === "cloudflare" && !profile.framework) {
      return {
        level: "warn",
        summary: "Project Node.js tanpa framework web terdeteksi.",
        notes: [
          ...notes,
          "Cloudflare Pages hanya menjalankan situs statis/SSR berbasis framework yang didukung, bukan server Node.js biasa. Kalau ini backend (Express/Nest/dll), pakai Railway.",
        ],
      };
    }
    if (platform === "vercel" && profile.framework && /^(Express|Fastify|NestJS|Hono|Koa)$/i.test(profile.framework)) {
      return {
        level: "warn",
        summary: `${profile.framework} adalah server yang berjalan terus-menerus.`,
        notes: [
          ...notes,
          "Vercel menjalankan backend sebagai serverless function, jadi server Express/Nest biasa sering tidak jalan tanpa penyesuaian. Railway lebih cocok untuk ini.",
        ],
      };
    }
    return {
      level: notes.length ? "warn" : "ok",
      summary: `${profile.label} — siap di-deploy ke ${name}.`,
      notes,
    };
  }

  /* ---------- Docker & bahasa lain: hanya Railway yang bisa otomatis ---------- */
  if (platform === "railway") {
    return {
      level: "ok",
      summary: `${profile.label} — Railway bisa membangunnya otomatis.`,
      notes: nested ? [`Ada juga project di folder "${nested}".`] : [],
    };
  }

  return blocked(
    platform,
    profile,
    repoFullName,
    `${name} tidak cocok untuk repo ini`,
    `Repo ini berisi ${what(profile)}. ${name} hanya cocok untuk situs web (HTML statis atau framework JavaScript), jadi deploy otomatis ke sana tidak akan berhasil.`,
    [
      "Ganti platform tujuan ke Railway — Railway bisa membangun Dockerfile, Python, Go, PHP, Ruby, Java, dan lainnya.",
      `Atau kalau tetap ingin pakai ${name}, ubah project-nya jadi situs statis / framework JavaScript lebih dulu.`,
    ],
    "railway",
  );
}

export function evaluateAllPlatforms(
  profile: ProjectProfile,
  repoFullName?: string,
): Record<Platform, PlatformCompat> {
  return {
    vercel: evaluateCompat("vercel", profile, repoFullName),
    cloudflare: evaluateCompat("cloudflare", profile, repoFullName),
    railway: evaluateCompat("railway", profile, repoFullName),
  };
}

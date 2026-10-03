import type { NextResponse } from "next/server";
import { fail } from "@/app/api/_lib/response";
import { manualDeployGuide } from "@/lib/deploy-guides";
import type { GithubValidation, Platform } from "@/types";

/**
 * Pagar terakhir di sisi server: kalau jenis repo tidak cocok dengan platform
 * tujuan, hentikan SEBELUM menyentuh API platform (tidak ada project setengah
 * jadi), dan kembalikan penjelasan + langkah manual yang bisa langsung dipakai.
 * Mengembalikan `null` kalau aman untuk lanjut.
 */
export function guardCompat(validation: GithubValidation, platform: Platform): NextResponse | null {
  const compat = validation.compat[platform];
  if (compat.level !== "blocked") return null;

  const guide = compat.guide ?? manualDeployGuide(platform, validation.project, validation.fullName);
  const manual = manualDeployGuide(platform, validation.project, validation.fullName);
  const code = validation.project.type === "empty" ? "empty_repo" : "unsupported_project";
  return fail(
    guide.message,
    422,
    code,
    {
      ...guide,
      // Selalu sertakan link dashboard supaya user bisa deploy manual.
      links: [...(guide.links ?? []), ...(manual.links ?? [])].filter(
        (l, i, arr) => arr.findIndex((x) => x.url === l.url) === i
      ),
    }
  );
}

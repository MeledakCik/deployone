import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/app/api/_lib/response";
import { verifySession, SESSION_COOKIE } from "@/app/api/_lib/session";
import { isBlocked } from "@/app/api/_lib/admin";
import { isAdminEmail } from "@/app/api/_lib/admin-config";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySession(token);

  // Akun yang diblokir admin dianggap tidak login (cookie lama masih valid secara kriptografis).
  const blocked = !!payload && !isAdminEmail(payload.email) && (await isBlocked(payload.email));

  const user: AuthUser | null = payload && !blocked
    ? { name: payload.name, email: payload.email, picture: payload.picture, isAdmin: isAdminEmail(payload.email) }
    : null;

  return ok({ user });
});

import type { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/app/api/_lib/response";
import { verifySession, SESSION_COOKIE } from "@/app/api/_lib/session";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySession(token);

  const user: AuthUser | null = payload
    ? { name: payload.name, email: payload.email, picture: payload.picture }
    : null;

  return ok({ user });
});

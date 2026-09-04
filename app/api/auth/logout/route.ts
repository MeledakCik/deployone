import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/app/api/_lib/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true, data: { loggedOut: true } });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

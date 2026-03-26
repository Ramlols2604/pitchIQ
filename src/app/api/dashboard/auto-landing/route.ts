import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

const COOKIE_NAME = "pitchiq_dashboard_auto";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN", "TEAM_USER", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enabled = req.nextUrl.searchParams.get("enabled") === "1";
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set({
    name: COOKIE_NAME,
    value: enabled ? "1" : "0",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });
  return res;
}

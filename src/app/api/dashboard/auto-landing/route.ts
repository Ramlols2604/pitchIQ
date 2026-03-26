import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { setUserPreference } from "@/lib/user-preferences";

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["LEAGUE_ADMIN", "TEAM_USER", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enabled = req.nextUrl.searchParams.get("enabled") === "1";
  await setUserPreference(auth.userId, "dashboard.autoRedirect", enabled ? "1" : "0");
  return NextResponse.redirect(new URL("/dashboard", req.url));
}

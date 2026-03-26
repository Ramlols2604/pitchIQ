import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const COOKIE_NAME = "pitchiq_dashboard_default";

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["LEAGUE_ADMIN", "TEAM_USER", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const value = req.nextUrl.searchParams.get("value") ?? "";
  const supabase = getSupabaseAdmin();
  const team =
    auth.tenantId && (auth.role === "TEAM_USER" || auth.role === "LEAGUE_ADMIN")
      ? (
          await supabase
            .from("Team")
            .select("id")
            .eq("tenantId", auth.tenantId)
            .limit(1)
            .maybeSingle<{ id: string }>()
        ).data
      : null;
  const allowed = new Set(
    auth.role === "ANALYST_USER"
      ? ["/analytics/collapse", "/matches", ""]
      : auth.role === "TEAM_USER"
        ? ["/matches", ...(team ? [`/teams/${team.id}`] : []), ""]
        : ["/matches", "/matches/create", "/analytics/collapse", ...(team ? [`/teams/${team.id}`] : []), ""]
  );
  if (!allowed.has(value)) {
    return NextResponse.json({ error: "Invalid landing value for role" }, { status: 400 });
  }

  const res = NextResponse.redirect(new URL("/settings/profile", req.url));
  res.cookies.set({
    name: COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });
  return res;
}

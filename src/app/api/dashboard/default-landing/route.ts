import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { setUserPreference } from "@/lib/user-preferences";

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
  await setUserPreference(auth.userId, "dashboard.defaultLanding", value);
  return NextResponse.redirect(new URL("/settings/profile", req.url));
}

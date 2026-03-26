import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type TeamRow = { tenantId: string | null };

type MatchRow = {
  id: string;
  dateTime: string;
  teamAId: string;
  teamBId: string;
  venue: { name: string } | null;
  teamA: { shortCode: string; displayName: string } | null;
  teamB: { shortCode: string; displayName: string } | null;
};

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["TEAM_USER", "LEAGUE_ADMIN", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const seasonId = searchParams.get("seasonId");
  if (!teamId || !seasonId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: team, error: teamErr } = await supabase
    .from("Team")
    .select("tenantId")
    .eq("id", teamId)
    .maybeSingle<TeamRow>();
  if (teamErr) return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auth.role === "TEAM_USER" && auth.tenantId !== team.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: matches, error: matchesErr } = await supabase
    .from("Match")
    .select(
      "id,dateTime,teamAId,teamBId,venue:Venue!Match_venueId_fkey(name),teamA:Team!Match_teamAId_fkey(shortCode,displayName),teamB:Team!Match_teamBId_fkey(shortCode,displayName)"
    )
    .eq("seasonId", seasonId)
    .or(`teamAId.eq.${teamId},teamBId.eq.${teamId}`)
    .order("dateTime", { ascending: true })
    .returns<MatchRow[]>();
  if (matchesErr) return NextResponse.json({ error: "Failed to load matches" }, { status: 500 });

  return NextResponse.json({ ok: true, matches });
}


import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type MatchRow = {
  id: string;
  seasonId: string;
  teamAId: string;
  teamBId: string;
  teamA: { tenantId: string | null } | null;
  teamB: { tenantId: string | null } | null;
};

type SquadRow = { playerId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["TEAM_USER", "LEAGUE_ADMIN"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { matchId } = await params;

  const { data: match, error: matchErr } = await supabase
    .from("Match")
    .select(
      "id,seasonId,teamAId,teamBId,teamA:Team!Match_teamAId_fkey(tenantId),teamB:Team!Match_teamBId_fkey(tenantId)"
    )
    .eq("id", matchId)
    .maybeSingle<MatchRow>();
  if (matchErr) return NextResponse.json({ error: "Failed to load match" }, { status: 500 });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.role === "TEAM_USER") {
    const allowed =
      auth.tenantId &&
      (auth.tenantId === match.teamA?.tenantId || auth.tenantId === match.teamB?.tenantId);
    if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const selectedTeamId =
    auth.tenantId && auth.tenantId === match.teamB?.tenantId ? match.teamBId : match.teamAId;
  const tenantId = auth.tenantId ?? match.teamA?.tenantId ?? match.teamB?.tenantId ?? "unknown";

  const { data: squadData, error: squadErr } = await supabase
    .from("SquadMembership")
    .select("playerId")
    .eq("seasonId", match.seasonId)
    .eq("teamId", selectedTeamId)
    .returns<SquadRow[]>();
  if (squadErr) return NextResponse.json({ error: "Failed to load squad" }, { status: 500 });
  const squad = squadData ?? [];
  if (!squad.length) return NextResponse.json({ error: "No squad found for prediction" }, { status: 400 });

  const predictedXI = squad.slice(0, 11).map((s, idx) => ({
    playerId: s.playerId,
    score: 100 - idx,
    explanations: ["Stub selector: first available squad players"],
  }));
  const bench = squad.slice(11, 15).map((s, idx) => ({
    playerId: s.playerId,
    score: 89 - idx,
    explanations: ["Stub bench"],
  }));

  const { data: modelRun, error: runErr } = await supabase
    .from("ModelRun")
    .insert({
      matchId: match.id,
      tenantId,
      triggeredByUserId: auth.userId,
      modelVersion: "rules_v1_stub",
      predictedXI,
      bench,
      constraintLog: { mode: "stub", selectedTeamId, squadSize: squad.length },
      featureWeights: { stub: true },
      collapseRisk: null,
      collapseFactors: null,
    })
    .select("id")
    .single<{ id: string }>();

  if (runErr) {
    return NextResponse.json(
      { error: `Failed to save model run: ${runErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, modelRunId: modelRun.id });
}


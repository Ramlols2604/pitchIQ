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

type SquadRow = {
  playerId: string;
  player: {
    name: string;
    primaryRole: string;
    fieldingRole: string;
    isOverseas: boolean;
  } | null;
};

type AvailabilityRow = {
  playerId: string;
  status: string;
  workloadFlag: string | null;
};

type Candidate = {
  playerId: string;
  name: string;
  primaryRole: string;
  fieldingRole: string;
  isOverseas: boolean;
  status: string;
  workloadFlag: string | null;
  score: number;
  explanations: string[];
};

function isBowlingRole(role: string) {
  return role === "SPECIALIST_BOWLER" || role === "BOWLING_ALL_ROUNDER" || role === "ALL_ROUNDER";
}

function buildScore(c: Omit<Candidate, "score" | "explanations">) {
  let score = 50;
  const explanations: string[] = [];

  if (c.primaryRole === "ALL_ROUNDER" || c.primaryRole === "BOWLING_ALL_ROUNDER") {
    score += 20;
    explanations.push("All-rounder role balance");
  }
  if (c.primaryRole === "WICKET_KEEPER" || c.fieldingRole === "WICKET_KEEPER") {
    score += 15;
    explanations.push("Wicket-keeper coverage");
  }
  if (c.primaryRole === "SPECIALIST_BOWLER") {
    score += 10;
    explanations.push("Specialist bowling option");
  }
  if (c.primaryRole === "OPENER" || c.primaryRole === "TOP_ORDER") {
    score += 5;
    explanations.push("Top-order stability");
  }
  if (c.status === "DOUBTFUL") {
    score -= 8;
    explanations.push("Availability risk: doubtful");
  }
  if (c.workloadFlag === "HIGH") {
    score -= 6;
    explanations.push("High workload penalty");
  }
  if (c.workloadFlag === "MANAGED") {
    score -= 4;
    explanations.push("Managed workload penalty");
  }
  if (!explanations.length) explanations.push("Baseline squad selection");

  return { score, explanations };
}

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
    .select(
      "playerId,player:Player!SquadMembership_playerId_fkey(name,primaryRole,fieldingRole,isOverseas)"
    )
    .eq("seasonId", match.seasonId)
    .eq("teamId", selectedTeamId)
    .returns<SquadRow[]>();
  if (squadErr) return NextResponse.json({ error: "Failed to load squad" }, { status: 500 });
  const squad = squadData ?? [];
  if (!squad.length) return NextResponse.json({ error: "No squad found for prediction" }, { status: 400 });

  const { data: availData } = await supabase
    .from("PlayerAvailability")
    .select("playerId,status,workloadFlag")
    .eq("seasonId", match.seasonId)
    .eq("teamId", selectedTeamId)
    .returns<AvailabilityRow[]>();
  const availByPlayer = new Map((availData ?? []).map((a) => [a.playerId, a]));

  const baseCandidates: Candidate[] = squad
    .map((s) => {
      const p = s.player;
      if (!p) return null;
      const a = availByPlayer.get(s.playerId);
      const status = a?.status ?? "AVAILABLE";
      if (status === "INJURED" || status === "UNAVAILABLE" || status === "SUSPENDED") return null;
      const base = {
        playerId: s.playerId,
        name: p.name,
        primaryRole: p.primaryRole,
        fieldingRole: p.fieldingRole,
        isOverseas: p.isOverseas,
        status,
        workloadFlag: a?.workloadFlag ?? null,
      };
      const { score, explanations } = buildScore(base);
      return { ...base, score, explanations };
    })
    .filter((x): x is Candidate => !!x)
    .sort((a, b) => b.score - a.score);

  const selected: Candidate[] = [];
  const selectedIds = new Set<string>();
  let overseas = 0;

  function tryAdd(next: Candidate) {
    if (selectedIds.has(next.playerId)) return false;
    if (next.isOverseas && overseas >= 4) return false;
    selected.push(next);
    selectedIds.add(next.playerId);
    if (next.isOverseas) overseas += 1;
    return true;
  }

  // Hard constraints (minimal MVP rules)
  const keeper = baseCandidates.find(
    (c) => c.primaryRole === "WICKET_KEEPER" || c.fieldingRole === "WICKET_KEEPER"
  );
  if (keeper) tryAdd(keeper);

  while (selected.filter((c) => isBowlingRole(c.primaryRole)).length < 4) {
    const nextBowler = baseCandidates.find((c) => !selectedIds.has(c.playerId) && isBowlingRole(c.primaryRole));
    if (!nextBowler) break;
    if (!tryAdd(nextBowler)) break;
  }

  for (const c of baseCandidates) {
    if (selected.length >= 11) break;
    tryAdd(c);
  }

  // Fill remaining slots if overseas cap blocked selection
  if (selected.length < 11) {
    for (const c of baseCandidates) {
      if (selected.length >= 11) break;
      if (selectedIds.has(c.playerId)) continue;
      selected.push(c);
      selectedIds.add(c.playerId);
    }
  }

  const predictedXI = selected.slice(0, 11).map((c, idx) => ({
    playerId: c.playerId,
    score: c.score - idx,
    explanations: c.explanations,
  }));
  const bench = baseCandidates
    .filter((c) => !selectedIds.has(c.playerId))
    .slice(0, 4)
    .map((c) => ({ playerId: c.playerId, score: c.score, explanations: c.explanations }));

  const constraintLog = {
    mode: "rules_v1",
    selectedTeamId,
    squadSize: squad.length,
    availableCandidates: baseCandidates.length,
    selectedCount: predictedXI.length,
    bowlersInXI: selected.filter((c) => isBowlingRole(c.primaryRole)).length,
    keepersInXI: selected.filter((c) => c.primaryRole === "WICKET_KEEPER" || c.fieldingRole === "WICKET_KEEPER").length,
    overseasInXI: selected.filter((c) => c.isOverseas).length,
  };

  const { data: modelRun, error: runErr } = await supabase
    .from("ModelRun")
    .insert({
      matchId: match.id,
      tenantId,
      triggeredByUserId: auth.userId,
      modelVersion: "rules_v1",
      predictedXI,
      bench,
      constraintLog,
      featureWeights: {
        base: 50,
        allRounder: 20,
        keeper: 15,
        bowler: 10,
        topOrder: 5,
        doubtfulPenalty: -8,
        workloadHighPenalty: -6,
        workloadManagedPenalty: -4,
      },
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


import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type MatchRow = {
  id: string;
  seasonId: string;
  teamAId: string;
  teamBId: string;
  tossWinnerId: string | null;
  tossDecision: "BAT" | "FIELD" | null;
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

type OppSquadRow = {
  player: {
    primaryRole: string;
  } | null;
};

type AvailabilityRow = {
  playerId: string;
  status: string;
  workloadFlag: string | null;
};

type MatchContextRow = {
  pitchType: string;
  pitchCondition: string;
  weatherCondition: string;
  dewLikelihood: string;
  pressureTag: string;
  homeAdvantage: boolean;
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

function isTopOrderRole(role: string) {
  return role === "OPENER" || role === "TOP_ORDER";
}

function venueRoleTargets(ctx: MatchContextRow | null) {
  if (ctx?.pitchType === "SPIN_FRIENDLY" || ctx?.pitchCondition === "WORN") {
    return { minBowlers: 5, minTopOrder: 3, minAllRounders: 2 };
  }
  if (ctx?.pitchType === "FLAT") {
    return { minBowlers: 4, minTopOrder: 4, minAllRounders: 1 };
  }
  if (ctx?.pitchType === "PACE_FRIENDLY" || ctx?.weatherCondition === "OVERCAST") {
    return { minBowlers: 5, minTopOrder: 3, minAllRounders: 1 };
  }
  return { minBowlers: 4, minTopOrder: 3, minAllRounders: 1 };
}

function buildScore(
  c: Omit<Candidate, "score" | "explanations">,
  ctx: MatchContextRow | null,
  selectedTeamId: string,
  tossWinnerId: string | null,
  tossDecision: "BAT" | "FIELD" | null,
  oppBowlingDepth: number,
  oppTopOrderDepth: number
) {
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
  if (ctx?.pitchType === "SPIN_FRIENDLY" && c.primaryRole === "SPECIALIST_BOWLER") {
    score += 6;
    explanations.push("Pitch fit: specialist bowling uplift");
  }
  if (ctx?.dewLikelihood === "HIGH" && c.primaryRole === "BOWLING_ALL_ROUNDER") {
    score += 4;
    explanations.push("Dew resilience: bowling all-rounder uplift");
  }
  if (ctx?.pressureTag === "KNOCKOUT" && (c.primaryRole === "ALL_ROUNDER" || c.primaryRole === "WICKET_KEEPER")) {
    score += 3;
    explanations.push("Pressure scenario composure role boost");
  }
  if (ctx?.homeAdvantage) {
    score += 2;
    explanations.push("Home-condition familiarity");
  }
  if (tossWinnerId === selectedTeamId && tossDecision === "FIELD" && isBowlingRole(c.primaryRole)) {
    score += 4;
    explanations.push("Toss context: bowling first role boost");
  }
  if (tossWinnerId === selectedTeamId && tossDecision === "BAT" && (c.primaryRole === "OPENER" || c.primaryRole === "TOP_ORDER")) {
    score += 4;
    explanations.push("Toss context: batting first top-order boost");
  }
  if (oppBowlingDepth >= 4 && (c.primaryRole === "ALL_ROUNDER" || c.primaryRole === "BOWLING_ALL_ROUNDER")) {
    score += 4;
    explanations.push("Matchup: all-rounder value vs bowling-heavy opposition");
  }
  if (oppTopOrderDepth >= 4 && isBowlingRole(c.primaryRole)) {
    score += 4;
    explanations.push("Matchup: bowling depth value vs top-heavy opposition");
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
      "id,seasonId,teamAId,teamBId,tossWinnerId,tossDecision,teamA:Team!Match_teamAId_fkey(tenantId),teamB:Team!Match_teamBId_fkey(tenantId)"
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
  const opponentTeamId = selectedTeamId === match.teamAId ? match.teamBId : match.teamAId;
  const tenantId = auth.tenantId ?? match.teamA?.tenantId ?? match.teamB?.tenantId ?? "unknown";
  const { data: context } = await supabase
    .from("MatchContext")
    .select("pitchType,pitchCondition,weatherCondition,dewLikelihood,pressureTag,homeAdvantage")
    .eq("matchId", match.id)
    .maybeSingle<MatchContextRow>();
  const roleTargets = venueRoleTargets(context ?? null);

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
  const { data: opponentSquadData } = await supabase
    .from("SquadMembership")
    .select("player:Player!SquadMembership_playerId_fkey(primaryRole)")
    .eq("seasonId", match.seasonId)
    .eq("teamId", opponentTeamId)
    .returns<OppSquadRow[]>();
  const oppSquad = opponentSquadData ?? [];
  const oppBowlingDepth = oppSquad.filter((s) => isBowlingRole(s.player?.primaryRole ?? "")).length;
  const oppTopOrderDepth = oppSquad.filter((s) => isTopOrderRole(s.player?.primaryRole ?? "")).length;

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
      const { score, explanations } = buildScore(
        base,
        context ?? null,
        selectedTeamId,
        match.tossWinnerId ?? null,
        match.tossDecision ?? null,
        oppBowlingDepth,
        oppTopOrderDepth
      );
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

  while (selected.filter((c) => isBowlingRole(c.primaryRole)).length < roleTargets.minBowlers) {
    const nextBowler = baseCandidates.find((c) => !selectedIds.has(c.playerId) && isBowlingRole(c.primaryRole));
    if (!nextBowler) break;
    if (!tryAdd(nextBowler)) break;
  }
  while (selected.filter((c) => isTopOrderRole(c.primaryRole)).length < roleTargets.minTopOrder) {
    const nextTopOrder = baseCandidates.find(
      (c) => !selectedIds.has(c.playerId) && isTopOrderRole(c.primaryRole)
    );
    if (!nextTopOrder) break;
    if (!tryAdd(nextTopOrder)) break;
  }
  while (
    selected.filter((c) => c.primaryRole === "ALL_ROUNDER" || c.primaryRole === "BOWLING_ALL_ROUNDER")
      .length < roleTargets.minAllRounders
  ) {
    const nextAR = baseCandidates.find(
      (c) =>
        !selectedIds.has(c.playerId) &&
        (c.primaryRole === "ALL_ROUNDER" || c.primaryRole === "BOWLING_ALL_ROUNDER")
    );
    if (!nextAR) break;
    if (!tryAdd(nextAR)) break;
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
    mode: "rules_v3",
    selectedTeamId,
    squadSize: squad.length,
    availableCandidates: baseCandidates.length,
    selectedCount: predictedXI.length,
    venueRoleTargets: roleTargets,
    opponentBowlingDepth: oppBowlingDepth,
    opponentTopOrderDepth: oppTopOrderDepth,
    bowlersInXI: selected.filter((c) => isBowlingRole(c.primaryRole)).length,
    topOrderInXI: selected.filter((c) => isTopOrderRole(c.primaryRole)).length,
    allRoundersInXI: selected.filter(
      (c) => c.primaryRole === "ALL_ROUNDER" || c.primaryRole === "BOWLING_ALL_ROUNDER"
    ).length,
    keepersInXI: selected.filter((c) => c.primaryRole === "WICKET_KEEPER" || c.fieldingRole === "WICKET_KEEPER").length,
    overseasInXI: selected.filter((c) => c.isOverseas).length,
  };

  const { data: modelRun, error: runErr } = await supabase
    .from("ModelRun")
    .insert({
      matchId: match.id,
      tenantId,
      triggeredByUserId: auth.userId,
      modelVersion: "rules_v3",
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
        contextPitchRoleFit: 6,
        contextDewBoost: 4,
        contextPressureBoost: 3,
        contextHomeBoost: 2,
        tossContextBoost: 4,
        matchupVsOppBowlingDepth: 4,
        matchupVsOppTopOrderDepth: 4,
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


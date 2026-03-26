import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type MatchTenantRow = {
  id: string;
  teamA: { tenantId: string | null } | null;
  teamB: { tenantId: string | null } | null;
};

const DEFAULTS = {
  pitchType: "FLAT",
  pitchCondition: "FRESH",
  weatherCondition: "CLEAR",
  dewLikelihood: "LOW",
  pressureTag: "NORMAL",
} as const;

export async function PUT(
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
      "id,teamA:Team!Match_teamAId_fkey(tenantId),teamB:Team!Match_teamBId_fkey(tenantId)"
    )
    .eq("id", matchId)
    .maybeSingle<MatchTenantRow>();
  if (matchErr) return NextResponse.json({ error: "Failed to load match" }, { status: 500 });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.role === "TEAM_USER") {
    const allowed =
      auth.tenantId &&
      (auth.tenantId === match.teamA?.tenantId || auth.tenantId === match.teamB?.tenantId);
    if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        pitchType?: string;
        pitchCondition?: string;
        weatherCondition?: string;
        dewLikelihood?: string;
        boundaryOverride?: number | null;
        pressureTag?: string;
        homeAdvantage?: boolean;
        notes?: string | null;
        tossWinnerId?: string | null;
        tossDecision?: "BAT" | "FIELD" | null;
      }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: context, error: contextErr } = await supabase
    .from("MatchContext")
    .upsert(
      {
        matchId,
        pitchType: body.pitchType ?? DEFAULTS.pitchType,
        pitchCondition: body.pitchCondition ?? DEFAULTS.pitchCondition,
        weatherCondition: body.weatherCondition ?? DEFAULTS.weatherCondition,
        dewLikelihood: body.dewLikelihood ?? DEFAULTS.dewLikelihood,
        boundaryOverride: body.boundaryOverride ?? null,
        pressureTag: body.pressureTag ?? DEFAULTS.pressureTag,
        homeAdvantage: body.homeAdvantage ?? false,
        notes: body.notes ?? null,
      },
      { onConflict: "matchId" }
    )
    .select("*")
    .single();
  if (contextErr) {
    return NextResponse.json(
      { error: `Failed to save context: ${contextErr.message}` },
      { status: 500 }
    );
  }

  if ("tossWinnerId" in body || "tossDecision" in body) {
    const { error: tossErr } = await supabase
      .from("Match")
      .update({
        tossWinnerId: body.tossWinnerId ?? null,
        tossDecision: body.tossDecision ?? null,
      })
      .eq("id", matchId);
    if (tossErr) {
      return NextResponse.json(
        { error: `Failed to save toss fields: ${tossErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, context });
}


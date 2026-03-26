import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type OutcomePayload = {
  matchId?: string;
  collapseOccurred?: boolean;
  notes?: string;
};

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const seasonId = req.nextUrl.searchParams.get("seasonId");
  if (!seasonId) return NextResponse.json({ error: "seasonId is required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const matchQuery = supabase.from("Match").select("id").eq("seasonId", seasonId);
  const { data: matches, error: matchErr } = await matchQuery.returns<{ id: string }[]>();
  if (matchErr) return NextResponse.json({ error: `Failed to load matches: ${matchErr.message}` }, { status: 500 });
  const matchIds = (matches ?? []).map((m) => m.id);
  if (!matchIds.length) return NextResponse.json({ ok: true, outcomes: [] });

  const { data, error } = await supabase
    .from("MatchOutcome")
    .select("id,matchId,collapseOccurred,notes,updatedAt")
    .in("matchId", matchIds)
    .order("updatedAt", { ascending: false });
  if (error) return NextResponse.json({ error: `Failed to load outcomes: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, outcomes: data ?? [] });
}

export async function PUT(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["LEAGUE_ADMIN"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as OutcomePayload | null;
  if (!body?.matchId || typeof body?.collapseOccurred !== "boolean") {
    return NextResponse.json(
      { error: "matchId and collapseOccurred(boolean) are required" },
      { status: 400 }
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("MatchOutcome")
    .upsert(
      {
        matchId: body.matchId,
        collapseOccurred: body.collapseOccurred,
        notes: body.notes ?? null,
        labeledByUserId: auth.userId,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "matchId" }
    )
    .select("id,matchId,collapseOccurred,notes,updatedAt")
    .single();
  if (error) return NextResponse.json({ error: `Failed to save outcome: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true, outcome: data });
}

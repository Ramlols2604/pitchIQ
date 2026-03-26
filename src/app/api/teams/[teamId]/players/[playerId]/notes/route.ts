import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["TEAM_USER", "LEAGUE_ADMIN"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { teamId, playerId } = await params;

  const body = (await req.json().catch(() => null)) as
    | { seasonId?: string; notes?: string | null }
    | null;

  const seasonId = body?.seasonId;
  if (!seasonId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: team, error: teamErr } = await supabase
    .from("Team")
    .select("tenantId")
    .eq("id", teamId)
    .maybeSingle<{ tenantId: string | null }>();

  if (teamErr) return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.role === "TEAM_USER" && auth.tenantId !== team.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: membership, error: membershipErr } = await supabase
    .from("SquadMembership")
    .select("id")
    .eq("seasonId", seasonId)
    .eq("teamId", teamId)
    .eq("playerId", playerId)
    .maybeSingle<{ id: string }>();

  if (membershipErr) return NextResponse.json({ error: "Failed to load squad row" }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error: updateErr } = await supabase
    .from("SquadMembership")
    .update({ notes: body?.notes ?? null })
    .eq("id", membership.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `Failed to save notes: ${updateErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const VALID_STATUS = new Set<string>([
  "AVAILABLE",
  "DOUBTFUL",
  "INJURED",
  "RESTED",
  "SUSPENDED",
  "UNAVAILABLE",
]);

const VALID_WORKLOAD = new Set<string>(["NORMAL", "HIGH", "MANAGED"]);

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
    | {
        seasonId?: string;
        status?: string;
        injuryNote?: string | null;
        workloadFlag?: string | null;
      }
    | null;

  const seasonId = body?.seasonId;
  const status = body?.status;

  if (!seasonId || !status) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!VALID_STATUS.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body?.workloadFlag && !VALID_WORKLOAD.has(body.workloadFlag)) {
    return NextResponse.json({ error: "Invalid workloadFlag" }, { status: 400 });
  }

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

  const { data: row, error: upsertErr } = await supabase
    .from("PlayerAvailability")
    .upsert(
      {
        seasonId,
        teamId,
        playerId,
        status,
        injuryNote: body?.injuryNote ?? null,
        workloadFlag: body?.workloadFlag ?? "NORMAL",
        updatedByUserId: auth.userId,
      },
      { onConflict: "seasonId,teamId,playerId" }
    )
    .select("playerId,status,injuryNote,workloadFlag")
    .single();

  if (upsertErr) {
    return NextResponse.json(
      { error: `Failed to save availability: ${upsertErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    playerId: row.playerId,
    status: row.status,
    injuryNote: row.injuryNote,
    workloadFlag: row.workloadFlag,
  });
}
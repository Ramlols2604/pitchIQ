import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

function csvEscape(v: unknown) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["LEAGUE_ADMIN", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const teamId = searchParams.get("teamId");
  if (!seasonId) return NextResponse.json({ error: "seasonId is required" }, { status: 400 });

  const matchIdsQuery = supabase.from("Match").select("id").eq("seasonId", seasonId);
  if (teamId) matchIdsQuery.or(`teamAId.eq.${teamId},teamBId.eq.${teamId}`);
  const { data: matchIdsData, error: matchIdsErr } = await matchIdsQuery.returns<{ id: string }[]>();
  if (matchIdsErr) return NextResponse.json({ error: "Failed to load matches" }, { status: 500 });
  const matchIds = (matchIdsData ?? []).map((m) => m.id);
  if (!matchIds.length) {
    return new NextResponse("runId,createdAt,modelVersion,teamA,teamB,collapseRisk,source\n", {
      headers: { "content-type": "text/csv; charset=utf-8" },
    });
  }

  const { data: runsData, error: runsErr } = await supabase
    .from("ModelRun")
    .select(
      "id,createdAt,modelVersion,collapseRisk,collapseFactors,match:Match!ModelRun_matchId_fkey(teamA:Team!Match_teamAId_fkey(shortCode),teamB:Team!Match_teamBId_fkey(shortCode))"
    )
    .in("matchId", matchIds)
    .order("createdAt", { ascending: false })
    .limit(200)
    .returns<
      {
        id: string;
        createdAt: string;
        modelVersion: string;
        collapseRisk: number | null;
        collapseFactors: { source?: string } | null;
        match: { teamA: { shortCode: string } | null; teamB: { shortCode: string } | null } | null;
      }[]
    >();
  if (runsErr) return NextResponse.json({ error: "Failed to load runs" }, { status: 500 });

  const rows = [
    ["runId", "createdAt", "modelVersion", "teamA", "teamB", "collapseRisk", "source"],
    ...(runsData ?? []).map((r) => [
      r.id,
      r.createdAt,
      r.modelVersion,
      r.match?.teamA?.shortCode ?? "",
      r.match?.teamB?.shortCode ?? "",
      r.collapseRisk ?? "",
      r.collapseFactors?.source ?? "derived",
    ]),
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
  const filename = `collapse-runs-${auth.role.toLowerCase()}-${seasonId}.csv`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

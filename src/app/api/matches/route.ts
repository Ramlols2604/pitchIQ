import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";

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

  const team = await db.team.findUnique({ where: { id: teamId }, select: { tenantId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auth.role === "TEAM_USER" && auth.tenantId !== team.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const matches = await db.match.findMany({
    where: {
      seasonId,
      OR: [{ teamAId: teamId }, { teamBId: teamId }],
    },
    orderBy: { dateTime: "asc" },
    select: {
      id: true,
      dateTime: true,
      teamAId: true,
      teamBId: true,
      venue: { select: { name: true } },
      teamA: { select: { shortCode: true, displayName: true } },
      teamB: { select: { shortCode: true, displayName: true } },
    },
  });

  return NextResponse.json({ ok: true, matches });
}


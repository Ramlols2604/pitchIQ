import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";

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

  const { teamId, playerId } = await params;
  const body = (await req.json().catch(() => null)) as
    | { seasonId?: string; notes?: string | null }
    | null;
  const seasonId = body?.seasonId;
  if (!seasonId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const team = await db.team.findUnique({ where: { id: teamId }, select: { tenantId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auth.role === "TEAM_USER" && auth.tenantId !== team.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await db.squadMembership.findUnique({
    where: { seasonId_teamId_playerId: { seasonId, teamId, playerId } },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.squadMembership.update({
    where: { id: membership.id },
    data: { notes: body?.notes ?? null },
  });

  return NextResponse.json({ ok: true });
}


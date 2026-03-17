import { NextRequest, NextResponse } from "next/server";
import { AvailabilityStatus, WorkloadFlag } from "@prisma/client";

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";

const VALID_STATUS = new Set<string>(Object.values(AvailabilityStatus));
const VALID_WORKLOAD = new Set<string>(Object.values(WorkloadFlag));

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
    | {
        seasonId?: string;
        status?: AvailabilityStatus;
        injuryNote?: string | null;
        workloadFlag?: WorkloadFlag | null;
      }
    | null;
  const seasonId = body?.seasonId;
  const status = body?.status;
  if (!seasonId || !status) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!VALID_STATUS.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (body?.workloadFlag && !VALID_WORKLOAD.has(body.workloadFlag)) {
    return NextResponse.json({ error: "Invalid workloadFlag" }, { status: 400 });
  }

  const team = await db.team.findUnique({ where: { id: teamId }, select: { tenantId: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auth.role === "TEAM_USER" && auth.tenantId !== team.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = await db.playerAvailability.upsert({
    where: { seasonId_teamId_playerId: { seasonId, teamId, playerId } },
    update: {
      status,
      injuryNote: body?.injuryNote ?? null,
      workloadFlag: body?.workloadFlag ?? undefined,
      updatedByUserId: auth.userId,
    },
    create: {
      seasonId,
      teamId,
      playerId,
      status,
      injuryNote: body?.injuryNote ?? null,
      workloadFlag: body?.workloadFlag ?? WorkloadFlag.NORMAL,
      updatedByUserId: auth.userId,
    },
  });

  return NextResponse.json({
    ok: true,
    playerId: row.playerId,
    status: row.status,
    injuryNote: row.injuryNote,
    workloadFlag: row.workloadFlag,
  });
}


import { NextRequest, NextResponse } from "next/server";
import {
  DewLevel,
  PitchCondition,
  PitchType,
  PressureTag,
  TossDecision,
  WeatherType,
} from "@prisma/client";

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";

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

  const { matchId } = await params;
  const match = await db.match.findUnique({
    where: { id: matchId },
    select: { id: true, teamAId: true, teamBId: true, teamA: { select: { tenantId: true } }, teamB: { select: { tenantId: true } } },
  });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.role === "TEAM_USER") {
    const allowed =
      auth.tenantId &&
      (auth.tenantId === match.teamA.tenantId || auth.tenantId === match.teamB.tenantId);
    if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        pitchType?: PitchType;
        pitchCondition?: PitchCondition;
        weatherCondition?: WeatherType;
        dewLikelihood?: DewLevel;
        boundaryOverride?: number | null;
        pressureTag?: PressureTag;
        homeAdvantage?: boolean;
        notes?: string | null;
        tossWinnerId?: string | null;
        tossDecision?: TossDecision | null;
      }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const context = await db.matchContext.upsert({
    where: { matchId },
    update: {
      pitchType: body.pitchType ?? undefined,
      pitchCondition: body.pitchCondition ?? undefined,
      weatherCondition: body.weatherCondition ?? undefined,
      dewLikelihood: body.dewLikelihood ?? undefined,
      boundaryOverride: body.boundaryOverride ?? undefined,
      pressureTag: body.pressureTag ?? undefined,
      homeAdvantage: body.homeAdvantage ?? undefined,
      notes: body.notes ?? undefined,
    },
    create: {
      matchId,
      pitchType: body.pitchType ?? PitchType.FLAT,
      pitchCondition: body.pitchCondition ?? PitchCondition.FRESH,
      weatherCondition: body.weatherCondition ?? WeatherType.CLEAR,
      dewLikelihood: body.dewLikelihood ?? DewLevel.LOW,
      boundaryOverride: body.boundaryOverride ?? null,
      pressureTag: body.pressureTag ?? PressureTag.NORMAL,
      homeAdvantage: body.homeAdvantage ?? false,
      notes: body.notes ?? null,
    },
  });

  if ("tossWinnerId" in body || "tossDecision" in body) {
    await db.match.update({
      where: { id: matchId },
      data: {
        tossWinnerId: body.tossWinnerId ?? undefined,
        tossDecision: body.tossDecision ?? undefined,
      },
    });
  }

  return NextResponse.json({ ok: true, context });
}


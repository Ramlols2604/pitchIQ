import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        seasonYear?: number;
        dateTime?: string;
        teamAShortCode?: string;
        teamBShortCode?: string;
        venue?: { name?: string; city?: string };
        matchNumber?: number | null;
      }
    | null;

  const seasonYear = body?.seasonYear;
  const dateTime = body?.dateTime ? new Date(body.dateTime) : null;
  const teamAShortCode = body?.teamAShortCode?.trim().toUpperCase();
  const teamBShortCode = body?.teamBShortCode?.trim().toUpperCase();
  const venueName = body?.venue?.name?.trim();
  const venueCity = body?.venue?.city?.trim();

  if (
    !seasonYear ||
    !dateTime ||
    Number.isNaN(dateTime.getTime()) ||
    !teamAShortCode ||
    !teamBShortCode ||
    !venueName ||
    !venueCity
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const [teamA, teamB] = await Promise.all([
    db.team.findUnique({ where: { shortCode: teamAShortCode } }),
    db.team.findUnique({ where: { shortCode: teamBShortCode } }),
  ]);
  if (!teamA || !teamB) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const season = await db.season.upsert({
    where: { year: seasonYear },
    update: {},
    create: { year: seasonYear, name: `IPL ${seasonYear}`, leagueName: "IPL" },
  });

  const existingVenue = await db.venue.findFirst({
    where: { name: venueName, city: venueCity },
  });
  const venue =
    existingVenue ??
    (await db.venue.create({
      data: { name: venueName, city: venueCity },
    }));

  const match = await db.match.create({
    data: {
      seasonId: season.id,
      venueId: venue.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      dateTime,
      matchNumber: body?.matchNumber ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    matchId: match.id,
    seasonId: season.id,
    venueId: venue.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
  });
}


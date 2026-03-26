import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
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

  const [{ data: teamA }, { data: teamB }] = await Promise.all([
    supabase.from("Team").select("id").eq("shortCode", teamAShortCode).maybeSingle<{ id: string }>(),
    supabase.from("Team").select("id").eq("shortCode", teamBShortCode).maybeSingle<{ id: string }>(),
  ]);
  if (!teamA || !teamB) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const { data: season, error: seasonErr } = await supabase
    .from("Season")
    .upsert(
      { year: seasonYear, name: `IPL ${seasonYear}`, leagueName: "IPL" },
      { onConflict: "year" }
    )
    .select("id")
    .single<{ id: string }>();
  if (seasonErr) return NextResponse.json({ error: `Failed to upsert season: ${seasonErr.message}` }, { status: 500 });

  const { data: venue, error: venueErr } = await supabase
    .from("Venue")
    .upsert({ name: venueName, city: venueCity }, { onConflict: "name,city" })
    .select("id")
    .single<{ id: string }>();
  if (venueErr) return NextResponse.json({ error: `Failed to upsert venue: ${venueErr.message}` }, { status: 500 });

  const { data: match, error: matchErr } = await supabase
    .from("Match")
    .insert({
      seasonId: season.id,
      venueId: venue.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      dateTime: dateTime.toISOString(),
      matchNumber: body?.matchNumber ?? null,
    })
    .select("id")
    .single<{ id: string }>();
  if (matchErr) return NextResponse.json({ error: `Failed to create match: ${matchErr.message}` }, { status: 500 });

  return NextResponse.json({
    ok: true,
    matchId: match.id,
    seasonId: season.id,
    venueId: venue.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
  });
}


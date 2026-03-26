import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

type SchedulePayload = {
  seasonId?: string;
  teamId?: string;
  format?: "csv";
  cadence?: "daily" | "weekly";
  destinationEmail?: string;
};

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    schedules: [],
    note: "Scheduling scaffold only. Persisted jobs are not implemented yet.",
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as SchedulePayload | null;
  if (!body?.seasonId || !body?.destinationEmail) {
    return NextResponse.json(
      { error: "seasonId and destinationEmail are required" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    accepted: true,
    schedule: {
      id: `scaffold_${Date.now()}`,
      seasonId: body.seasonId,
      teamId: body.teamId ?? null,
      format: body.format ?? "csv",
      cadence: body.cadence ?? "weekly",
      destinationEmail: body.destinationEmail,
      status: "scaffold_pending_worker",
    },
    note: "Scaffold accepted. Wire this to persistent storage + cron worker next.",
  });
}

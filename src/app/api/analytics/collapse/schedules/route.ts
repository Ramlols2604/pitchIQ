import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type SchedulePayload = {
  seasonId?: string;
  teamId?: string;
  format?: "csv";
  cadence?: "daily" | "weekly";
  destinationEmail?: string;
};

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["LEAGUE_ADMIN", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const q = supabase
    .from("ScheduledExport")
    .select("id,seasonId,teamId,format,cadence,destinationEmail,status,nextRunAt,createdAt")
    .order("createdAt", { ascending: false })
    .limit(50);
  if (auth.tenantId) q.eq("tenantId", auth.tenantId);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json(
      {
        error: `Failed to load schedules: ${error.message}`,
        hint: "Create table ScheduledExport using the SQL scaffold in supabase/sql.",
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, schedules: data ?? [] });
}

export async function POST(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["LEAGUE_ADMIN", "ANALYST_USER"] });
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

  const supabase = getSupabaseAdmin();
  const cadence = body.cadence ?? "weekly";
  const nextRunAt = new Date(
    Date.now() + (cadence === "daily" ? 24 : 7 * 24) * 60 * 60 * 1000
  ).toISOString();
  const { data, error } = await supabase
    .from("ScheduledExport")
    .insert({
      tenantId: auth.tenantId,
      createdByUserId: auth.userId,
      seasonId: body.seasonId,
      teamId: body.teamId ?? null,
      format: body.format ?? "csv",
      cadence,
      destinationEmail: body.destinationEmail,
      status: "ACTIVE",
      nextRunAt,
    })
    .select("id,seasonId,teamId,format,cadence,destinationEmail,status,nextRunAt")
    .single();
  if (error) {
    return NextResponse.json(
      {
        error: `Failed to create schedule: ${error.message}`,
        hint: "Create table ScheduledExport using the SQL scaffold in supabase/sql.",
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, schedule: data });
}

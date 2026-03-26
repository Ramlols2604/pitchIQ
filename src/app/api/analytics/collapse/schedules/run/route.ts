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
  const nowIso = new Date().toISOString();
  const { data: due, error: dueErr } = await supabase
    .from("ScheduledExport")
    .select("id,seasonId,teamId,format,cadence,destinationEmail,nextRunAt")
    .eq("status", "ACTIVE")
    .lte("nextRunAt", nowIso)
    .order("nextRunAt", { ascending: true })
    .limit(25);
  if (dueErr) {
    return NextResponse.json(
      {
        error: `Failed to load due schedules: ${dueErr.message}`,
        hint: "Create table ScheduledExport using the SQL scaffold in supabase/sql.",
      },
      { status: 500 }
    );
  }

  const processed: { id: string; exportUrl: string; nextRunAt: string }[] = [];
  for (const s of due ?? []) {
    const nextRunAt = new Date(
      Date.now() + (s.cadence === "daily" ? 24 : 7 * 24) * 60 * 60 * 1000
    ).toISOString();
    const exportUrl = `/api/analytics/collapse/export?seasonId=${encodeURIComponent(s.seasonId)}${
      s.teamId ? `&teamId=${encodeURIComponent(s.teamId)}` : ""
    }`;
    await supabase.from("ScheduledExport").update({ nextRunAt }).eq("id", s.id);
    processed.push({ id: s.id, exportUrl, nextRunAt });
  }

  return NextResponse.json({
    ok: true,
    processedCount: processed.length,
    processed,
    note: "Runner stub advances schedule windows. Delivery integration is pending.",
  });
}

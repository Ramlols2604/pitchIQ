import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type DueSchedule = {
  id: string;
  seasonId: string;
  teamId: string | null;
  format: string;
  cadence: "daily" | "weekly";
  destinationEmail: string;
  nextRunAt: string;
};

async function insertRunLog(
  scheduleId: string,
  ok: boolean,
  exportUrl: string,
  responseCode: number | null,
  errorText: string | null
) {
  const supabase = getSupabaseAdmin();
  await supabase.from("ScheduledExportRun").insert({
    scheduleId,
    status: ok ? "SUCCESS" : "FAILED",
    exportUrl,
    responseCode,
    errorText,
    createdAt: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const appUrl = process.env.APP_URL?.trim() || new URL(req.url).origin;
  const webhookUrl = process.env.SCHEDULED_EXPORT_WEBHOOK_URL?.trim() || "";
  const nowIso = new Date().toISOString();
  const { data: due, error: dueErr } = await supabase
    .from("ScheduledExport")
    .select("id,seasonId,teamId,format,cadence,destinationEmail,nextRunAt")
    .eq("status", "ACTIVE")
    .lte("nextRunAt", nowIso)
    .order("nextRunAt", { ascending: true })
    .limit(25)
    .returns<DueSchedule[]>();
  if (dueErr) {
    return NextResponse.json(
      {
        error: `Failed to load due schedules: ${dueErr.message}`,
        hint: "Create table ScheduledExport using the SQL scaffold in supabase/sql.",
      },
      { status: 500 }
    );
  }

  const processed: {
    id: string;
    exportUrl: string;
    nextRunAt: string | null;
    delivered: boolean;
    responseCode: number | null;
    error: string | null;
  }[] = [];
  for (const s of due ?? []) {
    const exportPath = `/api/analytics/collapse/export?seasonId=${encodeURIComponent(s.seasonId)}${
      s.teamId ? `&teamId=${encodeURIComponent(s.teamId)}` : ""
    }`;
    const exportUrl = `${appUrl}${exportPath}`;
    let delivered = false;
    let responseCode: number | null = null;
    let errorText: string | null = null;

    if (webhookUrl) {
      try {
        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scheduleId: s.id,
            destinationEmail: s.destinationEmail,
            format: s.format,
            exportUrl,
            seasonId: s.seasonId,
            teamId: s.teamId,
          }),
        });
        responseCode = resp.status;
        delivered = resp.ok;
        if (!resp.ok) errorText = `Webhook non-2xx: ${resp.status}`;
      } catch (err) {
        errorText = err instanceof Error ? err.message : "Webhook delivery failed";
      }
    } else {
      errorText = "Missing SCHEDULED_EXPORT_WEBHOOK_URL";
    }

    await insertRunLog(s.id, delivered, exportUrl, responseCode, errorText).catch(() => null);

    if (delivered) {
      const nextRunAt = new Date(
        Date.now() + (s.cadence === "daily" ? 24 : 7 * 24) * 60 * 60 * 1000
      ).toISOString();
      await supabase
        .from("ScheduledExport")
        .update({ nextRunAt, lastRunAt: nowIso })
        .eq("id", s.id);
      processed.push({ id: s.id, exportUrl, nextRunAt, delivered, responseCode, error: null });
    } else {
      processed.push({
        id: s.id,
        exportUrl,
        nextRunAt: null,
        delivered,
        responseCode,
        error: errorText,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processedCount: processed.length,
    processed,
    note:
      webhookUrl
        ? "Runner attempted webhook deliveries. Successful schedules were advanced."
        : "Runner could not deliver because SCHEDULED_EXPORT_WEBHOOK_URL is not configured.",
  });
}

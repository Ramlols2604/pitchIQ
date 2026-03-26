import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

type Payload = {
  event?: string;
  version?: string;
  scheduleId?: string;
  destinationEmail?: string;
  format?: string;
  exportUrl?: string;
  seasonId?: string;
  teamId?: string | null;
  generatedAt?: string;
};

function verifySignature(secret: string, rawBody: string, signature: string) {
  if (!secret) return true;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

async function sendEmailViaResend(args: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) throw new Error("Missing RESEND_API_KEY");

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: args.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    }),
  });

  const data = (await resp.json().catch(() => null)) as unknown;
  if (!resp.ok) {
    let msg = "";
    if (data && typeof data === "object" && "error" in data) {
      const maybeError = (data as { error?: unknown }).error;
      msg = typeof maybeError === "string" ? maybeError : maybeError != null ? String(maybeError) : "";
    }
    throw new Error(`Resend send failed: ${resp.status}${msg ? ` - ${msg}` : ""}`);
  }

  return data;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-pitchiq-signature") ?? "";
  const secret = process.env.SCHEDULED_EXPORT_WEBHOOK_SECRET?.trim() || "";
  if (!verifySignature(secret, rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Payload | null = null;
  try {
    body = JSON.parse(rawBody) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body?.event !== "scheduled_export.ready" || body?.version !== "v1") {
    return NextResponse.json({ error: "Unsupported payload contract" }, { status: 400 });
  }
  if (!body.destinationEmail || !body.exportUrl || !body.scheduleId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const provider = (process.env.SCHEDULED_EXPORT_EMAIL_PROVIDER ?? "disabled").trim().toLowerCase();
  if (provider === "disabled") {
    return NextResponse.json({ error: "Scheduled export email sending is disabled" }, { status: 503 });
  }

  if (provider !== "resend") {
    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  const from = process.env.SCHEDULED_EXPORT_EMAIL_FROM?.trim();
  if (!from) return NextResponse.json({ error: "Missing SCHEDULED_EXPORT_EMAIL_FROM" }, { status: 500 });

  const seasonLabel = body.seasonId ? `season ${body.seasonId}` : "the season";
  const teamLabel = body.teamId ? ` team ${body.teamId}` : "";
  const subject = `pitchIQ scheduled export (${seasonLabel}${teamLabel})`;
  const text = `Your scheduled pitchIQ export is ready.\n\nExport link:\n${body.exportUrl}\n\nGeneratedAt: ${body.generatedAt ?? ""}\n`;
  const html = `<p>Your scheduled pitchIQ export is ready.</p><p><a href="${body.exportUrl}">Download export</a></p><p style="color:#666;font-size:12px;">GeneratedAt: ${body.generatedAt ?? ""}</p>`;

  try {
    const data = await sendEmailViaResend({
      to: body.destinationEmail,
      from,
      subject,
      text,
      html,
    });

    return NextResponse.json({
      ok: true,
      accepted: true,
      provider: "resend",
      resendResponse: data,
      scheduleId: body.scheduleId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Email send failed" },
      { status: 502 }
    );
  }
}

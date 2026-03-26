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

  // Provider adapter skeleton: replace this with real provider send API call.
  return NextResponse.json({
    ok: true,
    accepted: true,
    provider: "skeleton",
    to: body.destinationEmail,
    exportUrl: body.exportUrl,
    scheduleId: body.scheduleId,
  });
}

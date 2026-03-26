import { NextRequest, NextResponse } from "next/server";

import { newToken, requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const INVITE_EXPIRY_DAYS = Number(process.env.INVITE_EXPIRY_DAYS ?? 7);

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req, { roles: ["LEAGUE_ADMIN"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string; role?: "LEAGUE_ADMIN" | "TEAM_USER" | "ANALYST_USER"; tenantId?: string | null }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const role = body?.role;
  const tenantId = body?.tenantId ?? null;

  if (!email || !role) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (role === "TEAM_USER" && !tenantId) {
    return NextResponse.json({ error: "tenantId required for TEAM_USER" }, { status: 400 });
  }

  const inviteToken = newToken();
  const inviteExpiry = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const supabase = getSupabaseAdmin();

  const { data: user, error: userErr } = await supabase
    .from("User")
    .upsert(
      {
        email,
        role,
        tenantId,
        inviteToken,
        inviteExpiry: inviteExpiry.toISOString(),
      },
      { onConflict: "email" }
    )
    .select("id")
    .single<{ id: string }>();
  if (userErr) return NextResponse.json({ error: `Failed to upsert user: ${userErr.message}` }, { status: 500 });

  return NextResponse.json({
    ok: true,
    userId: user.id,
    inviteToken,
  });
}


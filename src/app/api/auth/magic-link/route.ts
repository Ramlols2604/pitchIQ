import { NextRequest, NextResponse } from "next/server";

import { newToken } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const MAGIC_LINK_EXPIRY_MINUTES = Number(process.env.MAGIC_LINK_EXPIRY_MINUTES ?? 15);

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const { data: user } = await supabase.from("User").select("id").eq("email", email).maybeSingle<{ id: string }>();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const token = newToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  const { error: sessionErr } = await supabase.from("Session").insert({
    userId: user.id,
    token,
    expiresAt: expiresAt.toISOString(),
  });
  if (sessionErr) return NextResponse.json({ error: "Failed to create magic link" }, { status: 500 });

  // Minimal MVP: return link in response. Replace with email sender later.
  const origin = req.nextUrl.origin;
  const link = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

  return NextResponse.json({ ok: true, link });
}


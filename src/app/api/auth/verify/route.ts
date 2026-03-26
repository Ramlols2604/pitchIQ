import { NextRequest, NextResponse } from "next/server";

import { newToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const SESSION_DURATION_HOURS = Number(process.env.SESSION_DURATION_HOURS ?? 72);

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: magic } = await supabase
    .from("Session")
    .select("userId,expiresAt")
    .eq("token", token)
    .maybeSingle<{ userId: string; expiresAt: string }>();
  if (!magic || new Date(magic.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await supabase.from("Session").delete().eq("token", token);

  const sessionToken = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const { error: sessionErr } = await supabase.from("Session").insert({
    userId: magic.userId,
    token: sessionToken,
    expiresAt: expiresAt.toISOString(),
  });
  if (sessionErr) return NextResponse.json({ error: "Failed to create session" }, { status: 500 });

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}


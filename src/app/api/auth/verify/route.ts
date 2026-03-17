import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { newToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const SESSION_DURATION_HOURS = Number(process.env.SESSION_DURATION_HOURS ?? 72);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const magic = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!magic || magic.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await db.session.delete({ where: { token } });

  const sessionToken = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  await db.session.create({
    data: {
      userId: magic.userId,
      token: sessionToken,
      expiresAt,
    },
  });

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


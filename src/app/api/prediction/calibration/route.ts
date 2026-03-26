import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { setUserPreference } from "@/lib/user-preferences";

type Preset = "default" | "conservative" | "balanced" | "aggressive";

const PRESETS: Record<Preset, { blend: string; rawShift: string }> = {
  default: { blend: "", rawShift: "" },
  conservative: { blend: "0.90", rawShift: "0.03" },
  balanced: { blend: "0.75", rawShift: "0.00" },
  aggressive: { blend: "0.65", rawShift: "-0.03" },
};

export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req, { roles: ["LEAGUE_ADMIN", "TEAM_USER", "ANALYST_USER"] });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const preset = (req.nextUrl.searchParams.get("preset") ?? "default") as Preset;
  const selected = PRESETS[preset] ?? PRESETS.default;
  await setUserPreference(auth.userId, "prediction.calibrationBlend", selected.blend);
  await setUserPreference(auth.userId, "prediction.calibrationRawShift", selected.rawShift);
  const res = NextResponse.redirect(new URL("/settings/profile", req.url));
  res.cookies.set({
    name: "pitchiq_calib_blend",
    value: selected.blend,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });
  res.cookies.set({
    name: "pitchiq_calib_raw_shift",
    value: selected.rawShift,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });
  return res;
}

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
  return NextResponse.redirect(new URL("/settings/profile", req.url));
}

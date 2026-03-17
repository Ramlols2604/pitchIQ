import { NextRequest, NextResponse } from "next/server";

import { getAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(auth);
}


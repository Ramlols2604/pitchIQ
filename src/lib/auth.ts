import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase";

export type AuthContext = {
  userId: string;
  role: "LEAGUE_ADMIN" | "TEAM_USER" | "ANALYST_USER";
  tenantId: string | null;
  email: string;
};

export const SESSION_COOKIE_NAME = "pitchiq_session";

export function newToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export async function getAuth(req?: NextRequest): Promise<AuthContext | null> {
  const token = req
    ? req.cookies.get(SESSION_COOKIE_NAME)?.value
    : (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data: session, error } = await supabase
    .from("Session")
    .select("userId,expiresAt,user:User!Session_userId_fkey(id,email,role,tenantId)")
    .eq("token", token)
    .maybeSingle<{
      userId: string;
      expiresAt: string;
      user: { id: string; email: string; role: AuthContext["role"]; tenantId: string | null } | null;
    }>();
  if (error || !session || !session.user || new Date(session.expiresAt) < new Date()) return null;

  return {
    userId: session.user.id,
    role: session.user.role,
    tenantId: session.user.tenantId,
    email: session.user.email,
  };
}

export async function requireAuth(
  req: NextRequest,
  options?: { roles?: AuthContext["role"][]; tenantId?: string }
): Promise<AuthContext> {
  const auth = await getAuth(req);
  if (!auth) throw new Error("Unauthorized");

  if (options?.roles && !options.roles.includes(auth.role)) {
    throw new Error("Forbidden");
  }
  if (options?.tenantId && auth.role === "TEAM_USER" && auth.tenantId !== options.tenantId) {
    throw new Error("Forbidden");
  }
  return auth;
}


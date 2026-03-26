import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserPreferences } from "@/lib/user-preferences";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ auto?: string }>;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");
  const supabase = getSupabaseAdmin();
  const sp = await searchParams;
  const cookieStore = await cookies();
  const prefs = await getUserPreferences(auth.userId, [
    "dashboard.autoRedirect",
    "dashboard.defaultLanding",
  ]);
  const prefAuto =
    (prefs.get("dashboard.autoRedirect") ?? cookieStore.get("pitchiq_dashboard_auto")?.value) === "1";
  const prefDefault =
    prefs.get("dashboard.defaultLanding") ?? cookieStore.get("pitchiq_dashboard_default")?.value ?? "";

  const team =
    auth.tenantId && (auth.role === "TEAM_USER" || auth.role === "LEAGUE_ADMIN")
      ? (
          await supabase
            .from("Team")
            .select("id")
            .eq("tenantId", auth.tenantId)
            .limit(1)
            .maybeSingle<{ id: string }>()
        ).data
      : null;
  const roleLabel =
    auth.role === "LEAGUE_ADMIN"
      ? "League admin"
      : auth.role === "TEAM_USER"
        ? "Team user"
        : "Analyst";

  const defaultLanding =
    auth.role === "ANALYST_USER"
      ? "/analytics/collapse"
      : auth.role === "TEAM_USER"
        ? (team ? `/teams/${team.id}` : "/matches")
        : "/matches";
  const allowedDefaults = new Set(
    auth.role === "ANALYST_USER"
      ? ["/analytics/collapse", "/matches"]
      : auth.role === "TEAM_USER"
        ? ["/matches", ...(team ? [`/teams/${team.id}`] : [])]
        : ["/matches", "/matches/create", "/analytics/collapse"]
  );
  const landing =
    prefDefault && allowedDefaults.has(prefDefault) ? prefDefault : defaultLanding;

  if (sp.auto === "1" || (prefAuto && sp.auto !== "0")) {
    redirect(landing);
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Signed in as</div>
          <div className="mt-1 font-medium">{auth.email}</div>
          <div className="mt-1 text-sm text-zinc-600">Role: {roleLabel}</div>
          <div className="mt-3 text-xs text-zinc-600">
            Quick landing preset:{" "}
            <Link className="underline" href="/dashboard?auto=1">
              jump directly to your default page
            </Link>
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            Persisted auto-redirect:{" "}
            {prefAuto ? "ON" : "OFF"}{" "}
            (<Link className="underline" href={`/api/dashboard/auto-landing?enabled=${prefAuto ? "0" : "1"}`}>{prefAuto ? "disable" : "enable"}</Link>)
            {" "}•{" "}
            <Link className="underline" href="/settings/profile">
              profile settings
            </Link>
            {prefAuto ? (
              <>
                {" "}•{" "}
                <Link className="underline" href="/dashboard?auto=0">
                  stay on dashboard this visit
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Recommended next actions</div>

          {auth.role === "TEAM_USER" ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {team ? (
                <li>
                  <Link className="underline" href={`/teams/${team.id}`}>
                    Open your team workspace
                  </Link>
                </li>
              ) : null}
              <li>
                <Link className="underline" href="/matches">
                  Review fixtures and setup context
                </Link>
              </li>
              <li>
                <Link className="underline" href="/auth/login">
                  Switch account
                </Link>
              </li>
            </ul>
          ) : null}

          {auth.role === "ANALYST_USER" ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <Link className="underline" href="/analytics/collapse">
                  Open collapse analytics view
                </Link>
              </li>
              <li>
                <Link className="underline" href="/matches">
                  Browse matches across teams
                </Link>
              </li>
              <li>
                <Link className="underline" href="/auth/login">
                  Switch account
                </Link>
              </li>
            </ul>
          ) : null}

          {auth.role === "LEAGUE_ADMIN" ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <Link className="underline" href="/matches/create">
                  Create a new match record
                </Link>
              </li>
              <li>
                <Link className="underline" href="/matches">
                  Manage match operations
                </Link>
              </li>
              {team ? (
                <li>
                  <Link className="underline" href={`/teams/${team.id}`}>
                    Open admin tenant team page
                  </Link>
                </li>
              ) : null}
              <li>
                <Link className="underline" href="/analytics/collapse">
                  Review league analytics
                </Link>
              </li>
              <li>
                <Link className="underline" href="/auth/login">
                  Switch account
                </Link>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}


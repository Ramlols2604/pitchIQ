import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export default async function DashboardPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");
  const supabase = getSupabaseAdmin();

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

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Signed in as</div>
          <div className="mt-1 font-medium">{auth.email}</div>
          <div className="mt-1 text-sm text-zinc-600">Role: {roleLabel}</div>
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


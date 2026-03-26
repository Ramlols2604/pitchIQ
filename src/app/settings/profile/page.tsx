import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export default async function ProfileSettingsPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");
  const cookieStore = await cookies();
  const prefAuto = cookieStore.get("pitchiq_dashboard_auto")?.value === "1";
  const prefDefault = cookieStore.get("pitchiq_dashboard_default")?.value ?? "";
  const supabase = getSupabaseAdmin();
  const teamId =
    auth.tenantId && (auth.role === "TEAM_USER" || auth.role === "LEAGUE_ADMIN")
      ? (
          await supabase
            .from("Team")
            .select("id")
            .eq("tenantId", auth.tenantId)
            .limit(1)
            .maybeSingle<{ id: string }>()
        ).data?.id ?? ""
      : "";
  const teamPath = teamId ? `/teams/${teamId}` : "";
  const options =
    auth.role === "ANALYST_USER"
      ? [
          { value: "", label: "Role default" },
          { value: "/analytics/collapse", label: "Analytics collapse" },
          { value: "/matches", label: "Matches" },
        ]
      : auth.role === "TEAM_USER"
        ? [
            { value: "", label: "Role default" },
            { value: "/matches", label: "Matches" },
            ...(teamPath ? [{ value: teamPath, label: "Team page" }] : []),
          ]
        : [
            { value: "", label: "Role default" },
            { value: "/matches", label: "Matches" },
            { value: "/matches/create", label: "Create match" },
            { value: "/analytics/collapse", label: "Analytics collapse" },
            ...(teamPath ? [{ value: teamPath, label: "Team page" }] : []),
          ];

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Profile</div>
          <div className="mt-1 font-medium">{auth.email}</div>
          <div className="mt-1 text-sm text-zinc-600">Role: {auth.role}</div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Dashboard preference</div>
          <div className="mt-2 text-sm text-zinc-600">
            Auto-redirect from dashboard is currently <span className="font-medium">{prefAuto ? "ON" : "OFF"}</span>.
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <Link
              className="underline"
              href={`/api/dashboard/auto-landing?enabled=${prefAuto ? "0" : "1"}`}
            >
              {prefAuto ? "Disable auto-redirect" : "Enable auto-redirect"}
            </Link>
            <span className="text-zinc-400">|</span>
            <Link className="underline" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <div className="text-sm font-medium">Default landing override</div>
            <div className="mt-1 text-sm text-zinc-600">
              Current override: <span className="font-medium">{prefDefault || "Role default"}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {options.map((o) => (
                <Link
                  key={o.label}
                  className="rounded border border-zinc-300 px-2 py-1"
                  href={`/api/dashboard/default-landing?value=${encodeURIComponent(o.value)}`}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

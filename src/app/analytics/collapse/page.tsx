import { redirect } from "next/navigation";

import { CollapseRunsTable } from "@/components/CollapseRunsTable";
import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type SeasonRow = { id: string; year: number; name: string | null };
type TeamRow = { id: string; displayName: string; shortCode: string };
type RunRow = {
  id: string;
  createdAt: string;
  modelVersion: string;
  collapseRisk: number | null;
  collapseFactors: Record<string, unknown> | null;
  featureWeights: Record<string, unknown> | null;
  match: { id: string; dateTime: string; teamA: TeamRow | null; teamB: TeamRow | null } | null;
  constraintLog: {
    bowlersInXI?: number;
    keepersInXI?: number;
    topOrderInXI?: number;
    allRoundersInXI?: number;
    opponentBowlingDepth?: number;
    opponentTopOrderDepth?: number;
  } | null;
};

export default async function CollapseAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string; teamId?: string }>;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");
  if (auth.role === "TEAM_USER") redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  const { data: seasonsData } = await supabase
    .from("Season")
    .select("id,year,name")
    .order("year", { ascending: false })
    .returns<SeasonRow[]>();
  const seasons = seasonsData ?? [];

  const { data: teamsData } = await supabase
    .from("Team")
    .select("id,displayName,shortCode")
    .order("displayName", { ascending: true })
    .returns<TeamRow[]>();
  const teams = teamsData ?? [];

  const sp = await searchParams;
  const seasonId = seasons.find((s) => s.id === sp.seasonId)?.id ?? seasons[0]?.id ?? "";
  const teamId = teams.find((t) => t.id === sp.teamId)?.id ?? "";

  let runs: RunRow[] = [];
  if (seasonId) {
    const matchIdsQuery = supabase.from("Match").select("id").eq("seasonId", seasonId);
    if (teamId) matchIdsQuery.or(`teamAId.eq.${teamId},teamBId.eq.${teamId}`);
    const { data: matchIdsData } = await matchIdsQuery.returns<{ id: string }[]>();
    const matchIds = (matchIdsData ?? []).map((m) => m.id);

    if (matchIds.length) {
      const { data: runData } = await supabase
        .from("ModelRun")
        .select(
          "id,createdAt,modelVersion,collapseRisk,collapseFactors,featureWeights,constraintLog,match:Match!ModelRun_matchId_fkey(id,dateTime,teamA:Team!Match_teamAId_fkey(id,displayName,shortCode),teamB:Team!Match_teamBId_fkey(id,displayName,shortCode))"
        )
        .in("matchId", matchIds)
        .order("createdAt", { ascending: false })
        .limit(50)
        .returns<RunRow[]>();
      runs = runData ?? [];
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Collapse analytics</div>
          <div className="mt-1 text-sm text-zinc-600">League/analyst view from latest model runs.</div>
          <form className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <div className="text-xs text-zinc-600">Season</div>
              <select
                name="seasonId"
                defaultValue={seasonId}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? `IPL ${s.year}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="text-xs text-zinc-600">Team (optional)</div>
              <select
                name="teamId"
                defaultValue={teamId}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.displayName} ({t.shortCode})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className="rounded-lg bg-black px-3 py-2 text-sm text-white" type="submit">
                Apply filters
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Latest runs</div>
          <div className="mt-3">
            <CollapseRunsTable runs={runs} />
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type TeamRow = { id: string };
type SeasonRow = { id: string; name: string };
type MatchRow = {
  id: string;
  dateTime: string;
  venue: { name: string } | null;
  teamA: { shortCode: string } | null;
  teamB: { shortCode: string } | null;
};

export default async function MatchesPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");

  const supabase = getSupabaseAdmin();
  const { data: team } =
    auth.tenantId && auth.role !== "ANALYST_USER"
      ? await supabase
          .from("Team")
          .select("id")
          .eq("tenantId", auth.tenantId)
          .limit(1)
          .maybeSingle<TeamRow>()
      : { data: null as TeamRow | null };
  const { data: season } = await supabase
    .from("Season")
    .select("id,name")
    .eq("isActive", true)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle<SeasonRow>();

  if (!season || (auth.role !== "LEAGUE_ADMIN" && !team)) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto w-full max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">No team/season configured yet.</div>
        </div>
      </div>
    );
  }

  const query = supabase
    .from("Match")
    .select(
      "id,dateTime,teamAId,teamBId,venue:Venue!Match_venueId_fkey(name),teamA:Team!Match_teamAId_fkey(shortCode),teamB:Team!Match_teamBId_fkey(shortCode)"
    )
    .eq("seasonId", season.id)
    .order("dateTime", { ascending: true });
  if (auth.role !== "LEAGUE_ADMIN" && team) {
    query.or(`teamAId.eq.${team.id},teamBId.eq.${team.id}`);
  }
  const { data: matchesData } = await query.returns<MatchRow[]>();
  const matches = matchesData ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Season</div>
          <div className="mt-1 font-medium">{season.name}</div>
          {auth.role === "LEAGUE_ADMIN" ? (
            <div className="mt-3">
              <Link className="text-sm underline" href="/matches/create">
                Create match
              </Link>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Matches</div>
          <ul className="mt-3 space-y-2 text-sm">
            {matches.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">
                    {m.teamA?.shortCode ?? "?"} vs {m.teamB?.shortCode ?? "?"}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {new Date(m.dateTime).toLocaleString()} • {m.venue?.name ?? "Unknown venue"}
                  </div>
                </div>
                <Link className="shrink-0 underline" href={`/matches/${m.id}/setup`}>
                  Setup
                </Link>
              </li>
            ))}
            {!matches.length ? (
              <li className="text-sm text-zinc-600">No matches yet.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}


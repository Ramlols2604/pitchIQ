import { notFound, redirect } from "next/navigation";

import { SeasonSwitcher } from "@/components/SeasonSwitcher";
import { SquadTable } from "@/components/SquadTable";
import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type TeamRow = { id: string; displayName: string; shortCode: string; tenantId: string | null };
type SeasonRow = { id: string; year: number; name: string | null };
type SquadMembershipRow = { playerId: string; notes: string | null; player: PlayerRow | null };
type PlayerRow = {
  name: string;
  primaryRole: string;
  battingStyle: string;
  bowlingStyle: string;
  nationality: string;
  isOverseas: boolean;
};
type AvailabilityRow = {
  playerId: string;
  status: string;
  injuryNote: string | null;
  workloadFlag: string | null;
};

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");
  const supabase = getSupabaseAdmin();

  const { teamId } = await params;
  const { data: team } = await supabase
    .from("Team")
    .select("id,displayName,shortCode,tenantId")
    .eq("id", teamId)
    .maybeSingle<TeamRow>();
  if (!team) notFound();

  if (auth.role === "TEAM_USER" && auth.tenantId !== team.tenantId) notFound();

  const { data: seasonsData } = await supabase
    .from("Season")
    .select("id,year,name")
    .order("year", { ascending: false })
    .returns<SeasonRow[]>();
  const seasons = seasonsData ?? [];

  const sp = await searchParams;
  const seasonId =
    (sp.seasonId && seasons.some((s) => s.id === sp.seasonId) && sp.seasonId) ||
    seasons[0]?.id ||
    null;

  const { data: squadData } =
    seasonId
      ? await supabase
          .from("SquadMembership")
          .select(
            "playerId,notes,player:Player!SquadMembership_playerId_fkey(name,primaryRole,battingStyle,bowlingStyle,nationality,isOverseas)"
          )
          .eq("seasonId", seasonId)
          .eq("teamId", teamId)
          .order("playerId", { ascending: true })
          .returns<SquadMembershipRow[]>()
      : { data: [] as SquadMembershipRow[] };
  const squad = squadData ?? [];

  const { data: availData } =
    seasonId
      ? await supabase
          .from("PlayerAvailability")
          .select("playerId,status,injuryNote,workloadFlag")
          .eq("seasonId", seasonId)
          .eq("teamId", teamId)
          .returns<AvailabilityRow[]>()
      : { data: [] as AvailabilityRow[] };
  const avail = availData ?? [];
  const availByPlayer = new Map(avail.map((a) => [a.playerId, a]));

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold">{team.displayName}</h1>
            <div className="mt-1 text-sm text-zinc-600">{team.shortCode}</div>
          </div>
          <SeasonSwitcher
            seasons={seasons.map((s) => ({ id: s.id, label: s.name ?? `IPL ${s.year}` }))}
          />
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Squad</div>
          <div className="mt-4">
            <SquadTable
              canEdit={auth.role === "TEAM_USER" && auth.tenantId === team.tenantId}
              teamId={teamId}
              seasonId={seasonId}
              rows={squad.map((m) => {
                const a = availByPlayer.get(m.playerId);
                const p = m.player;
                return {
                  playerId: m.playerId,
                  name: p?.name ?? "Unknown",
                  primaryRole: p?.primaryRole ?? "-",
                  battingStyle: p?.battingStyle ?? "-",
                  bowlingStyle: p?.bowlingStyle ?? "-",
                  nationality: p?.nationality ?? "-",
                  isOverseas: p?.isOverseas ?? false,
                  availability: a?.status ?? "AVAILABLE",
                  injuryNote: a?.injuryNote ?? null,
                  workloadFlag: a?.workloadFlag ?? null,
                  notes: m.notes ?? null,
                };
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


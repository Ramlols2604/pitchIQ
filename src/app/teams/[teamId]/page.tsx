import { notFound, redirect } from "next/navigation";

import { db } from "@/db";
import { SeasonSwitcher } from "@/components/SeasonSwitcher";
import { SquadTable } from "@/components/SquadTable";
import { getAuth } from "@/lib/auth";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ seasonId?: string }>;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");

  const { teamId } = await params;
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) notFound();

  if (auth.role === "TEAM_USER" && auth.tenantId !== team.tenantId) notFound();

  const seasons = await db.season.findMany({
    orderBy: { year: "desc" },
    select: { id: true, year: true, name: true },
  });
  const sp = await searchParams;
  const seasonId =
    (sp.seasonId && seasons.some((s) => s.id === sp.seasonId) && sp.seasonId) ||
    seasons[0]?.id ||
    null;

  const squad = seasonId
    ? await db.squadMembership.findMany({
        where: { seasonId, teamId },
        include: { player: true },
        orderBy: { player: { name: "asc" } },
      })
    : [];

  const avail = seasonId
    ? await db.playerAvailability.findMany({
        where: { seasonId, teamId },
        select: { playerId: true, status: true, injuryNote: true, workloadFlag: true },
      })
    : [];
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
                return {
                  playerId: m.playerId,
                  name: m.player.name,
                  primaryRole: m.player.primaryRole,
                  battingStyle: m.player.battingStyle,
                  bowlingStyle: m.player.bowlingStyle,
                  nationality: m.player.nationality,
                  isOverseas: m.player.isOverseas,
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


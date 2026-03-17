import { notFound, redirect } from "next/navigation";

import { db } from "@/db";
import { SeasonSwitcher } from "@/components/SeasonSwitcher";
import { getAuth } from "@/lib/auth";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
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
          <div className="text-sm font-medium">Squad (placeholder)</div>
          <div className="mt-2 text-sm text-zinc-600">
            Next: season-scoped squad table + player panel.
          </div>
        </div>
      </div>
    </div>
  );
}


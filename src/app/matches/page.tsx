import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { getAuth } from "@/lib/auth";

export default async function MatchesPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");

  if (!auth.tenantId) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto w-full max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">No tenant assigned.</div>
        </div>
      </div>
    );
  }

  const team = await db.team.findFirst({ where: { tenantId: auth.tenantId } });
  const season = await db.season.findFirst({ where: { isActive: true }, orderBy: { year: "desc" } });

  if (!team || !season) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto w-full max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">No team/season configured yet.</div>
        </div>
      </div>
    );
  }

  const matches = await db.match.findMany({
    where: { seasonId: season.id, OR: [{ teamAId: team.id }, { teamBId: team.id }] },
    orderBy: { dateTime: "asc" },
    select: {
      id: true,
      dateTime: true,
      venue: { select: { name: true } },
      teamA: { select: { shortCode: true } },
      teamB: { select: { shortCode: true } },
    },
  });

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Season</div>
          <div className="mt-1 font-medium">{season.name}</div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Matches</div>
          <ul className="mt-3 space-y-2 text-sm">
            {matches.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium">
                    {m.teamA.shortCode} vs {m.teamB.shortCode}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {new Date(m.dateTime).toLocaleString()} • {m.venue.name}
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


import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { getAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");

  const team =
    auth.tenantId && (auth.role === "TEAM_USER" || auth.role === "LEAGUE_ADMIN")
      ? await db.team.findFirst({ where: { tenantId: auth.tenantId } })
      : null;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Signed in as</div>
          <div className="mt-1 font-medium">{auth.email}</div>
          <div className="mt-1 text-sm text-zinc-600">Role: {auth.role}</div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Next pages</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {team ? (
              <li>
                <Link className="underline" href={`/teams/${team.id}`}>
                  Team page
                </Link>
              </li>
            ) : null}
            <li>
              <Link className="underline" href="/auth/login">
                Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}


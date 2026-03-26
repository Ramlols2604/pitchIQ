import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";

export default async function ProfileSettingsPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");
  const cookieStore = await cookies();
  const prefAuto = cookieStore.get("pitchiq_dashboard_auto")?.value === "1";

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
        </div>
      </div>
    </div>
  );
}

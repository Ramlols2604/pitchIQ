import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");

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


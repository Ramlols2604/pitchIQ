import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";

export default async function Home() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">PitchIQ</h1>
        <p className="mt-1 text-sm text-zinc-600">Logged in. Next: role-based dashboard.</p>
      </div>
    </div>
  );
}

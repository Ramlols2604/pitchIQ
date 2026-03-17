"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLink(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; link: string }
        | { error: string }
        | null;
      if (!res.ok) throw new Error(data && "error" in data ? data.error : "Request failed");
      if (!data || !("link" in data)) throw new Error("Request failed");
      setLink(data.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-600">Enter your email to get a magic link.</p>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400"
            type="email"
            placeholder="you@team.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            className="w-full rounded-lg bg-black px-3 py-2 text-white disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {link ? (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-sm font-medium">Dev link</div>
            <a className="mt-1 block break-all text-sm underline" href={link}>
              {link}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}


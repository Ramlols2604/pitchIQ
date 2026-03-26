"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  seasonYear: string;
  dateTime: string;
  teamAShortCode: string;
  teamBShortCode: string;
  venueName: string;
  venueCity: string;
  matchNumber: string;
};

export default function CreateMatchPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({
    seasonYear: "2026",
    dateTime: "",
    teamAShortCode: "",
    teamBShortCode: "",
    venueName: "",
    venueCity: "",
    matchNumber: "",
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seasonYear: Number(state.seasonYear),
          dateTime: state.dateTime,
          teamAShortCode: state.teamAShortCode.trim().toUpperCase(),
          teamBShortCode: state.teamBShortCode.trim().toUpperCase(),
          venue: {
            name: state.venueName.trim(),
            city: state.venueCity.trim(),
          },
          matchNumber: state.matchNumber.trim() ? Number(state.matchNumber) : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; matchId?: string } | null;
      if (!res.ok || !data?.matchId) {
        throw new Error(data?.error || "Failed to create match");
      }
      router.push(`/matches/${data.matchId}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Create match</div>
          <div className="mt-1 text-sm text-zinc-600">League admin operation.</div>
        </div>

        <form className="rounded-xl bg-white p-6 shadow-sm" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <div className="text-xs text-zinc-600">Season year</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.seasonYear}
                onChange={(e) => setState((s) => ({ ...s, seasonYear: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Date time (ISO)</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                placeholder="2026-03-17T19:30:00+05:30"
                value={state.dateTime}
                onChange={(e) => setState((s) => ({ ...s, dateTime: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Team A short code</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.teamAShortCode}
                onChange={(e) => setState((s) => ({ ...s, teamAShortCode: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Team B short code</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.teamBShortCode}
                onChange={(e) => setState((s) => ({ ...s, teamBShortCode: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Venue name</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.venueName}
                onChange={(e) => setState((s) => ({ ...s, venueName: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Venue city</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.venueCity}
                onChange={(e) => setState((s) => ({ ...s, venueCity: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Match number (optional)</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.matchNumber}
                onChange={(e) => setState((s) => ({ ...s, matchNumber: e.target.value }))}
              />
            </label>
          </div>

          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

          <button
            className="mt-4 rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create and open setup"}
          </button>
        </form>
      </div>
    </div>
  );
}

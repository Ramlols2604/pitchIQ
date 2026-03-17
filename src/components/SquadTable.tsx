"use client";

import { useMemo, useState } from "react";

export type SquadRow = {
  playerId: string;
  name: string;
  primaryRole: string;
  battingStyle: string;
  bowlingStyle: string;
  nationality: string;
  isOverseas: boolean;
  availability: string;
  injuryNote: string | null;
  workloadFlag: string | null;
  notes: string | null;
};

const AVAILABILITY_OPTIONS = [
  "AVAILABLE",
  "DOUBTFUL",
  "INJURED",
  "RESTED",
  "SUSPENDED",
  "UNAVAILABLE",
] as const;

export function SquadTable({
  rows,
  canEdit,
  teamId,
  seasonId,
}: {
  rows: SquadRow[];
  canEdit: boolean;
  teamId: string;
  seasonId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selected = useMemo(
    () => rows.find((r) => r.playerId === selectedId) ?? null,
    [rows, selectedId]
  );

  const [draftStatus, setDraftStatus] = useState<string>("");
  const [draftInjury, setDraftInjury] = useState<string>("");
  const [draftNotes, setDraftNotes] = useState<string>("");

  function onSelect(id: string) {
    setSelectedId(id);
    const r = rows.find((x) => x.playerId === id);
    if (!r) return;
    setDraftStatus(r.availability);
    setDraftInjury(r.injuryNote ?? "");
    setDraftNotes(r.notes ?? "");
  }

  async function saveAvailability(playerId: string) {
    if (!seasonId) return;
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamId}/players/${playerId}/availability`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seasonId,
          status: draftStatus,
          injuryNote: draftInjury || null,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes(playerId: string) {
    if (!seasonId) return;
    setSaving(true);
    try {
      await fetch(`/api/teams/${teamId}/players/${playerId}/notes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seasonId, notes: draftNotes || null }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Bat</th>
              <th className="px-3 py-2">Bowl</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.playerId}
                className="cursor-pointer border-t hover:bg-zinc-50"
                onClick={() => onSelect(r.playerId)}
              >
                <td className="px-3 py-2">{r.primaryRole}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-zinc-500">
                    {r.nationality}
                    {r.isOverseas ? " (OS)" : ""}
                  </div>
                </td>
                <td className="px-3 py-2">{r.battingStyle}</td>
                <td className="px-3 py-2">{r.bowlingStyle}</td>
                <td className="px-3 py-2">{r.availability}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-3 py-6 text-sm text-zinc-600" colSpan={5}>
                  No squad members for this season.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        {!selected ? (
          <div className="text-sm text-zinc-600">Select a player to view details.</div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm font-medium">{selected.name}</div>
            <div className="text-xs text-zinc-600">{selected.primaryRole}</div>
            <div className="text-xs text-zinc-600">
              Bat: {selected.battingStyle} • Bowl: {selected.bowlingStyle}
            </div>
            <div className="pt-2 text-xs">
              <div className="text-zinc-600">Availability</div>
              {canEdit ? (
                <div className="mt-2 space-y-2">
                  <select
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value)}
                  >
                    {AVAILABILITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
                    placeholder="Injury note (optional)"
                    value={draftInjury}
                    onChange={(e) => setDraftInjury(e.target.value)}
                  />
                  <button
                    className="w-full rounded-md bg-black px-2 py-1 text-xs text-white disabled:opacity-60"
                    disabled={saving || !seasonId}
                    onClick={() => saveAvailability(selected.playerId)}
                    type="button"
                  >
                    Save availability
                  </button>
                </div>
              ) : (
                <div className="font-medium">{selected.availability}</div>
              )}
              {selected.workloadFlag ? (
                <div className="mt-1 text-zinc-600">Workload: {selected.workloadFlag}</div>
              ) : null}
            </div>

            <div className="pt-2 text-xs">
              <div className="text-zinc-600">Private notes</div>
              {canEdit ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
                    rows={4}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                  />
                  <button
                    className="w-full rounded-md bg-black px-2 py-1 text-xs text-white disabled:opacity-60"
                    disabled={saving || !seasonId}
                    onClick={() => saveNotes(selected.playerId)}
                    type="button"
                  >
                    Save notes
                  </button>
                </div>
              ) : (
                <div className="mt-1 text-zinc-700">{selected.notes || "-"}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


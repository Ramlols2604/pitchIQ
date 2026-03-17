"use client";

import { useEffect, useMemo, useState } from "react";

export type SeasonOption = { id: string; label: string };

const STORAGE_KEY = "pitchiq_season";

export function SeasonSwitcher({ seasons }: { seasons: SeasonOption[] }) {
  const fallback = useMemo(() => seasons[0]?.id ?? null, [seasons]);
  const [seasonId, setSeasonId] = useState<string | null>(() => {
    if (typeof window === "undefined") return fallback;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const exists = saved && seasons.some((s) => s.id === saved);
    return exists ? saved : fallback;
  });

  useEffect(() => {
    if (seasonId) window.localStorage.setItem(STORAGE_KEY, seasonId);
  }, [seasonId]);

  if (!seasons.length) return null;

  return (
    <select
      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm"
      value={seasonId ?? ""}
      onChange={(e) => setSeasonId(e.target.value)}
    >
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}


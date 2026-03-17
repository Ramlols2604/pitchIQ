"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type ContextState = {
  pitchType: string;
  pitchCondition: string;
  weatherCondition: string;
  dewLikelihood: string;
  boundaryOverride: string;
  pressureTag: string;
  homeAdvantage: boolean;
  notes: string;
  tossDecision: string;
  tossWinner: string;
};

const PITCH_TYPES = ["FLAT", "SPIN_FRIENDLY", "PACE_FRIENDLY", "WET", "DRY"];
const PITCH_CONDITIONS = ["FRESH", "USED", "WORN"];
const WEATHER = ["CLEAR", "OVERCAST", "HUMID", "HOT", "DRY_HEAT"];
const DEW = ["NONE", "LOW", "MODERATE", "HIGH"];
const PRESSURE = ["NORMAL", "MUST_WIN", "KNOCKOUT", "DEAD_RUBBER"];
const TOSS_DECISION = ["", "BAT", "FIELD"];

export default function MatchSetupPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ContextState>({
    pitchType: "FLAT",
    pitchCondition: "FRESH",
    weatherCondition: "CLEAR",
    dewLikelihood: "LOW",
    boundaryOverride: "",
    pressureTag: "NORMAL",
    homeAdvantage: false,
    notes: "",
    tossDecision: "",
    tossWinner: "",
  });

  const payload = useMemo(() => {
    const boundary = state.boundaryOverride.trim();
    return {
      pitchType: state.pitchType,
      pitchCondition: state.pitchCondition,
      weatherCondition: state.weatherCondition,
      dewLikelihood: state.dewLikelihood,
      boundaryOverride: boundary ? Number(boundary) : null,
      pressureTag: state.pressureTag,
      homeAdvantage: state.homeAdvantage,
      notes: state.notes || null,
      tossDecision: state.tossDecision || null,
      tossWinnerId: state.tossWinner || null,
    };
  }, [state]);

  useEffect(() => {
    // Minimal MVP: no prefetch of existing context yet.
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/context`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Save failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Match setup</div>
          <div className="mt-1 text-sm text-zinc-600">Context inputs for predictions.</div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <div className="text-xs text-zinc-600">Pitch type</div>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.pitchType}
                onChange={(e) => setState((s) => ({ ...s, pitchType: e.target.value }))}
              >
                {PITCH_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Pitch condition</div>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.pitchCondition}
                onChange={(e) => setState((s) => ({ ...s, pitchCondition: e.target.value }))}
              >
                {PITCH_CONDITIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Weather</div>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.weatherCondition}
                onChange={(e) => setState((s) => ({ ...s, weatherCondition: e.target.value }))}
              >
                {WEATHER.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Dew</div>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.dewLikelihood}
                onChange={(e) => setState((s) => ({ ...s, dewLikelihood: e.target.value }))}
              >
                {DEW.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Boundary override (m)</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                inputMode="numeric"
                value={state.boundaryOverride}
                onChange={(e) => setState((s) => ({ ...s, boundaryOverride: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Pressure</div>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.pressureTag}
                onChange={(e) => setState((s) => ({ ...s, pressureTag: e.target.value }))}
              >
                {PRESSURE.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Toss decision</div>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.tossDecision}
                onChange={(e) => setState((s) => ({ ...s, tossDecision: e.target.value }))}
              >
                {TOSS_DECISION.map((v) => (
                  <option key={v} value={v}>
                    {v || "TBD"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="text-xs text-zinc-600">Toss winner teamId (optional)</div>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                value={state.tossWinner}
                onChange={(e) => setState((s) => ({ ...s, tossWinner: e.target.value }))}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.homeAdvantage}
                onChange={(e) => setState((s) => ({ ...s, homeAdvantage: e.target.checked }))}
              />
              Home advantage
            </label>

            <label className="text-sm md:col-span-2">
              <div className="text-xs text-zinc-600">Notes</div>
              <textarea
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                rows={4}
                value={state.notes}
                onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
              />
            </label>
          </div>

          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

          <button
            className="mt-4 rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-60"
            onClick={onSave}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving..." : "Save context"}
          </button>
        </div>
      </div>
    </div>
  );
}


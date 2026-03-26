"use client";

import { useMemo, useState } from "react";

type RunRow = {
  id: string;
  createdAt: string;
  modelVersion: string;
  collapseRisk: number | null;
  collapseFactors: Record<string, unknown> | null;
  featureWeights: Record<string, unknown> | null;
  match: {
    id: string;
    dateTime: string;
    teamA: { id: string; displayName: string; shortCode: string } | null;
    teamB: { id: string; displayName: string; shortCode: string } | null;
  } | null;
  constraintLog: {
    bowlersInXI?: number;
    keepersInXI?: number;
    topOrderInXI?: number;
    allRoundersInXI?: number;
    opponentBowlingDepth?: number;
    opponentTopOrderDepth?: number;
  } | null;
};

function deriveFallbackRisk(run: RunRow) {
  const bowlers = run.constraintLog?.bowlersInXI ?? 0;
  const keepers = run.constraintLog?.keepersInXI ?? 0;
  const raw = 0.45 - Math.min(0.15, bowlers * 0.03) - Math.min(0.05, keepers * 0.05);
  return Math.max(0.1, Math.min(0.8, raw));
}

function renderKeyValues(v: Record<string, unknown> | null, max = 4) {
  if (!v) return "-";
  const pairs = Object.entries(v).slice(0, max);
  if (!pairs.length) return "-";
  return pairs.map(([k, val]) => `${k}:${String(val)}`).join(" | ");
}

export function CollapseRunsTable({ runs }: { runs: RunRow[] }) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const trend = useMemo(() => runs.slice(0, 12).reverse(), [runs]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 p-3">
        <div className="text-xs font-medium text-zinc-700">Risk trend (latest 12 runs)</div>
        <div className="mt-2 flex items-end gap-1">
          {trend.length ? (
            trend.map((r) => {
              const risk = r.collapseRisk ?? deriveFallbackRisk(r);
              const h = Math.max(8, Math.round(risk * 100));
              return (
                <div key={r.id} className="flex flex-col items-center gap-1">
                  <div className="w-5 rounded-sm bg-zinc-900/75" style={{ height: `${h}px` }} />
                  <div className="text-[10px] text-zinc-500">{Math.round(risk * 100)}</div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-zinc-500">No trend data.</div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-zinc-600">
            <tr>
              <th className="py-2 pr-4">Match</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Model</th>
              <th className="py-2 pr-4">Collapse risk</th>
              <th className="py-2 pr-4">Role mix</th>
              <th className="py-2 pr-4">Matchup</th>
              <th className="py-2 pr-4">Top factors</th>
              <th className="py-2 pr-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const risk = r.collapseRisk ?? deriveFallbackRisk(r);
              const open = !!openIds[r.id];
              return (
                <>
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="py-2 pr-4">
                      {(r.match?.teamA?.shortCode ?? "TBD")} vs {(r.match?.teamB?.shortCode ?? "TBD")}
                    </td>
                    <td className="py-2 pr-4">
                      {r.match?.dateTime ? new Date(r.match.dateTime).toLocaleString() : "-"}
                    </td>
                    <td className="py-2 pr-4">{r.modelVersion || "-"}</td>
                    <td className="py-2 pr-4">{Math.round(risk * 100)}%</td>
                    <td className="py-2 pr-4">
                      B:{r.constraintLog?.bowlersInXI ?? 0} AR:{r.constraintLog?.allRoundersInXI ?? 0} T:
                      {r.constraintLog?.topOrderInXI ?? 0}
                    </td>
                    <td className="py-2 pr-4">
                      OppB:{r.constraintLog?.opponentBowlingDepth ?? 0} OppT:
                      {r.constraintLog?.opponentTopOrderDepth ?? 0}
                    </td>
                    <td className="py-2 pr-4">
                      {r.collapseRisk == null
                        ? renderKeyValues(r.featureWeights)
                        : renderKeyValues(r.collapseFactors)}
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        className="underline"
                        type="button"
                        onClick={() => setOpenIds((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                      >
                        {open ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-t border-zinc-100 bg-zinc-50">
                      <td className="py-2 pr-4 text-xs text-zinc-700" colSpan={8}>
                        <div className="font-medium">Extended factors</div>
                        <div className="mt-1">
                          {r.collapseRisk == null
                            ? renderKeyValues(r.featureWeights, 12)
                            : renderKeyValues(r.collapseFactors, 12)}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
            {!runs.length ? (
              <tr>
                <td className="py-3 text-zinc-500" colSpan={8}>
                  No model runs found for selected filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

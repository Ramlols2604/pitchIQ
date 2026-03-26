import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type RunRow = {
  id: string;
  matchId: string;
  createdAt: string;
  modelVersion: string;
  collapseFactors: {
    source?: string;
    rawRisk?: number;
    calibratedRisk?: number;
    calibrationBlend?: number | string;
    baselineSamples?: number;
  } | null;
  match: {
    teamA: { shortCode: string } | null;
    teamB: { shortCode: string } | null;
  } | null;
};
type OutcomeRow = { matchId: string; collapseOccurred: boolean };

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export default async function CalibrationDiagnosticsPage() {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");
  if (auth.role === "TEAM_USER") redirect("/dashboard");

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("ModelRun")
    .select(
      "id,matchId,createdAt,modelVersion,collapseFactors,match:Match!ModelRun_matchId_fkey(teamA:Team!Match_teamAId_fkey(shortCode),teamB:Team!Match_teamBId_fkey(shortCode))"
    )
    .order("createdAt", { ascending: false })
    .limit(200)
    .returns<RunRow[]>();
  const matchIds = Array.from(new Set((data ?? []).map((r) => r.matchId)));
  const { data: outcomes } = matchIds.length
    ? await supabase
        .from("MatchOutcome")
        .select("matchId,collapseOccurred")
        .in("matchId", matchIds)
        .returns<OutcomeRow[]>()
    : { data: [] as OutcomeRow[] };
  const outcomeMap = new Map((outcomes ?? []).map((o) => [o.matchId, o.collapseOccurred]));

  const runs = (data ?? []).filter((r) => r.collapseFactors?.source === "rules_backtest_calibrated");
  const rows = runs.map((r) => {
    const raw = asNumber(r.collapseFactors?.rawRisk);
    const calibrated = asNumber(r.collapseFactors?.calibratedRisk);
    const delta = raw != null && calibrated != null ? calibrated - raw : null;
    return { ...r, raw, calibrated, delta };
  });

  const validDeltas = rows.map((r) => r.delta).filter((d): d is number => d != null);
  const avgAbsDelta = validDeltas.length
    ? validDeltas.reduce((acc, d) => acc + Math.abs(d), 0) / validDeltas.length
    : 0;
  const avgSignedDelta = validDeltas.length
    ? validDeltas.reduce((acc, d) => acc + d, 0) / validDeltas.length
    : 0;
  const labeled = rows.filter((r) => outcomeMap.has(r.matchId) && r.calibrated != null);
  const brierScore = labeled.length
    ? labeled.reduce((acc, r) => {
        const y = outcomeMap.get(r.matchId) ? 1 : 0;
        const p = r.calibrated ?? 0;
        return acc + (p - y) ** 2;
      }, 0) / labeled.length
    : 0;
  const thresholdAccuracy = labeled.length
    ? labeled.reduce((acc, r) => {
        const pred = (r.calibrated ?? 0) >= 0.5;
        const actual = outcomeMap.get(r.matchId) === true;
        return acc + (pred === actual ? 1 : 0);
      }, 0) / labeled.length
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Calibration diagnostics</div>
          <div className="mt-1 text-sm text-zinc-600">
            Evaluates raw-to-calibrated adjustments produced by rules calibration.
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-5 text-sm">
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-zinc-500">Samples</div>
              <div className="mt-1 font-medium">{rows.length}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-zinc-500">Avg abs adjustment</div>
              <div className="mt-1 font-medium">{(avgAbsDelta * 100).toFixed(2)} pp</div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-zinc-500">Avg signed adjustment</div>
              <div className="mt-1 font-medium">{(avgSignedDelta * 100).toFixed(2)} pp</div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-zinc-500">Labeled outcomes</div>
              <div className="mt-1 font-medium">{labeled.length}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="text-zinc-500">Brier score</div>
              <div className="mt-1 font-medium">{labeled.length ? brierScore.toFixed(4) : "-"}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-600">
            Threshold accuracy (50% cutoff): {labeled.length ? `${(thresholdAccuracy * 100).toFixed(2)}%` : "-"}.
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Recent calibration runs</div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-600">
                <tr>
                  <th className="py-2 pr-4">Match</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Raw</th>
                  <th className="py-2 pr-4">Calibrated</th>
                  <th className="py-2 pr-4">Actual</th>
                  <th className="py-2 pr-4">Delta</th>
                  <th className="py-2 pr-4">Blend</th>
                  <th className="py-2 pr-4">Baseline N</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="py-2 pr-4">
                      {r.match?.teamA?.shortCode ?? "?"} vs {r.match?.teamB?.shortCode ?? "?"}
                    </td>
                    <td className="py-2 pr-4">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{r.modelVersion}</td>
                    <td className="py-2 pr-4">{r.raw != null ? `${Math.round(r.raw * 100)}%` : "-"}</td>
                    <td className="py-2 pr-4">
                      {r.calibrated != null ? `${Math.round(r.calibrated * 100)}%` : "-"}
                    </td>
                    <td className="py-2 pr-4">
                      {outcomeMap.has(r.matchId) ? (outcomeMap.get(r.matchId) ? "Collapse" : "No collapse") : "-"}
                    </td>
                    <td className="py-2 pr-4">
                      {r.delta != null ? `${(r.delta * 100).toFixed(2)} pp` : "-"}
                    </td>
                    <td className="py-2 pr-4">{String(r.collapseFactors?.calibrationBlend ?? "-")}</td>
                    <td className="py-2 pr-4">{String(r.collapseFactors?.baselineSamples ?? "-")}</td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td className="py-3 text-zinc-500" colSpan={9}>
                      No calibration diagnostics available yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

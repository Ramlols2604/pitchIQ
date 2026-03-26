import { notFound, redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type ModelRunRow = {
  id: string;
  predictedXI: { playerId: string; score?: number; explanations?: string[] }[];
  bench: { playerId: string; score?: number; explanations?: string[] }[];
  modelVersion: string;
  createdAt: string;
};

type PlayerRow = { id: string; name: string };

export default async function PredictedXIPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const auth = await getAuth();
  if (!auth) redirect("/auth/login");

  const { matchId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: latestRun } = await supabase
    .from("ModelRun")
    .select("id,predictedXI,bench,modelVersion,createdAt")
    .eq("matchId", matchId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle<ModelRunRow>();

  if (!latestRun) notFound();

  const ids = Array.from(
    new Set([
      ...(latestRun.predictedXI ?? []).map((p) => p.playerId),
      ...(latestRun.bench ?? []).map((p) => p.playerId),
    ])
  );

  const { data: playersData } = await supabase
    .from("Player")
    .select("id,name")
    .in("id", ids)
    .returns<PlayerRow[]>();
  const players = playersData ?? [];
  const byId = new Map(players.map((p) => [p.id, p.name]));

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-600">Model run</div>
          <div className="mt-1 text-sm">{new Date(latestRun.createdAt).toLocaleString()}</div>
          <div className="mt-1 text-xs text-zinc-500">Version: {latestRun.modelVersion}</div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Predicted XI</div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            {(latestRun.predictedXI ?? []).map((p) => (
              <li key={p.playerId}>
                {byId.get(p.playerId) ?? p.playerId}
                {typeof p.score === "number" ? ` (${p.score})` : ""}
                {p.explanations?.length ? (
                  <div className="text-xs text-zinc-500">{p.explanations.join(" | ")}</div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="text-sm font-medium">Bench</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {(latestRun.bench ?? []).map((p) => (
              <li key={p.playerId}>
                {byId.get(p.playerId) ?? p.playerId}
                {typeof p.score === "number" ? ` (${p.score})` : ""}
                {p.explanations?.length ? (
                  <div className="text-xs text-zinc-500">{p.explanations.join(" | ")}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}


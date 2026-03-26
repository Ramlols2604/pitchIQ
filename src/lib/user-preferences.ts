import { getSupabaseAdmin } from "@/lib/supabase";

type PreferenceRow = {
  key: string;
  value: string | null;
};

export async function getUserPreferences(userId: string, keys: string[]) {
  if (!keys.length) return new Map<string, string>();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("UserPreference")
    .select("key,value")
    .eq("userId", userId)
    .in("key", keys)
    .returns<PreferenceRow[]>();
  if (error) return new Map<string, string>();
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.value != null) map.set(row.key, row.value);
  }
  return map;
}

export async function setUserPreference(userId: string, key: string, value: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("UserPreference")
    .upsert({ userId, key, value }, { onConflict: "userId,key" });
}

import { supabase } from "../lib/supabase";

export async function loadCustomerBedSessions(customerId: string) {
  return await supabase
    .from("bed_sessions")
    .select("*")
    .eq("customer_id", customerId)
    .order("started_at", { ascending: false });
}
export async function loadSessionsToday(startOfToday: string) {
  return await supabase
    .from("bed_sessions")
    .select("id")
    .gte("started_at", startOfToday);
}
export async function finishBedSession(sessionId: string) {
  return await supabase
    .from("bed_sessions")
    .update({ status: "finished" })
    .eq("id", sessionId);
}
export async function startBedSession(
  customerId: string,
  customerName: string,
  bedName: string,
  minutes: number,
  startedAt: string,
  endsAt: string
) {
  return await supabase.from("bed_sessions").insert({
    customer_id: customerId,
    customer_name: customerName,
    bed_name: bedName,
    minutes,
    started_at: startedAt,
    ends_at: endsAt,
    status: "active",
  });
}
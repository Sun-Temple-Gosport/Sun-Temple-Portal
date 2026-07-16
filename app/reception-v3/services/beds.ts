import { supabase } from "../lib/supabase";

export async function loadCustomerBedSessions(customerId: string) {
  return await supabase
    .from("bed_sessions")
    .select("*")
    .eq("customer_id", customerId)
    .order("started_at", { ascending: false });
}
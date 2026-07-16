import { supabase } from "../lib/supabase";

export async function loadCustomerNotes(customerId: string) {
  return await supabase
    .from("customer_notes")
    .select("id, note, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
}

export async function addCustomerNote(customerId: string, note: string) {
  return await supabase.from("customer_notes").insert({
    customer_id: customerId,
    note,
  });
}

export async function deleteCustomerNote(id: string) {
  return await supabase
    .from("customer_notes")
    .delete()
    .eq("id", id);
}
import { supabase } from "../lib/supabase";

export async function loadCustomerNotes(customerId: string) {
  return await supabase
    .from("customer_notes")
    .select("id, note, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
}

export async function addCustomerNote(customerId: string, note: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: {
        message: userError?.message ?? "User is not logged in.",
        details: "",
        hint: "",
        code: "AUTH_REQUIRED",
      },
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    return {
      data: null,
      error:
        profileError ?? {
          message: "Could not determine the current salon.",
          details: "",
          hint: "",
          code: "SALON_NOT_FOUND",
        },
    };
  }

  return await supabase.from("customer_notes").insert({
    salon_id: profile.salon_id,
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
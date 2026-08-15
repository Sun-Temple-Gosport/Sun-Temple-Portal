import { supabase } from "../lib/supabase";

async function getCurrentSalonId() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      salonId: null,
      error: userError ?? new Error("User is not logged in."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    return {
      salonId: null,
      error:
        profileError ??
        new Error("Could not determine the current salon."),
    };
  }

  return {
    salonId: profile.salon_id,
    error: null,
  };
}

export async function loadCustomerNotes(customerId: string) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  return await supabase
    .from("customer_notes")
    .select("id, note, created_at")
    .eq("salon_id", salonId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
}

export async function addCustomerNote(
  customerId: string,
  note: string
) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("customer_id", customerId)
    .eq("salon_id", salonId)
    .maybeSingle();

  if (customerError) {
    return {
      data: null,
      error: customerError,
    };
  }

  if (!customer) {
    return {
      data: null,
      error: new Error(
        "Customer was not found in the current salon."
      ),
    };
  }

  return await supabase.from("customer_notes").insert({
    salon_id: salonId,
    customer_id: customerId,
    note,
  });
}

export async function deleteCustomerNote(id: string) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  return await supabase
    .from("customer_notes")
    .delete()
    .eq("id", id)
    .eq("salon_id", salonId);
}
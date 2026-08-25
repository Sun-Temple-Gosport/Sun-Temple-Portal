import { supabase } from "../lib/supabase";

import type { Sale } from "../types";

export async function recordSale(
  customerId: string,
  customerName: string,
  sale: Sale & {
    is_unlimited?: boolean;
  }
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
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
      error:
        profileError ??
        new Error("Could not determine the current salon."),
    };
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("salon_id")
    .eq("customer_id", customerId)
    .eq("salon_id", profile.salon_id)
    .maybeSingle();

  if (customerError) {
    return { error: customerError };
  }

  if (!customer) {
    return {
      error: new Error(
        "Customer was not found in the current salon."
      ),
    };
  }

  return await supabase.from("reception_sales").insert({
    customer_id: customerId,
    customer_name: customerName,
    minutes: sale.minutes,
    amount: sale.amount,
    payment_method: sale.payment_method || "card",
    salon_id: profile.salon_id,
    is_unlimited: sale.is_unlimited === true,
  });
}

export async function loadCustomerSales(customerId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
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
      data: null,
      error:
        profileError ??
        new Error("Could not determine the current salon."),
    };
  }

  return await supabase
    .from("reception_sales")
    .select(
      "id, minutes, amount, created_at, is_unlimited"
    )
    .eq("salon_id", profile.salon_id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
}
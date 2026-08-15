import { supabase } from "../lib/supabase";
import type { CustomerBalance } from "../types";

async function getCurrentSalonId() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      salonId: null,
      error:
  userError ?? {
    message: "User is not logged in.",
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
      salonId: null,
      error:
  profileError ?? {
    message: "Could not determine the current salon.",
    details: "",
    hint: "",
    code: "SALON_NOT_FOUND",
  },
    };
  }

  return {
    salonId: profile.salon_id,
    error: null,
  };
}

export async function searchCustomers(term: string) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  return await supabase
    .from("customer_balances")
    .select("*")
    .eq("salon_id", salonId)
    .or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
    )
    .order("full_name", { ascending: true });
}

export async function createCustomer(customer: {
  full_name: string;
  phone: string;
  email: string;
}) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  return await supabase
    .from("customers")
    .insert({
      salon_id: salonId,
      full_name: customer.full_name,
      phone: customer.phone || null,
      email: customer.email || null,
    })
    .select("*")
    .single();
}

export async function updateCustomer(
  customerId: string,
  full_name: string,
  phone: string,
  email: string
) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  return await supabase
    .from("customers")
    .update({
      full_name,
      phone,
      email,
    })
    .eq("customer_id", customerId)
    .eq("salon_id", salonId);
}

export async function loadCustomerBalance(
  customerId: string
) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  return await supabase
    .from("customer_balances")
    .select("*")
    .eq("salon_id", salonId)
    .eq("customer_id", customerId)
    .single();
}

export async function loadCustomerBalanceOptional(
  customerId: string
) {
  const { salonId, error } = await getCurrentSalonId();

  if (error || !salonId) {
    return {
      data: null,
      error,
    };
  }

  return await supabase
    .from("customer_balances")
    .select("*")
    .eq("salon_id", salonId)
    .eq("customer_id", customerId)
    .maybeSingle();
}
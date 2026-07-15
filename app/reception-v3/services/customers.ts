import { supabase } from "../lib/supabase";
import type { CustomerBalance } from "../types";

export async function searchCustomers(term: string) {
  return await supabase
    .from("customer_balances")
    .select("*")
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
  return await supabase
    .from("customers")
    .insert({
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
  return await supabase
    .from("customers")
    .update({
      full_name,
      phone,
      email,
    })
    .eq("customer_id", customerId);
}

export async function loadCustomerBalance(customerId: string) {
  return await supabase
    .from("customer_balances")
    .select("*")
    .eq("customer_id", customerId)
    .single();
}

export async function loadCustomerBalanceOptional(customerId: string) {
  return await supabase
    .from("customer_balances")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();
}
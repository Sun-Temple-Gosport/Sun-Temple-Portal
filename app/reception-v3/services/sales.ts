import { supabase } from "../lib/supabase";
import type { Sale } from "../types";

export async function recordSale(
  customerId: string,
  customerName: string,
  sale: Sale
) {
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("salon_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (customerError) {
    return { error: customerError };
  }

  if (!customer?.salon_id) {
    return {
      error: new Error("Customer salon could not be determined."),
    };
  }

  return await supabase.from("reception_sales").insert({
    customer_id: customerId,
    customer_name: customerName,
    minutes: sale.minutes,
    amount: sale.amount,
    payment_method: sale.payment_method || "card",
    salon_id: customer.salon_id,
  });
}
export async function loadCustomerSales(customerId: string) {
  return await supabase
    .from("reception_sales")
    .select("id, minutes, amount, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
}
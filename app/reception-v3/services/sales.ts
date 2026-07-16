import { supabase } from "../lib/supabase";
import type { Sale } from "../types";

export async function recordSale(
  customerId: string,
  customerName: string,
  sale: Sale
) {
    
  return await supabase.from("reception_sales").insert({
    customer_id: customerId,
    customer_name: customerName,
    minutes: sale.minutes,
    amount: sale.amount,
    payment_method: sale.payment_method || "card",
  });
}
export async function loadCustomerSales(customerId: string) {
  return await supabase
    .from("reception_sales")
    .select("id, minutes, amount, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
}
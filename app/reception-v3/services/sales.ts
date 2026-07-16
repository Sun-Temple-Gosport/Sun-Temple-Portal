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
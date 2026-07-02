import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const email = "test@suntemple.local";
  const minutesToAdd = 60;

  const { data: customer, error: findError } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("email", email)
    .single();

  if (findError || !customer) {
    return NextResponse.json({ error: "Test customer not found" }, { status: 404 });
  }

  const newBalance = customer.minutes_balance + minutesToAdd;
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1);

  const { error: updateError } = await supabaseAdmin
    .from("customers")
    .update({
      minutes_balance: newBalance,
      minutes_expiry: expiry.toISOString().split("T")[0],
    })
    .eq("id", customer.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("minute_transactions").insert({
    customer_id: customer.id,
    type: "test_topup",
    minutes: minutesToAdd,
    description: "Test 60 minute top-up",
  });

  return NextResponse.json({ success: true, newBalance });
}
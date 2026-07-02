import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();

  console.log("SUMUP WEBHOOK:", body);

  const checkoutReference = body.checkout_reference;

  if (!checkoutReference) {
    return NextResponse.json(
      { error: "Missing checkout reference" },
      { status: 400 }
    );
  }

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("*")
    .eq("checkout_reference", checkoutReference)
    .single();

  if (!purchase) {
    return NextResponse.json(
      { error: "Purchase not found" },
      { status: 404 }
    );
  }

  if (purchase.payment_status === "paid") {
    return NextResponse.json({ ok: true });
  }

  await supabaseAdmin
    .from("purchases")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("checkout_reference", checkoutReference);

  await supabaseAdmin.from("minute_transactions").insert({
    customer_id: purchase.customer_id,
    minutes: purchase.minutes_added,
    transaction_type: "purchase",
    reason: `SumUp ${checkoutReference}`,
  });

  return NextResponse.json({ success: true });
}
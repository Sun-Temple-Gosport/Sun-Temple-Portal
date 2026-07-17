import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  const { error: purchaseError } = await supabaseAdmin
  .from("purchases")
  .insert({
    customer_id: body.customerId,
    package_id: body.packageId,
    minutes_added: body.minutes,
    amount_paid: body.amount,
    expiry_date: expiry.toISOString().split("T")[0],
    payment_provider: "sumup",
    checkout_reference: body.checkoutReference,
    payment_status: "pending",
  });

if (purchaseError) {
  console.error("Purchase insert failed:", purchaseError);

  return NextResponse.json(
    {
      error: "Could not create purchase record.",
      details: purchaseError.message,
    },
    { status: 500 }
  );
}

  const res = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: body.checkoutReference,
      amount: body.amount,
      currency: "GBP",
      merchant_code: process.env.SUMUP_MERCHANT_CODE,
      description: body.description,

      hosted_checkout: {
        enabled: true,
      },

      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/sumup/webhook`,

      redirect_url:
        `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success` +
        `?checkoutReference=${body.checkoutReference}`,
    }),
  });

  const data = await res.json();

  if (data.id) {
    await supabaseAdmin
      .from("purchases")
      .update({
        sumup_checkout_id: data.id,
      })
      .eq("checkout_reference", body.checkoutReference);
  }

  return NextResponse.json(data);
}
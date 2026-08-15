import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SumUpWebhookBody = {
  event_type?: string;
  id?: string;
};

type SumUpCheckout = {
  id?: string;
  checkout_reference?: string;
  status?: "PENDING" | "FAILED" | "PAID" | "EXPIRED";
  amount?: number;
  currency?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SumUpWebhookBody;
    const checkoutId = body.id;

    if (
      body.event_type !== "CHECKOUT_STATUS_CHANGED" ||
      !checkoutId
    ) {
      return new NextResponse(null, { status: 200 });
    }

    const sumUpResponse = await fetch(
      `https://api.sumup.com/v0.1/checkouts/${checkoutId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
        },
        cache: "no-store",
      }
    );

    if (!sumUpResponse.ok) {
      console.error(
        "Webhook SumUp verification failed:",
        await sumUpResponse.text()
      );

      return NextResponse.json(
        { error: "Unable to verify checkout." },
        { status: 500 }
      );
    }

    const checkout = (await sumUpResponse.json()) as SumUpCheckout;

    if (
      checkout.status !== "PAID" ||
      !checkout.checkout_reference
    ) {
      return new NextResponse(null, { status: 200 });
    }

    const { data: purchase, error: purchaseError } = await supabaseAdmin
  .from("purchases")
  .select("*")
  .eq("checkout_reference", checkout.checkout_reference)
  .eq("sumup_checkout_id", checkout.id)
  .maybeSingle();

    if (purchaseError) {
      console.error("Webhook purchase lookup failed:", purchaseError);

      return NextResponse.json(
        { error: "Unable to load purchase." },
        { status: 500 }
      );
    }

    if (!purchase || purchase.payment_status === "paid") {
      return new NextResponse(null, { status: 200 });
    }

    const paymentMatches =
      checkout.id === purchase.sumup_checkout_id &&
      Number(checkout.amount) === Number(purchase.amount_paid) &&
      checkout.currency === "GBP";

    if (!paymentMatches) {
      console.error("Webhook payment details did not match purchase.");

      return NextResponse.json(
        { error: "Payment details did not match." },
        { status: 400 }
      );
    }

    const { data: existingBatch, error: existingBatchError } =
  await supabaseAdmin
    .from("minute_batches")
    .select("id")
    .eq("purchase_id", purchase.id)
    .eq("salon_id", purchase.salon_id)
    .maybeSingle();

    if (existingBatchError) {
      console.error(
        "Webhook duplicate check failed:",
        existingBatchError
      );

      return NextResponse.json(
        { error: "Unable to check existing credit." },
        { status: 500 }
      );
    }

    if (!existingBatch) {
      const { error: transactionError } = await supabaseAdmin
  .from("minute_transactions")
  .insert({
    salon_id: purchase.salon_id,
    customer_id: purchase.customer_id,
    minutes: purchase.minutes_added,
    transaction_type: "purchase",
    reason: `Online SumUp purchase - ${checkout.checkout_reference}`,
  });

      if (transactionError) {
        console.error(
          "Webhook minute transaction failed:",
          transactionError
        );

        return NextResponse.json(
          { error: "Unable to record minute transaction." },
          { status: 500 }
        );
      }

      const { error: batchError } = await supabaseAdmin
  .from("minute_batches")
  .insert({
    salon_id: purchase.salon_id,
    customer_id: purchase.customer_id,
    purchase_id: purchase.id,
    minutes_added: purchase.minutes_added,
    minutes_remaining: purchase.minutes_added,
    expires_at: purchase.expiry_date,
  });

      if (batchError) {
        await supabaseAdmin
  .from("minute_transactions")
  .delete()
  .eq("salon_id", purchase.salon_id)
  .eq("customer_id", purchase.customer_id)
  .eq(
    "reason",
    `Online SumUp purchase - ${checkout.checkout_reference}`
  );

        console.error("Webhook minute batch failed:", batchError);

        return NextResponse.json(
          { error: "Unable to credit minute batch." },
          { status: 500 }
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
  .from("purchases")
  .update({
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  })
  .eq("id", purchase.id)
  .eq("salon_id", purchase.salon_id)
  .eq("payment_status", "pending");

if (updateError) {
  console.error("Webhook purchase update failed:", updateError);

  return NextResponse.json(
    { error: "Unable to complete purchase." },
    { status: 500 }
  );
}

const { data: customer, error: customerError } = await supabaseAdmin
  .from("customers")
  .select("full_name")
  .eq("customer_id", purchase.customer_id)
  .eq("salon_id", purchase.salon_id)
  .maybeSingle();

if (customerError) {
  console.error(
    "Webhook customer name lookup failed:",
    customerError
  );
}

const { error: receptionSaleError } = await supabaseAdmin
  .from("reception_sales")
  .insert({
    salon_id: purchase.salon_id,
    customer_id: purchase.customer_id,
    customer_name: customer?.full_name || null,
    amount: purchase.amount_paid,
    minutes: purchase.minutes_added,
    payment_method: "card",
  });

if (receptionSaleError) {
  console.error(
    "Webhook reception sale failed:",
    receptionSaleError
  );
}

const { error: auditError } = await supabaseAdmin
  .from("audit_log")
  .insert({
    salon_id: purchase.salon_id,
    staff_id: null,
    staff_name: "Online Sale",
    action: "Package Sold",
    customer_name: customer?.full_name || null,
    details: `${purchase.minutes_added} Minutes (£${Number(
      purchase.amount_paid
    ).toFixed(2)})`,
  });

if (auditError) {
  console.error("Webhook audit log failed:", auditError);
}

return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("SumUp webhook failed:", error);

    return NextResponse.json(
      { error: "Unexpected webhook error." },
      { status: 500 }
    );
  }
}
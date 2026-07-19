import { createClient } from "@supabase/supabase-js";

interface Props {
  searchParams: Promise<{
    checkoutReference?: string;
  }>;
}

type SumUpCheckout = {
  id?: string;
  checkout_reference?: string;
  status?: "PENDING" | "FAILED" | "PAID" | "EXPIRED";
  amount?: number;
  currency?: string;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getExpiryDate() {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1);
  return expiry.toISOString();
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
      <section className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
          Payment problem
        </p>

        <h1 className="mt-4 text-4xl font-bold">{message}</h1>

        <p className="mt-6 text-zinc-400">
          Your payment will not be credited twice. Please contact Sun Temple if
          you need assistance.
        </p>

        <a
          href="/my-minutes"
          className="mt-8 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
        >
          View My Minutes
        </a>
      </section>
    </main>
  );
}

export default async function PaymentSuccess({ searchParams }: Props) {
  const params = await searchParams;
  const checkoutReference = params.checkoutReference;

  if (!checkoutReference) {
    return <ErrorPage message="Payment reference missing." />;
  }

  const { data: purchase, error: purchaseError } = await supabaseAdmin
  .from("purchases")
  .select("*")
  .eq("checkout_reference", checkoutReference)
  .maybeSingle();

if (purchaseError) {
  return <ErrorPage message="Unable to verify purchase." />;
}

if (!purchase) {
  const { data: vipMembership, error: vipError } = await supabaseAdmin
    .from("vip_memberships")
    .select("*")
    .eq("checkout_reference", checkoutReference)
    .maybeSingle();

  if (vipError) {
    return <ErrorPage message="Unable to verify VIP membership." />;
  }

  if (!vipMembership) {
    return <ErrorPage message="Purchase not found." />;
  }

  const vipResponse = await fetch(
  `https://api.sumup.com/v0.1/checkouts/${vipMembership.sumup_checkout_id}`,
  {
    headers: {
      Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
    },
    cache: "no-store",
  }
);

if (!vipResponse.ok) {
  return (
    <ErrorPage message="Unable to verify the VIP payment with SumUp." />
  );
}

const vipCheckout = (await vipResponse.json()) as SumUpCheckout;

const vipPaid =
  vipCheckout.status === "PAID" &&
  vipCheckout.checkout_reference === checkoutReference &&
  Number(vipCheckout.amount) === Number(vipMembership.amount_paid) &&
  vipCheckout.currency === "GBP";

if (!vipPaid) {
  return (
    <ErrorPage message="VIP payment has not yet been verified." />
  );
}
const { data: updatedVip, error: vipUpdateError } = await supabaseAdmin
  .from("vip_memberships")
  .update({
    payment_status: "paid",
    started_at: new Date().toISOString(),
  })
  .eq("id", vipMembership.id)
  .eq("payment_status", "pending")
  .select()
  .maybeSingle();

if (vipUpdateError) {
  return (
    <ErrorPage message="VIP payment was verified but the membership could not be activated." />
  );
}

const activeVip = updatedVip ?? vipMembership;
const { error: customerUpdateError } = await supabaseAdmin
  .from("customers")
  .update({
    vip_expires_at: activeVip.expires_at,
  })
  .eq("customer_id", activeVip.customer_id);

if (customerUpdateError) {
  return (
    <ErrorPage message="VIP membership activated, but the customer account could not be updated." />
  );
}

return (
  <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
    <section className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
        VIP Membership
      </p>

      <h1 className="mt-4 text-5xl font-bold">
  ⭐ VIP Activated ⭐
</h1>

      <p className="mt-6 text-xl text-zinc-300">
  Welcome to Sun Temple VIP.
</p>

<p className="mt-4 text-zinc-400">
  Your 20% discount is now active.
</p>

<p className="mt-2 text-zinc-400">
  Membership expires on{" "}
  {new Date(activeVip.expires_at).toLocaleDateString("en-GB")}.
</p>

<a
  href="/my-minutes"
  className="mt-10 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
>
  View My Minutes
</a>
    </section>
  </main>
);
}

  if (purchase.payment_status === "paid") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="text-center">
          <h1 className="text-5xl font-bold">Payment Already Processed</h1>

          <p className="mt-4">
            Your minutes have already been added to your account.
          </p>

          <a
            href="/my-minutes"
            className="mt-8 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
          >
            View My Minutes
          </a>
        </div>
      </main>
    );
  }

  if (!purchase.sumup_checkout_id) {
    return <ErrorPage message="SumUp checkout ID missing." />;
  }

  const sumUpResponse = await fetch(
    `https://api.sumup.com/v0.1/checkouts/${purchase.sumup_checkout_id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
      },
      cache: "no-store",
    }
  );

  if (!sumUpResponse.ok) {
    return <ErrorPage message="Unable to verify the payment with SumUp." />;
  }

  const sumUpCheckout =
    (await sumUpResponse.json()) as SumUpCheckout;

  const paymentMatches =
    sumUpCheckout.status === "PAID" &&
    sumUpCheckout.checkout_reference === checkoutReference &&
    Number(sumUpCheckout.amount) === Number(purchase.amount_paid) &&
    sumUpCheckout.currency === "GBP";

  if (!paymentMatches) {
    return <ErrorPage message="Payment has not been verified as paid." />;
  }

  const { error: transactionError } = await supabaseAdmin
    .from("minute_transactions")
    .insert({
      customer_id: purchase.customer_id,
      minutes: purchase.minutes_added,
      transaction_type: "purchase",
      reason: `Online SumUp purchase - ${checkoutReference}`,
    });

  if (transactionError) {
    return <ErrorPage message="The payment was verified, but the minutes could not be recorded." />;
  }

  const { error: batchError } = await supabaseAdmin
    .from("minute_batches")
    .insert({
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
      .eq("customer_id", purchase.customer_id)
      .eq("reason", `Online SumUp purchase - ${checkoutReference}`);

    return <ErrorPage message="The payment was verified, but the minute balance could not be updated." />;
  }

  const { data: updatedPurchase, error: updateError } = await supabaseAdmin
  .from("purchases")
  .update({
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  })
  .eq("id", purchase.id)
  .eq("payment_status", "pending")
  .select("id")
  .maybeSingle();

if (updateError) {
  return (
    <ErrorPage message="Minutes were added, but the purchase record could not be completed." />
  );
}

if (!updatedPurchase) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold">Payment Already Processed</h1>

        <p className="mt-4">
          Your minutes have already been added to your account.
        </p>

        <a
          href="/my-minutes"
          className="mt-8 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
        >
          View My Minutes
        </a>
      </div>
    </main>
  );
}
  const { data: customer } = await supabaseAdmin
  .from("customers")
  .select("full_name")
  .eq("customer_id", purchase.customer_id)
  .maybeSingle();

const { error: saleError } = await supabaseAdmin
  .from("reception_sales")
  .insert({
    customer_id: purchase.customer_id,
    customer_name: customer?.full_name || "Online Customer",
    minutes: purchase.minutes_added,
    amount: purchase.amount_paid,
    payment_method: "card",
  });

if (saleError) {
  return (
    <ErrorPage message="Your minutes were added, but the online sale could not be added to the Owner Dashboard." />
  );
}
const { error: auditError } = await supabaseAdmin
  .from("audit_log")
  .insert({
    staff_id: null,
    staff_name: "Online Sale",
    action: "Package Sold",
    customer_name: customer?.full_name || "Online Customer",
    details: `${purchase.minutes_added} Minutes (£${Number(
      purchase.amount_paid
    ).toFixed(2)})`,
  });

if (auditError) {
  console.error("Online purchase audit log failed:", auditError);
}

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Payment Successful
        </p>

        <h1 className="mt-4 text-5xl font-bold">Minutes added</h1>

        <p className="mt-6 text-xl text-zinc-300">
          {purchase.minutes_added} minutes have been added to your account.
        </p>

        <p className="mt-3 text-zinc-400">
          These minutes expire one month from today.
        </p>

        <a
          href="/my-minutes"
          className="mt-10 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
        >
          View My Minutes
        </a>
      </section>
    </main>
  );
}
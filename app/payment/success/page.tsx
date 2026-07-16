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

  if (purchaseError || !purchase) {
    return <ErrorPage message="Purchase not found." />;
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
      expires_at: getExpiryDate(),
    });

  if (batchError) {
    await supabaseAdmin
      .from("minute_transactions")
      .delete()
      .eq("customer_id", purchase.customer_id)
      .eq("reason", `Online SumUp purchase - ${checkoutReference}`);

    return <ErrorPage message="The payment was verified, but the minute balance could not be updated." />;
  }

  const { error: updateError } = await supabaseAdmin
    .from("purchases")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", purchase.id)
    .eq("payment_status", "pending");

  if (updateError) {
    return <ErrorPage message="Minutes were added, but the purchase record could not be completed." />;
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
import { createClient } from "@supabase/supabase-js";

interface Props {
  searchParams: Promise<{
    checkoutReference?: string;
  }>;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getExpiryDate() {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 1);
  return expiry.toISOString();
}

export default async function PaymentSuccess({ searchParams }: Props) {
  const params = await searchParams;
  const checkoutReference = params.checkoutReference;

  if (!checkoutReference) {
    return <h1>Payment reference missing</h1>;
  }

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("*")
    .eq("checkout_reference", checkoutReference)
    .single();

  if (!purchase) {
    return <h1>Purchase not found</h1>;
  }

  if (purchase.payment_status === "paid") {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
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
    reason: `Online SumUp purchase - ${checkoutReference}`,
  });

  await supabaseAdmin.from("minute_batches").insert({
    customer_id: purchase.customer_id,
    purchase_id: purchase.id,
    minutes_added: purchase.minutes_added,
    minutes_remaining: purchase.minutes_added,
    expires_at: getExpiryDate(),
  });

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
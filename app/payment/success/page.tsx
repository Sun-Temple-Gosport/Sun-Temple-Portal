import { createClient } from "@supabase/supabase-js";

interface Props {
  searchParams: Promise<{
    checkoutReference?: string;
    provider?: string;
  }>;
}

type SumUpCheckout = {
  id?: string;
  checkout_reference?: string;
  status?: "PENDING" | "FAILED" | "PAID" | "EXPIRED";
  amount?: number;
  currency?: string;
};

type StripeCheckoutSession = {
  id?: string;
  payment_status?: string;
  client_reference_id?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
};

type DojoPaymentIntent = {
  id?: string;
  status?: string;
  reference?: string;
  amount?: {
    value?: number;
    currencyCode?: string;
  };
};

type SquarePaymentLinkResponse = {
  payment_link?: {
    id?: string;
    order_id?: string;
  };
};

type SquareOrderResponse = {
  order?: {
    id?: string;
    location_id?: string;
    tenders?: {
      id?: string;
    }[];
  };
};

type SquarePaymentResponse = {
  payment?: {
    id?: string;
    status?: string;
    location_id?: string;
    order_id?: string;
    note?: string;
    amount_money?: {
      amount?: number;
      currency?: string;
    };
  };
};

type StoredCredentials = {
  api_key?: string;
  merchant_code?: string;
  secret_key?: string;
  environment?: string;
access_token?: string;
location_id?: string;
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

async function getSalonSlug(salonId: string | null | undefined) {
  if (!salonId) return null;

  const { data, error } = await supabaseAdmin
    .from("salons")
    .select("slug")
    .eq("id", salonId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Could not resolve payment salon:", error.message);
    return null;
  }

  return data?.slug ?? null;
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
          Your payment will not be credited twice. Please contact the salon if
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
const returnedProvider =
  params.provider?.trim().toLowerCase() ?? "";

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

  const vipSalonSlug = await getSalonSlug(vipMembership.salon_id);
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
  .eq("salon_id", vipMembership.salon_id)
  .eq("payment_status", "pending")
  .select()
  .maybeSingle();

if (vipUpdateError) {
  return (
    <ErrorPage message="VIP payment was verified but the membership could not be activated." />
  );
}

if (!updatedVip) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold">
          VIP Membership Already Activated
        </h1>

        <p className="mt-4 text-zinc-300">
          Your VIP membership has already been processed.
        </p>

        <a
          href={
  vipSalonSlug
    ? `/my-minutes?salon=${encodeURIComponent(vipSalonSlug)}`
    : "/my-minutes"
}
          className="mt-8 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
        >
          View My Minutes
        </a>
      </div>
    </main>
  );
}

const activeVip = updatedVip;
const { error: customerUpdateError } = await supabaseAdmin
  .from("customers")
  .update({
    vip_expires_at: activeVip.expires_at,
  })
  .eq("customer_id", activeVip.customer_id)
  .eq("salon_id", activeVip.salon_id);

if (customerUpdateError) {
  return (
    <ErrorPage message="VIP membership activated, but the customer account could not be updated." />
  );
}
const { data: vipCustomer } = await supabaseAdmin
  .from("customers")
  .select("full_name")
  .eq("customer_id", activeVip.customer_id)
  .eq("salon_id", activeVip.salon_id)
  .maybeSingle();

const { error: vipSaleError } = await supabaseAdmin
  .from("reception_sales")
  .insert({
    salon_id: activeVip.salon_id,
    customer_id: activeVip.customer_id,
    customer_name: vipCustomer?.full_name || "Online Customer",
    minutes: 0,
    amount: activeVip.amount_paid,
    payment_method: "card",
  });

if (vipSaleError) {
  return (
    <ErrorPage message="VIP membership activated, but the sale could not be added to the Owner Dashboard." />
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
  Welcome to our VIP membership.
</p>

<p className="mt-4 text-zinc-400">
  Your 20% discount is now active.
</p>

<p className="mt-2 text-zinc-400">
  Membership expires on{" "}
  {new Date(activeVip.expires_at).toLocaleDateString("en-GB")}.
</p>

<a
  href={
  vipSalonSlug
    ? `/my-minutes?salon=${encodeURIComponent(vipSalonSlug)}`
    : "/my-minutes"
}
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

  const purchaseProvider =
  typeof purchase.payment_provider === "string"
    ? purchase.payment_provider.trim().toLowerCase()
    : "";

const paymentProvider =
  purchaseProvider || returnedProvider;

if (
  purchaseProvider &&
  returnedProvider &&
  purchaseProvider !== returnedProvider
) {
  return (
    <ErrorPage message="The payment provider does not match this purchase." />
  );
}

if (!paymentProvider) {
  return (
    <ErrorPage message="The payment provider could not be identified." />
  );
}

const providerCheckoutId =
  typeof purchase.sumup_checkout_id === "string"
    ? purchase.sumup_checkout_id.trim()
    : "";

if (!providerCheckoutId) {
  return (
    <ErrorPage message="Payment checkout ID missing." />
  );
}

const {
  data: credentialsData,
  error: credentialsError,
} = await supabaseAdmin.rpc(
  "get_salon_payment_credentials",
  {
    p_salon_id: purchase.salon_id,
  }
);

if (credentialsError) {
  console.error(
    "Payment credential retrieval failed:",
    credentialsError
  );

  return (
    <ErrorPage message="Unable to load the salon payment details securely." />
  );
}

const credentials =
  credentialsData as StoredCredentials | null;

if (!credentials) {
  return (
    <ErrorPage message="No saved payment details were found for this salon." />
  );
}

let paymentMatches = false;
let paymentProviderLabel = "";

if (paymentProvider === "sumup") {
  const apiKey = credentials.api_key?.trim();

  if (!apiKey) {
    return (
      <ErrorPage message="The salon's SumUp payment details are incomplete." />
    );
  }

  const sumUpResponse = await fetch(
    `https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(
      providerCheckoutId
    )}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    }
  );

  if (!sumUpResponse.ok) {
    return (
      <ErrorPage message="Unable to verify the payment with SumUp." />
    );
  }

  const sumUpCheckout =
    (await sumUpResponse.json()) as SumUpCheckout;

  paymentMatches =
    sumUpCheckout.status === "PAID" &&
    sumUpCheckout.checkout_reference === checkoutReference &&
    Number(sumUpCheckout.amount) ===
      Number(purchase.amount_paid) &&
    sumUpCheckout.currency === "GBP";

  paymentProviderLabel = "SumUp";
} else if (paymentProvider === "stripe") {
  const secretKey = credentials.secret_key?.trim();

  if (!secretKey) {
    return (
      <ErrorPage message="The salon's Stripe payment details are incomplete." />
    );
  }

  const authorization = Buffer.from(
    `${secretKey}:`
  ).toString("base64");

  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(
      providerCheckoutId
    )}`,
    {
      headers: {
        Authorization: `Basic ${authorization}`,
      },
      cache: "no-store",
    }
  );

  if (!stripeResponse.ok) {
    return (
      <ErrorPage message="Unable to verify the payment with Stripe." />
    );
  }

  const stripeCheckout =
    (await stripeResponse.json()) as StripeCheckoutSession;

  const expectedAmount =
    Math.round(Number(purchase.amount_paid) * 100);

  paymentMatches =
    stripeCheckout.payment_status === "paid" &&
    stripeCheckout.client_reference_id === checkoutReference &&
    Number(stripeCheckout.amount_total) === expectedAmount &&
    stripeCheckout.currency?.toLowerCase() === "gbp" &&
    stripeCheckout.metadata?.salon_id ===
      purchase.salon_id &&
    stripeCheckout.metadata?.customer_id ===
      purchase.customer_id &&
    String(stripeCheckout.metadata?.package_id ?? "") ===
      String(purchase.package_id);

    paymentProviderLabel = "Stripe";
} else if (paymentProvider === "square") {
  const accessToken =
    credentials.access_token?.trim();

  const locationId =
    credentials.location_id?.trim();

  const environment =
    credentials.environment?.trim().toLowerCase();

  if (!accessToken || !locationId) {
    return (
      <ErrorPage message="The salon's Square payment details are incomplete." />
    );
  }

  const squareBaseUrl =
    environment === "sandbox"
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";

  const squareHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Square-Version": "2026-07-15",
    "Content-Type": "application/json",
  };

  const paymentLinkResponse = await fetch(
    `${squareBaseUrl}/v2/online-checkout/payment-links/${encodeURIComponent(
      providerCheckoutId
    )}`,
    {
      headers: squareHeaders,
      cache: "no-store",
    }
  );

  if (!paymentLinkResponse.ok) {
    return (
      <ErrorPage message="Unable to verify the Square checkout." />
    );
  }

  const paymentLinkData =
    (await paymentLinkResponse.json()) as SquarePaymentLinkResponse;

  const orderId =
    paymentLinkData.payment_link?.order_id;

  if (!orderId) {
    return (
      <ErrorPage message="Square checkout order could not be found." />
    );
  }

  const orderResponse = await fetch(
    `${squareBaseUrl}/v2/orders/${encodeURIComponent(
      orderId
    )}`,
    {
      headers: squareHeaders,
      cache: "no-store",
    }
  );

  if (!orderResponse.ok) {
    return (
      <ErrorPage message="Unable to verify the Square order." />
    );
  }

  const orderData =
    (await orderResponse.json()) as SquareOrderResponse;

  const paymentId =
    orderData.order?.tenders?.[0]?.id;

  if (!paymentId) {
    return (
      <ErrorPage message="Square payment could not be found." />
    );
  }

  const paymentResponse = await fetch(
    `${squareBaseUrl}/v2/payments/${encodeURIComponent(
      paymentId
    )}`,
    {
      headers: squareHeaders,
      cache: "no-store",
    }
  );

  if (!paymentResponse.ok) {
    return (
      <ErrorPage message="Unable to verify the payment with Square." />
    );
  }

  const paymentData =
    (await paymentResponse.json()) as SquarePaymentResponse;

  const expectedAmount =
    Math.round(Number(purchase.amount_paid) * 100);

  paymentMatches =
    paymentData.payment?.status === "COMPLETED" &&
    paymentData.payment?.location_id === locationId &&
    paymentData.payment?.order_id === orderId &&
    Number(paymentData.payment?.amount_money?.amount) ===
      expectedAmount &&
    paymentData.payment?.amount_money?.currency?.toLowerCase() ===
      "gbp";

    paymentProviderLabel = "Square";
} else if (paymentProvider === "dojo") {
  const apiKey =
    credentials.api_key?.trim();

  if (!apiKey) {
    return (
      <ErrorPage message="The salon's Dojo payment details are incomplete." />
    );
  }

  const dojoResponse = await fetch(
    `https://api.dojo.tech/payment-intents/${encodeURIComponent(
      providerCheckoutId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${apiKey}`,
        Version: "2026-02-27",
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!dojoResponse.ok) {
    return (
      <ErrorPage message="Unable to verify the payment with Dojo." />
    );
  }

  const dojoPayment =
    (await dojoResponse.json()) as DojoPaymentIntent;

  const expectedAmount =
    Math.round(Number(purchase.amount_paid) * 100);

  paymentMatches =
    dojoPayment.id === providerCheckoutId &&
    dojoPayment.status === "Captured" &&
    dojoPayment.reference === checkoutReference &&
    Number(dojoPayment.amount?.value) === expectedAmount &&
    dojoPayment.amount?.currencyCode?.toUpperCase() === "GBP";

  paymentProviderLabel = "Dojo";
} else {
  return (
    <ErrorPage
      message={`Payment verification for ${paymentProvider} is not available yet.`}
    />
  );
}

if (!paymentMatches) {
  return (
    <ErrorPage message="Payment has not been verified as paid." />
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
  return (
    <ErrorPage message="The payment was verified, but we could not confirm whether the minutes were already credited." />
  );
}

if (existingBatch) {
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

 const { error: transactionError } = await supabaseAdmin
  .from("minute_transactions")
  .insert({
    salon_id: purchase.salon_id,
    customer_id: purchase.customer_id,
    minutes: purchase.minutes_added,
    transaction_type: "purchase",
    reason: `Online ${paymentProviderLabel} purchase - ${checkoutReference}`,
  });

  if (transactionError) {
    return <ErrorPage message="The payment was verified, but the minutes could not be recorded." />;
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
  `Online ${paymentProviderLabel} purchase - ${checkoutReference}`
);

    return <ErrorPage message="The payment was verified, but the minute balance could not be updated." />;
  }

  const { data: updatedPurchase, error: updateError } = await supabaseAdmin
  .from("purchases")
  .update({
    payment_status: "paid",
    paid_at: new Date().toISOString(),
  })
  .eq("id", purchase.id)
.eq("salon_id", purchase.salon_id)
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
  .eq("salon_id", purchase.salon_id)
  .maybeSingle();

const { error: saleError } = await supabaseAdmin
  .from("reception_sales")
  .insert({
    salon_id: purchase.salon_id,
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
    salon_id: purchase.salon_id,
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
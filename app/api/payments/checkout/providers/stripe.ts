import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "../providerTypes";

export async function createStripeCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  const secretKey =
    context.credentials.secret_key?.trim();

  if (!secretKey) {
    throw new Error(
      "Stripe payment credentials are incomplete."
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "TanSalonOS site URL is not configured."
    );
  }

  const amountInPence =
    Math.round(context.input.amount * 100);

  const body = new URLSearchParams();

  body.set("mode", "payment");

  body.set(
    "success_url",
    `${siteUrl}/payment/success?checkoutReference=${encodeURIComponent(
      context.input.checkoutReference
    )}&provider=stripe`
  );

  body.set(
    "cancel_url",
    `${siteUrl}/buy-minutes`
  );

  body.set(
    "client_reference_id",
    context.input.checkoutReference
  );

  body.set(
    "line_items[0][price_data][currency]",
    "gbp"
  );

  body.set(
    "line_items[0][price_data][unit_amount]",
    String(amountInPence)
  );

  body.set(
    "line_items[0][price_data][product_data][name]",
    context.input.description
  );

  body.set(
    "line_items[0][quantity]",
    "1"
  );

  body.set(
    "metadata[checkout_reference]",
    context.input.checkoutReference
  );

  body.set(
    "metadata[salon_id]",
    context.input.salonId
  );

  body.set(
    "metadata[customer_id]",
    context.input.customerId
  );

  body.set(
    "metadata[package_id]",
    String(context.input.packageId)
  );

  const authorization = Buffer.from(
    `${secretKey}:`
  ).toString("base64");

  const response = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Stripe checkout creation failed:",
      data
    );

    throw new Error(
      "Stripe could not create the online checkout."
    );
  }

  if (
    typeof data?.url !== "string" ||
    typeof data?.id !== "string"
  ) {
    throw new Error(
      "Stripe returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",
    checkoutUrl: data.url,
    providerCheckoutId: data.id,
  };
}
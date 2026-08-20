import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "../providerTypes";

export async function createSquareCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  const accessToken =
    context.credentials.access_token?.trim();

  const locationId =
    context.credentials.location_id?.trim();
    const environment =
  context.credentials.environment?.trim().toLowerCase();

const squareBaseUrl =
  environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  if (!accessToken || !locationId) {
    throw new Error(
      "Square payment credentials are incomplete."
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

  const response = await fetch(
  `${squareBaseUrl}/v2/online-checkout/payment-links`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2026-07-15",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotency_key:
          context.input.checkoutReference,

        description:
          context.input.description,

        quick_pay: {
          name: context.input.description,
          price_money: {
            amount: amountInPence,
            currency: "GBP",
          },
          location_id: locationId,
        },

        checkout_options: {
          redirect_url:
            `${siteUrl}/payment/success?checkoutReference=${encodeURIComponent(
              context.input.checkoutReference
            )}&provider=square`,
        },

        payment_note:
          `TanSalonOS checkout ${context.input.checkoutReference}`,
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Square checkout creation failed:",
      data
    );

    throw new Error(
      "Square could not create the online checkout."
    );
  }

  const paymentLink = data?.payment_link;

  if (
    typeof paymentLink?.url !== "string" ||
    typeof paymentLink?.id !== "string"
  ) {
    throw new Error(
      "Square returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",
    checkoutUrl: paymentLink.url,
    providerCheckoutId: paymentLink.id,
  };
}
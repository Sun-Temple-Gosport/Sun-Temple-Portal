import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "../providerTypes";

export async function createAdyenCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  const apiKey =
    context.credentials.api_key?.trim();

  const merchantAccount =
    context.credentials.merchant_account?.trim();

  const liveUrlPrefix =
    context.credentials.live_url_prefix?.trim();

  if (
    !apiKey ||
    !merchantAccount ||
    !liveUrlPrefix
  ) {
    throw new Error(
      "Adyen payment credentials are incomplete."
    );
  }

  if (
    !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(
      liveUrlPrefix
    )
  ) {
    throw new Error(
      "Adyen Live URL Prefix is not valid."
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
    `https://${liveUrlPrefix}-checkout-live.adyenpayments.com/checkout/v72/paymentLinks`,
    {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Idempotency-Key":
          context.input.checkoutReference,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: {
          currency: "GBP",
          value: amountInPence,
        },

        merchantAccount,

        reference:
          context.input.checkoutReference,

        countryCode: "GB",

        description:
          context.input.description.slice(0, 280),

        returnUrl:
          `${siteUrl}/payment/success?checkoutReference=${encodeURIComponent(
            context.input.checkoutReference
          )}&provider=adyen`,

        reusable: false,
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Adyen checkout creation failed:",
      data
    );

    throw new Error(
      "Adyen could not create the online checkout."
    );
  }

  if (
    typeof data?.url !== "string" ||
    typeof data?.id !== "string"
  ) {
    throw new Error(
      "Adyen returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",
    checkoutUrl: data.url,
    providerCheckoutId: data.id,
  };
}
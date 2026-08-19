import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "../providerTypes";

export async function createDojoCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  const apiKey =
    context.credentials.api_key?.trim();

  if (!apiKey) {
    throw new Error(
      "Dojo payment credentials are incomplete."
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
    "https://api.dojo.tech/payment-intents",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        Version: "2026-02-27",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: {
          value: amountInPence,
          currencyCode: "GBP",
        },

        reference:
          context.input.checkoutReference,

        description:
          context.input.description,

        paymentMethods: ["Card"],

        config: {
          redirectUrl:
            `${siteUrl}/payment/success?checkoutReference=${encodeURIComponent(
              context.input.checkoutReference
            )}&provider=dojo`,
        },
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Dojo checkout creation failed:",
      data
    );

    throw new Error(
      "Dojo could not create the online checkout."
    );
  }

  if (
    typeof data?.id !== "string" ||
    typeof data?.paymentLink !== "string"
  ) {
    throw new Error(
      "Dojo returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",
    checkoutUrl: data.paymentLink,
    providerCheckoutId: data.id,
  };
}
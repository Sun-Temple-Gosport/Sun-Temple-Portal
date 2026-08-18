import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "../providerTypes";

export async function createSumUpCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  const apiKey =
    context.credentials.api_key?.trim();

  const merchantCode =
    context.credentials.merchant_code?.trim();

  if (!apiKey || !merchantCode) {
    throw new Error(
      "SumUp payment credentials are incomplete."
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "TanSalonOS site URL is not configured."
    );
  }

  const response = await fetch(
    "https://api.sumup.com/v0.1/checkouts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        checkout_reference:
          context.input.checkoutReference,

        amount: context.input.amount,

        currency: context.input.currency,

        merchant_code: merchantCode,

        description:
          context.input.description,

        hosted_checkout: {
          enabled: true,
        },

        return_url:
          `${siteUrl}/api/sumup/webhook`,

        redirect_url:
          `${siteUrl}/payment/success` +
          `?checkoutReference=${encodeURIComponent(
            context.input.checkoutReference
          )}` +
          `&provider=sumup`,
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "SumUp checkout creation failed:",
      data
    );

    throw new Error(
      "SumUp could not create the online checkout."
    );
  }

  if (
    typeof data?.hosted_checkout_url !== "string" ||
    typeof data?.id !== "string"
  ) {
    throw new Error(
      "SumUp returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",
    checkoutUrl: data.hosted_checkout_url,
    providerCheckoutId: data.id,
  };
}
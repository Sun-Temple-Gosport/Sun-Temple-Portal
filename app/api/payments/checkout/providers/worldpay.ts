import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "../providerTypes";

export async function createWorldpayCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  const username =
    context.credentials.api_username?.trim();

  const password =
    context.credentials.api_password?.trim();

  const merchantEntity =
    context.credentials.merchant_entity?.trim();

  if (
    !username ||
    !password ||
    !merchantEntity
  ) {
    throw new Error(
      "Worldpay payment credentials are incomplete."
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

  const authorization = Buffer.from(
    `${username}:${password}`
  ).toString("base64");

  const successUrl =
    `${siteUrl}/payment/success?checkoutReference=${encodeURIComponent(
      context.input.checkoutReference
    )}&provider=worldpay`;

  const returnUrl =
    `${siteUrl}/buy-minutes`;

  const response = await fetch(
    "https://access.worldpay.com/payment_pages",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type":
          "application/vnd.worldpay.payment_pages-v1.hal+json",
        Accept:
          "application/vnd.worldpay.payment_pages-v1.hal+json",
      },
      body: JSON.stringify({
        transactionReference:
          context.input.checkoutReference,

        merchant: {
          entity: merchantEntity,
        },

        narrative: {
          line1: "Online salon purchase",
        },

        value: {
          currency: "GBP",
          amount: amountInPence,
        },

        description:
          context.input.description.slice(0, 128),

        resultURLs: {
          successURL: successUrl,
          pendingURL: successUrl,
          failureURL: returnUrl,
          errorURL: returnUrl,
          cancelURL: returnUrl,
          expiryURL: returnUrl,
        },

        expiry: "3600",
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Worldpay checkout creation failed:",
      data
    );

    throw new Error(
      "Worldpay could not create the online checkout."
    );
  }

  if (typeof data?.url !== "string") {
    throw new Error(
      "Worldpay returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",
    checkoutUrl: data.url,
  };
}
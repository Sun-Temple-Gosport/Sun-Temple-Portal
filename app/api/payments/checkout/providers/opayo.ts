import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "../providerTypes";

export async function createOpayoCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  const integrationKey =
    context.credentials.integration_key?.trim();

  const integrationPassword =
    context.credentials.integration_password?.trim();

  const vendorName =
    context.credentials.vendor_name?.trim();

  if (
    !integrationKey ||
    !integrationPassword ||
    !vendorName
  ) {
    throw new Error(
      "Opayo payment credentials are incomplete."
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
    `${integrationKey}:${integrationPassword}`
  ).toString("base64");

  const successUrl =
    `${siteUrl}/payment/success?checkoutReference=${encodeURIComponent(
      context.input.checkoutReference
    )}&provider=opayo`;

  const failureUrl =
    `${siteUrl}/buy-minutes`;

  const response = await fetch(
    "https://live.opayo.eu.elavon.com/hosted-payment-pages/vendor/v1/payment-pages",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transactionDetails: {
          transactionType: "Payment",
          vendorName,
          vendorTxCode:
            context.input.checkoutReference,
          amount: amountInPence,
          currency: "GBP",
          description:
            context.input.description,
        },

        successUrl,
        failureUrl,
        expiryUrl: failureUrl,
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Opayo checkout creation failed:",
      data
    );

    throw new Error(
      "Opayo could not create the online checkout."
    );
  }

  if (typeof data?.nextURL !== "string") {
    throw new Error(
      "Opayo returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",
    checkoutUrl: data.nextURL,
    providerCheckoutId:
      typeof data?.registrationId === "string"
        ? data.registrationId
        : undefined,
  };
}
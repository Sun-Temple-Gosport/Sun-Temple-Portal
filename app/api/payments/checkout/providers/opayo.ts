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

  const environment =
    context.credentials.environment
      ?.trim()
      .toLowerCase();

  if (
    !integrationKey ||
    !integrationPassword ||
    !vendorName
  ) {
    throw new Error(
      "Opayo payment credentials are incomplete."
    );
  }

  if (
    environment !== "sandbox" &&
    environment !== "live"
  ) {
    throw new Error(
      "Opayo environment is not configured."
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error(
      "TanSalonOS site URL is not configured."
    );
  }

  const opayoBaseUrl =
    environment === "sandbox"
      ? "https://sandbox.opayo.eu.elavon.com"
      : "https://live.opayo.eu.elavon.com";

  const amountInPence =
    Math.round(context.input.amount * 100);

  const authorization =
    Buffer.from(
      `${integrationKey}:${integrationPassword}`
    ).toString("base64");

  const successUrl =
    `${siteUrl}/payment/success?checkoutReference=${encodeURIComponent(
      context.input.checkoutReference
    )}&provider=opayo`;

  const failureUrl =
    `${siteUrl}/buy-minutes`;

  /*
   * Opayo HPP currently requires billing-address
   * information when registering a Payment.
   *
   * For the shared Opayo sandbox account we use
   * Opayo's published test customer/address data.
   *
   * We deliberately DO NOT send fake address data
   * to the Live environment.
   */
  if (environment === "live") {
    throw new Error(
      "Opayo Live checkout requires customer billing address support."
    );
  }

  const response = await fetch(
    `${opayoBaseUrl}/hosted-payment-pages/vendor/v1/payment-pages`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Basic ${authorization}`,
        "Content-Type":
          "application/json",
        Accept:
          "application/json",
      },

      body: JSON.stringify({
        transactionDetails: {
          transactionType: "Payment",

          vendorName,

          vendorTxCode:
            context.input.checkoutReference,

          amount:
            amountInPence,

          currency:
            context.input.currency,

          description:
            context.input.description,

          entryMethod: "Ecommerce",

          customerFirstName:
            "Test",

          customerLastName:
            "Customer",

          customerEmail:
            "test@test.com",

          customerPhone:
            "+44012345678",

          billingAddress: {
            address1:
              "407 St. John Street",

            city:
              "London",

            postalCode:
              "EC1V 4AB",

            country:
              "GB",
          },

          supportedPaymentMethods: {
            card: {
              enabled: true,
              enableSaveCard: false,
            },
          },
        },

        customerDataCapture: {
          captureAmount: true,
          captureBillingAddress: false,
          captureShippingAddress: false,
          captureFiData: false,
          capturePhone: false,
          captureEmail: false,
        },

        presentation: {
          merchantDomain:
            "opayo.io",

          paymentPageType:
            "redirect",
        },

        outcomeReport: {
          redirectUrls: {
            cancelUrl:
              failureUrl,

            failureUrl,

            expiryUrl:
              failureUrl,

            successUrl,
          },

          postProcessNotification: {
            sendVendorEmail: false,
            sendCustomerEmail: false,
          },
        },
      }),

      cache: "no-store",
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Opayo checkout creation failed:",
      response.status,
      data
    );

    throw new Error(
      "Opayo could not create the online checkout."
    );
  }

  if (
    typeof data?.nextURL !== "string" ||
    typeof data?.registrationId !==
      "string" ||
    typeof data?.hmacKey !== "string" ||
    typeof data?.hmacAlgorithm !==
      "string" ||
    typeof data?.expiry !== "string"
  ) {
    console.error(
      "Opayo checkout response incomplete:",
      data
    );

    throw new Error(
      "Opayo returned an incomplete checkout."
    );
  }

  return {
    type: "redirect",

    checkoutUrl:
      data.nextURL,

    providerCheckoutId:
      data.registrationId,

    secureData: {
      provider: "opayo",

      registrationId:
        data.registrationId,

      hmacKey:
        data.hmacKey,

      hmacAlgorithm:
        data.hmacAlgorithm,

      expiry:
        data.expiry,
    },
  };
}
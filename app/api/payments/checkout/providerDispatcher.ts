import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "./providerTypes";

import { createStripeCheckout } from "./providers/stripe";
import { createSumUpCheckout } from "./providers/sumup";

export async function createProviderCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  switch (context.provider) {
    case "sumup":
  return createSumUpCheckout(context);

    case "stripe":
  return createStripeCheckout(context);

    case "square":
      throw new Error(
        "Square checkout connector is not implemented yet."
      );

    case "dojo":
      throw new Error(
        "Dojo checkout connector is not implemented yet."
      );

    case "worldpay":
      throw new Error(
        "Worldpay checkout connector is not implemented yet."
      );

    case "opayo":
      throw new Error(
        "Opayo checkout connector is not implemented yet."
      );

    case "adyen":
      throw new Error(
        "Adyen checkout connector is not implemented yet."
      );

    case "zettle":
      throw new Error(
        "Zettle checkout connector is not implemented yet."
      );

    default: {
      const exhaustiveCheck: never = context.provider;

      throw new Error(
        `Unsupported payment provider: ${exhaustiveCheck}`
      );
    }
  }
}
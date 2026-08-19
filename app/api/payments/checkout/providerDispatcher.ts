import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "./providerTypes";

import { createDojoCheckout } from "./providers/dojo";
import { createSquareCheckout } from "./providers/square";
import { createStripeCheckout } from "./providers/stripe";
import { createSumUpCheckout } from "./providers/sumup";
import { createWorldpayCheckout } from "./providers/worldpay";

export async function createProviderCheckout(
  context: ProviderCheckoutContext
): Promise<CheckoutResult> {
  switch (context.provider) {
    case "sumup":
      return createSumUpCheckout(context);

    case "stripe":
      return createStripeCheckout(context);

    case "square":
      return createSquareCheckout(context);

    case "dojo":
      return createDojoCheckout(context);

    case "worldpay":
      return createWorldpayCheckout(context);

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
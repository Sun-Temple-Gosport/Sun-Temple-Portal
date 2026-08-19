import type {
  CheckoutResult,
  ProviderCheckoutContext,
} from "./providerTypes";

import { createAdyenCheckout } from "./providers/adyen";
import { createDojoCheckout } from "./providers/dojo";
import { createOpayoCheckout } from "./providers/opayo";
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
      return createOpayoCheckout(context);

    case "adyen":
      return createAdyenCheckout(context);

    default: {
      const exhaustiveCheck: never = context.provider;

      throw new Error(
        `Unsupported payment provider: ${exhaustiveCheck}`
      );
    }
  }
}
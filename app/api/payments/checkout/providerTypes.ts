export type OnlinePaymentProvider =
  | "sumup"
  | "stripe"
  | "square"
  | "dojo"
  | "worldpay"
  | "opayo"
  | "adyen";

export type StoredPaymentCredentials = Record<
  string,
  string | undefined
>;

export type CheckoutInput = {
  salonId: string;
  customerId: string;
  packageId: number;
  checkoutReference: string;
  amount: number;
  currency: "GBP";
  description: string;
};

export type SecureCheckoutData = {
  provider: "opayo";
  registrationId: string;
  hmacKey: string;
  hmacAlgorithm: string;
  expiry: string;
};

export type RedirectCheckoutResult = {
  type: "redirect";
  checkoutUrl: string;
  providerCheckoutId?: string;
  secureData?: SecureCheckoutData;
};

export type EmbeddedCheckoutResult = {
  type: "embedded";
  provider: OnlinePaymentProvider;
  clientData: Record<string, unknown>;
  providerCheckoutId?: string;
};

export type CheckoutResult =
  | RedirectCheckoutResult
  | EmbeddedCheckoutResult;

export type ProviderCheckoutContext = {
  provider: OnlinePaymentProvider;
  credentials: StoredPaymentCredentials;
  merchantReference: string | null;
  input: CheckoutInput;
};

export const onlinePaymentProviders: OnlinePaymentProvider[] = [
  "sumup",
  "stripe",
  "square",
  "dojo",
  "worldpay",
  "opayo",
  "adyen",
];
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ProviderId =
  | "sumup"
  | "stripe"
  | "square"
  | "dojo"
  | "worldpay"
  | "opayo"
  | "adyen"
  | "manual"
  | "other";

type ConnectionStatus =
  | "not_configured"
  | "connected"
  | "error";

type Notice = {
  type: "success" | "error";
  text: string;
};

type CredentialField = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  options?: {
    label: string;
    value: string;
  }[];
};

type Provider = {
  id: ProviderId;
  name: string;
  description: string;
  badge: string;
  fields: CredentialField[];
  note?: string;
};

const providers: Provider[] = [
  {
    id: "sumup",
    name: "SumUp",
    description: "Accept online payments using SumUp.",
    badge: "Set up",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Enter your SumUp API key",
        secret: true,
      },
      {
        key: "merchant_code",
        label: "Merchant Code",
        placeholder: "Enter your SumUp merchant code",
      },
    ],
    note:
      "Enter the API Key and Merchant Code belonging to your SumUp business account.",
  },

  {
    id: "stripe",
    name: "Stripe",
    description: "Accept online card payments through Stripe.",
    badge: "Set up",
    fields: [
      {
  key: "secret_key",
  label: "Secret Key",
  placeholder: "sk_test_... or sk_live_...",
  secret: true,
},
],
note:
  "Enter the Stripe Secret Key for this salon's Stripe account.",
},

  {
    id: "square",
    name: "Square",
    description: "Accept online payments using Square Checkout.",
    badge: "Set up",
    fields: [
      {
  key: "environment",
  label: "Environment",
  placeholder: "Choose Sandbox or Live",
  options: [
    {
      label: "Sandbox",
      value: "sandbox",
    },
    {
      label: "Live",
      value: "live",
    },
  ],
},
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Enter your Square access token",
        secret: true,
      },
      {
        key: "location_id",
        label: "Location ID",
        placeholder: "Enter your Square location ID",
      },
    ],
    note:
      "Enter the Access Token and Location ID for the Square account and location used by your salon.",
  },

  {
    id: "dojo",
    name: "Dojo",
    description: "Accept online payments using Dojo.",
    badge: "Set up",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "sk_prod_...",
        secret: true,
      },
    ],
    note:
      "Enter the API Key created for your salon location in the Dojo Developer Portal.",
  },

  {
  id: "worldpay",
  name: "Worldpay",
  description: "Accept online payments through Worldpay.",
  badge: "Set up",
  fields: [
    {
      key: "api_username",
      label: "API Username",
      placeholder: "Enter your Worldpay API username",
    },
    {
      key: "api_password",
      label: "API Password",
      placeholder: "Enter your Worldpay API password",
      secret: true,
    },
    {
      key: "merchant_entity",
      label: "Merchant Entity",
      placeholder: "Example: POxxxxxxxxx",
    },
  ],
  note:
    "Enter your Worldpay API username, password and Merchant Entity from your Worldpay account.",
},

  {
    id: "opayo",
    name: "Opayo",
    description: "Accept online payments through Opayo.",
    badge: "Set up",
    fields: [
      {
        key: "integration_key",
        label: "Integration Key",
        placeholder: "Enter your Opayo integration key",
        secret: true,
      },
      {
        key: "integration_password",
        label: "Integration Password",
        placeholder: "Enter your Opayo integration password",
        secret: true,
      },
      {
        key: "vendor_name",
        label: "Vendor Name",
        placeholder: "Enter your Opayo vendor name",
      },
    ],
    note:
      "Enter the Integration Key, Integration Password and Vendor Name from your Opayo account.",
  },

  {
    id: "adyen",
    name: "Adyen",
    description: "Accept online payments through Adyen.",
    badge: "Set up",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Enter your Adyen API key",
        secret: true,
      },
      {
        key: "merchant_account",
        label: "Merchant Account",
        placeholder: "Enter your Adyen merchant account",
      },
      {
        key: "client_key",
        label: "Client Key",
        placeholder: "Enter your Adyen client key",
      },
      {
        key: "live_url_prefix",
        label: "Live URL Prefix",
        placeholder: "Example: 1797a841fbb37ca7-YourCompany",
      },
    ],
    note:
      "Enter the API Key, Merchant Account, Client Key and Live URL Prefix from your Adyen account.",
  },

  

  {
    id: "manual",
    name: "In-store payments only",
    description:
      "Use any physical card terminal and record the payment in TanSalonOS.",
    badge: "In-store",
    fields: [],
  },

  {
    id: "other",
    name: "Other provider",
    description:
      "Record another payment provider used by your salon.",
    badge: "Other",
    fields: [],
  },
];

export default function PaymentProviderManager() {
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderId | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);

  const [merchantReference, setMerchantReference] =
    useState<string | null>(null);

  const [hasSavedCredentials, setHasSavedCredentials] =
    useState(false);

  const [credentialValues, setCredentialValues] =
    useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [savingCredentials, setSavingCredentials] =
    useState(false);

  const [verifying, setVerifying] = useState(false);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [salonId, setSalonId] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadCurrentSalon() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setNotice({
          type: "error",
          text: "Could not determine the logged-in user.",
        });

        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("salon_id")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError || !profile?.salon_id) {
        setNotice({
          type: "error",
          text:
            profileError?.message ||
            "Could not determine the current salon.",
        });

        setLoading(false);
        return;
      }

      setSalonId(profile.salon_id);
    }

    void loadCurrentSalon();
  }, []);

  useEffect(() => {
    async function loadPaymentProvider() {
      if (!salonId) {
        return;
      }

      setLoading(true);
      setNotice(null);

      const [
        { data: settingsData, error: settingsError },
        { data: connectionData, error: connectionError },
      ] = await Promise.all([
        supabase
          .from("salon_settings")
          .select("payment_provider")
          .eq("salon_id", salonId)
          .maybeSingle(),

        supabase
          .from("salon_payment_connections")
          .select(
            "provider, connection_status, merchant_reference, credentials_secret_id"
          )
          .eq("salon_id", salonId)
          .maybeSingle(),
      ]);

      if (settingsError) {
        setNotice({
          type: "error",
          text: settingsError.message,
        });

        setLoading(false);
        return;
      }

      if (connectionError) {
        setNotice({
          type: "error",
          text: connectionError.message,
        });

        setLoading(false);
        return;
      }

      const savedProvider =
        (connectionData?.provider as ProviderId | null) ??
        (settingsData?.payment_provider as ProviderId | null);

      setSelectedProvider(savedProvider ?? null);

      setConnectionStatus(
        (connectionData?.connection_status as
          | ConnectionStatus
          | null) ?? null
      );

      setMerchantReference(
        connectionData?.merchant_reference ?? null
      );

      setHasSavedCredentials(
        !!connectionData?.credentials_secret_id
      );

      setLoading(false);
    }

    void loadPaymentProvider();
  }, [salonId]);

  async function selectProvider(provider: Provider) {
    if (!salonId) {
      return;
    }

    setSaving(true);
    setNotice(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setSaving(false);

      setNotice({
        type: "error",
        text: "Your login session could not be verified.",
      });

      return;
    }

    const previousProvider = selectedProvider;

    const response = await fetch(
      "/api/payments/provider",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: provider.id,
        }),
      }
    );

    const data = await response.json();

    setSaving(false);

    if (!response.ok) {
      setNotice({
        type: "error",
        text:
          data.error ||
          "Could not save payment provider.",
      });

      return;
    }

    const providerChanged =
      previousProvider !== provider.id;

    setSelectedProvider(provider.id);

    setConnectionStatus(
      (data.connectionStatus as ConnectionStatus) ??
        "not_configured"
    );

    if (providerChanged) {
      setMerchantReference(null);
      setHasSavedCredentials(false);
      setCredentialValues({});
    }

    setNotice({
      type: "success",
      text: `${provider.name} has been saved as your payment provider.`,
    });
  }

  function updateCredential(
    key: string,
    value: string
  ) {
    setCredentialValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function savePaymentDetails(
    provider: Provider
  ) {
    const credentials = Object.fromEntries(
      provider.fields.map((field) => [
        field.key,
        credentialValues[field.key]?.trim() ?? "",
      ])
    );

    const missingField = provider.fields.find(
      (field) => !credentials[field.key]
    );

    if (missingField) {
      setNotice({
        type: "error",
        text: `Enter your ${missingField.label}.`,
      });

      return;
    }

    setSavingCredentials(true);
    setNotice(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setSavingCredentials(false);

      setNotice({
        type: "error",
        text: "Your login session could not be verified.",
      });

      return;
    }

    const response = await fetch(
      "/api/payments/credentials",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentials,
        }),
      }
    );

    const data = await response.json();

    setSavingCredentials(false);

    if (!response.ok) {
      setNotice({
        type: "error",
        text:
          data.error ||
          "Could not save payment details.",
      });

      return;
    }

    setCredentialValues({});
    setHasSavedCredentials(true);

    setNotice({
      type: "success",
      text:
        `${provider.name} payment details have been saved securely.`,
    });
  }

  async function verifyPaymentDetails() {
    setVerifying(true);
    setNotice(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setVerifying(false);

      setNotice({
        type: "error",
        text: "Your login session could not be verified.",
      });

      return;
    }

    const response = await fetch(
      "/api/payments/verify",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    setVerifying(false);

    if (!response.ok) {
      setConnectionStatus("error");

      setNotice({
        type: "error",
        text:
          data.error ||
          "Could not verify your payment details.",
      });

      return;
    }

    setConnectionStatus("connected");

    setMerchantReference(
      data.merchantReference ?? null
    );

    setNotice({
      type: "success",
      text:
        "Payment details verified. Online payments are now active.",
    });
  }

  const selected = providers.find(
    (provider) =>
      provider.id === selectedProvider
  );

  const isConnected =
    connectionStatus === "connected";

  return (
    <section className="space-y-6">
      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
          Loading payment settings...
        </div>
      )}

      {notice && (
        <div
          className={`rounded-2xl border p-4 ${
            notice.type === "error"
              ? "border-red-500/30 bg-red-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <p
            className={`font-black ${
              notice.type === "error"
                ? "text-red-400"
                : "text-emerald-400"
            }`}
          >
            {notice.type === "success"
              ? "✓ "
              : ""}
            {notice.text}
          </p>
        </div>
      )}

      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
          Payments
        </p>

        <h1 className="mt-2 text-3xl font-black text-white">
          Payment Provider
        </h1>

        <p className="mt-2 max-w-2xl text-slate-400">
          Choose the payment provider used by your salon.
          TanSalonOS will show the correct setup details for
          that provider.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const active =
            selectedProvider === provider.id;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => {
                void selectProvider(provider);
              }}
              disabled={saving}
              className={`rounded-2xl border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {provider.name}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {provider.description}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">
                  {provider.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                Selected Provider
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                {selected.name}
              </h2>
            </div>

            {selected.fields.length > 0 && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  isConnected
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-amber-400/15 text-amber-300"
                }`}
              >
                {isConnected
                  ? "Connected"
                  : "Setup required"}
              </span>
            )}
          </div>

          {isConnected &&
            selected.fields.length > 0 && (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <p className="font-black text-emerald-300">
                  ✓ Payment connection active
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  This salon is connected to{" "}
                  {selected.name}.
                </p>

                {merchantReference ===
                  "legacy_env" && (
                  <p className="mt-2 text-xs text-slate-500">
                    Existing payment connection active.
                  </p>
                )}
              </div>
            )}

          {!isConnected &&
            selected.fields.length > 0 && (
              <div className="mt-6 space-y-5">
                <div>
                  <h3 className="text-xl font-black text-white">
                    Set up {selected.name}
                  </h3>

                  {selected.note && (
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                      {selected.note}
                    </p>
                  )}
                </div>

                {hasSavedCredentials && (
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
                    Payment details are already saved
                    securely. Re-enter them only if you
                    want to replace them.
                  </div>
                )}

                <div className="grid gap-4">
                  {selected.fields.map((field) => (
                    <label
                      key={`${selected.id}-${field.key}`}
                      className="space-y-2"
                    >
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                        {field.label}
                      </span>

                      {field.options ? (
  <select
    value={
      credentialValues[
        field.key
      ] ?? ""
    }
    onChange={(event) =>
      updateCredential(
        field.key,
        event.target.value
      )
    }
    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
  >
    <option value="">
      {field.placeholder}
    </option>

    {field.options.map((option) => (
      <option
        key={option.value}
        value={option.value}
      >
        {option.label}
      </option>
    ))}
  </select>
) : (
  <input
    type={
      field.secret
        ? "password"
        : "text"
    }
    value={
      credentialValues[
        field.key
      ] ?? ""
    }
    onChange={(event) =>
      updateCredential(
        field.key,
        event.target.value
      )
    }
    autoComplete="off"
    placeholder={
      field.placeholder
    }
    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
  />
)}
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void savePaymentDetails(
                        selected
                      );
                    }}
                    disabled={
                      savingCredentials ||
                      verifying
                    }
                    className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCredentials
                      ? "Saving..."
                      : "Save payment details"}
                  </button>

                  {hasSavedCredentials && (
                    <button
                      type="button"
                      onClick={() => {
                        void verifyPaymentDetails();
                      }}
                      disabled={
                        savingCredentials ||
                        verifying
                      }
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 font-black text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {verifying
                        ? "Verifying..."
                        : "Verify & activate"}
                    </button>
                  )}
                </div>
              </div>
            )}

          {selected.id === "manual" && (
            <p className="mt-4 text-slate-300">
              Use whichever physical card terminal your
              salon already has. TanSalonOS records the
              transaction as a card payment.
            </p>
          )}

          {selected.id === "other" && (
            <p className="mt-4 text-slate-300">
              Use this option if your salon uses a payment
              provider outside the standard TanSalonOS
              connectors.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
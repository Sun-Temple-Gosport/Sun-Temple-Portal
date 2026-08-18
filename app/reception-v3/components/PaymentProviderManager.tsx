"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ProviderId =
  | "sumup"
  | "stripe"
  | "square"
  | "zettle"
  | "dojo"
  | "worldpay"
  | "manual"
  | "other";

type ConnectionStatus =
  | "not_configured"
  | "connected"
  | "error";

type Provider = {
  id: ProviderId;
  name: string;
  description: string;
  available: boolean;
};

type Notice = {
  type: "success" | "error";
  text: string;
};

const providers: Provider[] = [
  {
    id: "sumup",
    name: "SumUp",
    description: "Accept online payments using SumUp.",
    available: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept cards and online payments through Stripe.",
    available: false,
  },
  {
    id: "square",
    name: "Square",
    description: "Connect your Square payment account.",
    available: false,
  },
  {
    id: "zettle",
    name: "Zettle",
    description: "Connect PayPal Zettle payments.",
    available: false,
  },
  {
    id: "dojo",
    name: "Dojo",
    description: "Connect your Dojo payment service.",
    available: false,
  },
  {
    id: "worldpay",
    name: "Worldpay",
    description: "Connect a Worldpay merchant account.",
    available: false,
  },
  {
    id: "manual",
    name: "In-store payments only",
    description:
      "Do not accept online payments. Customers pay directly at the salon.",
    available: true,
  },
  {
    id: "other",
    name: "Other provider",
    description: "Tell us which payment provider your salon uses.",
    available: true,
  },
];

export default function PaymentProviderManager() {
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderId | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);

  const [merchantReference, setMerchantReference] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCredentials, setSavingCredentials] =
    useState(false);
  const [verifying, setVerifying] = useState(false);

  const [notice, setNotice] = useState<Notice | null>(null);

  const [salonId, setSalonId] = useState<string | null>(
    null
  );

  const [sumupApiKey, setSumupApiKey] = useState("");
  const [sumupMerchantCode, setSumupMerchantCode] =
    useState("");

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
      if (!salonId) return;

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
            "provider, connection_status, merchant_reference"
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

      setLoading(false);
    }

    void loadPaymentProvider();
  }, [salonId]);

  async function selectProvider(provider: Provider) {
    if (!provider.available || !salonId) {
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

    const response = await fetch("/api/payments/provider", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider: provider.id,
      }),
    });

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
      selectedProvider !== provider.id;

    setSelectedProvider(provider.id);

    setConnectionStatus(
      (data.connectionStatus as ConnectionStatus) ??
        "not_configured"
    );

    if (providerChanged) {
      setMerchantReference(null);
    }

    setSumupApiKey("");
    setSumupMerchantCode("");

    setNotice({
      type: "success",
      text: `${provider.name} has been saved as your payment provider.`,
    });
  }

  async function saveSumupPaymentDetails() {
    if (!sumupApiKey.trim() || !sumupMerchantCode.trim()) {
      setNotice({
        type: "error",
        text: "Enter both your SumUp API key and merchant code.",
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
          credentials: {
            api_key: sumupApiKey,
            merchant_code: sumupMerchantCode,
          },
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

    setSumupApiKey("");
    setSumupMerchantCode("");

    setNotice({
      type: "success",
      text:
        "Payment details have been saved securely. They now need to be verified before online payments are activated.",
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

    const response = await fetch("/api/payments/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });

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
    (provider) => provider.id === selectedProvider
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
            {notice.type === "success" ? "✓ " : ""}
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
          Choose how your salon accepts customer payments.
          Your online payment details are stored securely and
          belong only to your salon.
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
              disabled={!provider.available || saving}
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

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                    provider.available
                      ? "bg-emerald-400/15 text-emerald-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {provider.available
                    ? "Available"
                    : "Coming Soon"}
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

            {selected.id !== "manual" &&
              selected.id !== "other" && (
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

          {selected.id === "sumup" &&
            isConnected && (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <p className="font-black text-emerald-300">
                  ✓ Online payments connected
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  Your salon is configured to accept online
                  payments through SumUp.
                </p>

                {merchantReference === "legacy_env" && (
                  <p className="mt-2 text-xs text-slate-500">
                    Existing payment connection active.
                  </p>
                )}
              </div>
            )}

          {selected.id === "sumup" &&
            !isConnected && (
              <div className="mt-6 space-y-5">
                <div>
                  <h3 className="text-xl font-black text-white">
                    Set up payment details
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    Enter the payment details supplied by
                    SumUp for your business. These details are
                    stored securely and are never shown back
                    on this screen.
                  </p>
                </div>

                <div className="grid gap-4">
                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      API Key
                    </span>

                    <input
                      type="password"
                      value={sumupApiKey}
                      onChange={(event) =>
                        setSumupApiKey(
                          event.target.value
                        )
                      }
                      autoComplete="off"
                      placeholder="Enter your SumUp API key"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Merchant Code
                    </span>

                    <input
                      type="text"
                      value={sumupMerchantCode}
                      onChange={(event) =>
                        setSumupMerchantCode(
                          event.target.value
                        )
                      }
                      autoComplete="off"
                      placeholder="Enter your SumUp merchant code"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void saveSumupPaymentDetails();
                    }}
                    disabled={
                      savingCredentials || verifying
                    }
                    className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCredentials
                      ? "Saving..."
                      : "Save payment details"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void verifyPaymentDetails();
                    }}
                    disabled={
                      savingCredentials || verifying
                    }
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 font-black text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {verifying
                      ? "Verifying..."
                      : "Verify & activate"}
                  </button>
                </div>
              </div>
            )}

          {selected.id === "manual" && (
            <p className="mt-3 text-slate-300">
              Your salon can use any card terminal or payment
              provider in store. TanSalonOS will record the
              transaction as a card payment, but online
              customer checkout is disabled.
            </p>
          )}

          {selected.id === "other" && (
            <div className="mt-5">
              <p className="text-slate-300">
                This option records that your salon uses a
                different payment provider. Online checkout
                requires a supported TanSalonOS payment
                connector.
              </p>
            </div>
          )}

          {!selected.available && (
            <p className="mt-3 text-slate-400">
              Support for this provider is coming soon.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
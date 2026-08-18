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

type Provider = {
  id: ProviderId;
  name: string;
  description: string;
  available: boolean;
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
    const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [message, setMessage] = useState("");
const [salonId, setSalonId] = useState<string | null>(null);

useEffect(() => {
  async function loadCurrentSalon() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Could not determine the logged-in user.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("salon_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.salon_id) {
      setMessage(
        profileError?.message || "Could not determine the current salon."
      );
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
    setMessage("");

    const { data, error } = await supabase
      .from("salon_settings")
      .select("payment_provider")
      .eq("salon_id", salonId)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const savedProvider = data?.payment_provider as ProviderId | null;

    setSelectedProvider(savedProvider ?? null);
    setLoading(false);
  }

  void loadPaymentProvider();
}, [salonId]);

async function selectProvider(provider: Provider) {
  if (!provider.available || !salonId) {
    return;
  }

  setSaving(true);
  setMessage("");

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    setSaving(false);
    setMessage("Your login session could not be verified.");
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
    setMessage(data.error || "Could not save payment provider.");
    return;
  }

  setSelectedProvider(provider.id);
  setMessage(
    `${provider.name} has been saved as your payment provider.`
  );
}
  const selected = providers.find(
    (provider) => provider.id === selectedProvider
  );

  return (
    <section className="space-y-6">
        {loading && (
  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
    Loading payment settings...
  </div>
)}

{message && (
  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
    <p className="font-black text-emerald-400">
      ✓ {message}
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
          Choose how your salon accepts customer payments. You can change your
          payment provider later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const active = selectedProvider === provider.id;

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
                  {provider.available ? "Available" : "Coming Soon"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            Selected Provider
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {selected.name}
          </h2>

          {!selected.available && (
            <p className="mt-3 text-slate-400">
              Support for this provider is coming soon.
            </p>
          )}

          {selected.id === "sumup" && (
            <p className="mt-3 text-slate-300">
              SumUp integration is available and will be connected to your
              existing online checkout in the next step.
            </p>
          )}

          {selected.id === "manual" && (
            <p className="mt-3 text-slate-300">
              Online checkout will be disabled. Customers will pay directly at
              your salon.
            </p>
          )}

          {selected.id === "other" && (
            <div className="mt-5">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Provider Name
                </span>

                <input
                  type="text"
                  placeholder="Enter payment provider"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
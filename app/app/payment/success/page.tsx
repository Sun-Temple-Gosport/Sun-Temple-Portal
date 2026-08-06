"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export default function PaymentSuccess() {
  const [salonName, setSalonName] = useState("Sun Temple Gosport");
const [tagline, setTagline] = useState("");
const [logoUrl, setLogoUrl] = useState<string | null>(null);
useEffect(() => {
  async function loadBranding() {
    const { data, error } = await supabase
      .from("salon_settings")
      .select("salon_name, tagline, logo_url")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Could not load salon branding:", error.message);
      return;
    }

    if (!data) return;

    setSalonName(data.salon_name || "Sun Temple Gosport");
    setTagline(data.tagline || "");
    setLogoUrl(data.logo_url || null);
  }

  void loadBranding();
}, []);
  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      <div className="flex flex-col items-center">
  {logoUrl ? (
    <img
      src={logoUrl}
      alt={`${salonName} logo`}
      className="h-24 w-24 rounded-2xl bg-[#111] object-cover"
    />
  ) : (
    <span className="text-5xl">☀️</span>
  )}

  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
    {salonName}
  </p>

  <h1 className="mt-4 text-5xl font-bold">
    Thank you!
  </h1>

  {tagline && (
    <p className="mt-4 text-zinc-400">
      {tagline}
    </p>
  )}

  <p className="mt-6 text-lg text-zinc-400">
    Your payment is being confirmed. Your tanning minutes will be added to your account shortly.
  </p>

  <a
    href="/buy-minutes"
    className="mt-10 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
  >
    Back to packages
  </a>
</div>
    </main>
  );
}
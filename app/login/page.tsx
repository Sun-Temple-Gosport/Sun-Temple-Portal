"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [salonName, setSalonName] = useState("Your Salon");
const [tagline, setTagline] = useState("");
const [logoUrl, setLogoUrl] = useState<string | null>(null);
const [salonSlug, setSalonSlug] = useState("");

useEffect(() => {
  async function loadBranding() {
    const params = new URLSearchParams(window.location.search);

    const hostname = window.location.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    const salonFromUrl = params.get("salon")?.trim().toLowerCase();

    let requestedSalonSlug = salonFromUrl || "";

    // Explicit salon parameter always wins.
    // Known customer domains are only used when no salon was supplied.
    if (!requestedSalonSlug) {
      if (hostname === "mysuntemple.co.uk") {
        requestedSalonSlug = "sun-temple-gosport";
      } else if (hostname === "localhost") {
        requestedSalonSlug = "sun-temple-gosport";
      }
    }

    if (!requestedSalonSlug) {
      console.error(
        "Could not load salon branding: no salon could be resolved for this URL."
      );
      return;
    }

    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("id, slug")
      .eq("slug", requestedSalonSlug)
      .eq("active", true)
      .maybeSingle();

    if (salonError || !salon) {
      console.error(
        "Could not load salon branding:",
        salonError?.message || "Salon was not found."
      );
      return;
    }

    setSalonSlug(salon.slug);

    const { data: settings, error: settingsError } = await supabase
      .from("salon_settings")
      .select("salon_name, tagline, logo_url")
      .eq("salon_id", salon.id)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Could not load salon branding:",
        settingsError.message
      );
      return;
    }

    if (!settings) {
      console.error(
        `Salon "${salon.slug}" exists but has no salon_settings row.`
      );
      return;
    }

    setSalonName(settings.salon_name || "Your Salon");
    setTagline(settings.tagline || "");
    setLogoUrl(settings.logo_url || null);
  }

  void loadBranding();
}, []);

 async function login() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });


  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "/my-minutes";


  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
      <section className="mx-auto max-w-md">
        <div className="flex items-center gap-4">
  {logoUrl ? (
    <img
      src={logoUrl}
      alt={`${salonName} logo`}
      className="h-26 w-26 rounded-xl object-cover"
    />
  ) : (
    <span className="text-4xl">☀️</span>
  )}

  <div>
    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
      {salonName}
    </p>

    <h1 className="mt-2 text-5xl font-bold">Customer Login</h1>
  </div>
</div>

{tagline && (
  <p className="mt-4 text-zinc-400">
    {tagline}
  </p>
)}

        <div className="mt-10 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

            <button
              onClick={login}
              className="w-full rounded-full bg-[#d6a84f] py-3 font-bold text-black hover:opacity-90"
            >
              Login
            </button>
            <div className="flex justify-end">
  <Link
  href={
    salonSlug
      ? `/forgot-password?salon=${salonSlug}`
      : "/forgot-password"
  }
  className="text-sm font-medium text-[#d6a84f] hover:underline"
>
  Forgot your password?
</Link>
</div>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-400">
  New customer?{" "}
  <Link
  href={salonSlug ? `/register?salon=${salonSlug}` : "/register"}
  className="font-semibold text-[#d6a84f] hover:underline"
>
  Create an account
</Link>
</p>
        </div>
      </section>
    </main>
  );
}
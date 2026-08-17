"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOver18, setIsOver18] = useState(false);
  const [loading, setLoading] = useState(false);
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
    // These fallbacks only identify known customer-facing domains.
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

    if (salonError) {
      console.error(
        "Could not load salon:",
        salonError.message
      );
      return;
    }

    if (!salon) {
      console.error(
        `Could not load salon: "${requestedSalonSlug}" was not found.`
      );
      return;
    }

    // Set this as soon as the salon is identified.
    // Registration can then safely attach the correct salon_slug.
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

  async function register() {
    if (!fullName.trim() || !email.trim() || !password) {
      alert("Please enter your name, email address and password.");
      return;
    }

    if (!isOver18) {
      alert("You must confirm that you are aged 18 or over.");
      return;
    }

    if (!salonSlug) {
      alert(
        "This salon could not be identified. Please return to the salon login page and try again."
      );
      return;
    }

    setLoading(true);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          phone: cleanPhone,
          salon_slug: salonSlug,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (!data.user) {
      alert("Your account could not be created. Please try again.");
      return;
    }

    if (!data.session) {
      alert(
        "Account created. Please check your email to confirm your account before logging in."
      );

      window.location.href = `/login?salon=${encodeURIComponent(
        salonSlug
      )}`;

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
              className="h-24 w-24 rounded-2xl bg-[#111] object-cover"
            />
          ) : (
            <span className="text-5xl">☀️</span>
          )}

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
              {salonName}
            </p>

            <h1 className="mt-2 text-5xl font-bold">
              Create Your Account
            </h1>
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
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

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

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2a2a2a] p-4 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isOver18}
                onChange={(e) => setIsOver18(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#d6a84f]"
              />

              <span>I confirm that I am aged 18 or over.</span>
            </label>

            <button
              type="button"
              onClick={register}
              disabled={loading}
              className="w-full rounded-full bg-[#d6a84f] py-3 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Your Account"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href={
                salonSlug
                  ? `/login?salon=${salonSlug}`
                  : "/login"
              }
              className="font-semibold text-[#d6a84f] hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
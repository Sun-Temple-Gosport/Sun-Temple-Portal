"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [salonName, setSalonName] = useState("Your Salon");
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

    setSalonName(data.salon_name || "Your Salon");
    setTagline(data.tagline || "");
    setLogoUrl(data.logo_url || null);
  }

  void loadBranding();
}, []);

  async function resetPassword() {
    if (!email.trim()) {
      alert("Please enter your email address.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "If an account exists with that email address, a password reset email has been sent."
    );
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

    <h1 className="mt-2 text-5xl font-bold">Forgot Password</h1>
  </div>
</div>

{tagline && (
  <p className="mt-4 text-zinc-400">
    {tagline}
  </p>
)}

        <p className="mt-4 text-zinc-400">
          Enter your email address and we'll send you a password reset link.
        </p>

        <div className="mt-10 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

            <button
              type="button"
              onClick={resetPassword}
              disabled={loading}
              className="w-full rounded-full bg-[#d6a84f] py-3 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Password Reset Email"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Remembered your password?{" "}
            <Link
              href="/login"
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
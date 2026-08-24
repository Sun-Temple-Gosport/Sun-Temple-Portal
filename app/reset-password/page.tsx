"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [salonName, setSalonName] = useState("Your Salon");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [salonSlug, setSalonSlug] = useState("");

  useEffect(() => {
    async function loadBranding() {
      const params = new URLSearchParams(window.location.search);
      const requestedSalonSlug = params.get("salon");

      let salon: {
        id: string;
        slug: string;
      } | null = null;

      if (requestedSalonSlug) {
        const { data, error } = await supabase
          .from("salons")
          .select("id, slug")
          .eq("slug", requestedSalonSlug.toLowerCase())
          .eq("active", true)
          .maybeSingle();

        if (error || !data) {
          console.error(
            "Could not load salon branding:",
            error?.message || "Salon was not found."
          );
          return;
        }

        salon = data;
      } else {
  setSalonName("TanSalonOS");
  return;
}

      const { data, error } = await supabase
        .from("salon_settings")
        .select("salon_name, tagline, logo_url")
        .eq("salon_id", salon.id)
        .maybeSingle();

      if (error) {
        console.error("Could not load salon branding:", error.message);
        return;
      }

      setSalonSlug(salon.slug);

      if (!data) return;

      setSalonName(data.salon_name || "Your Salon");
      setTagline(data.tagline || "");
      setLogoUrl(data.logo_url || null);
    }

    void loadBranding();
  }, []);

  async function updatePassword() {
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPassword("");
setConfirmPassword("");
setMessage("Password updated successfully.");

const {
  data: { user },
} = await supabase.auth.getUser();

let destination = salonSlug
  ? `/login?salon=${encodeURIComponent(salonSlug)}`
  : "/login";

if (user) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role?.toLowerCase();

  if (role === "owner" || role === "staff") {
    destination = "/staff-login";
  }
}

await supabase.auth.signOut();

window.setTimeout(() => {
  router.push(destination);
  router.refresh();
}, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${salonName} logo`}
                className="h-24 w-24 rounded-2xl bg-slate-950 object-cover"
              />
            ) : (
              <span className="text-5xl">☀️</span>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">
                {salonName}
              </p>

              <h1 className="mt-2 text-4xl font-black text-white">
                Reset Password
              </h1>
            </div>
          </div>

          {tagline && (
            <p className="mt-4 text-sm text-slate-400">
              {tagline}
            </p>
          )}

          <p className="mt-4 text-sm text-slate-400">
            Enter your new password below.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            disabled={saving}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400 disabled:opacity-60"
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            disabled={saving}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void updatePassword();
              }
            }}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={updatePassword}
            disabled={saving}
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>

          {message && (
            <p
              className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold ${
                message === "Password updated successfully."
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                  : "border-red-500/50 bg-red-950/40 text-red-300"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
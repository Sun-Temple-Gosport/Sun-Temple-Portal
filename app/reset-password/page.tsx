"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

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

    window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-amber-400">
            Sun Temple
          </p>

          <h1 className="text-3xl font-black text-white">
            Reset Password
          </h1>

          <p className="mt-3 text-sm text-slate-400">
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
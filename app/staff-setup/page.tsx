"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../reception-v3/lib/supabase";

export default function StaffSetupPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setHasSession(Boolean(session));

      if (!session) {
        setMessage(
          "This invitation link is invalid or has expired. Please ask the owner to send a new invitation."
        );
      }

      setCheckingSession(false);
    }

    checkSession();
  }, []);

  async function setStaffPassword() {
    if (password.length < 8) {
      setMessage("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setSaving(false);
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut();

    setMessage("Password created successfully. Redirecting to staff login...");

    window.setTimeout(() => {
      router.replace("/staff-login");
    }, 1500);
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <p className="text-sm font-bold text-slate-300">
          Checking invitation...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-7 text-center">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-amber-400">
            Sun Temple Gosport
          </p>

          <h1 className="text-3xl font-black text-white">
            Create Staff Password
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Choose the password you will use to access Reception.
          </p>
        </div>

        {hasSession && (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                New Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={setStaffPassword}
              disabled={saving}
              className="w-full rounded-xl bg-amber-400 py-3 font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving Password..." : "Create Password"}
            </button>
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm font-semibold text-slate-200">
            {message}
          </div>
        )}
      </section>
    </main>
  );
}
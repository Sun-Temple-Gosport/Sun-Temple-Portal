"use client";

import { useEffect, useState } from "react";
import { supabase } from "../reception-v3/lib/supabase";

export default function PlatformAdminPage() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [salonName, setSalonName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkPlatformAccess() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !session?.access_token
        ) {
          setAccessMessage(
            "You must be logged in to access Platform Admin."
          );
          setCheckingAccess(false);
          return;
        }

        const response = await fetch(
          "/api/platform/me",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          setAccessMessage(
            "You do not have access to Platform Admin."
          );
          setCheckingAccess(false);
          return;
        }

        setHasAccess(true);
      } catch (error) {
        console.error(
          "Platform access check error:",
          error
        );

        setAccessMessage(
          "Could not verify Platform Admin access."
        );
      } finally {
        setCheckingAccess(false);
      }
    }

    checkPlatformAccess();
  }, []);

  async function inviteOwner() {
    setMessage("");
    setSuccess(false);

    if (
      !salonName.trim() ||
      !fullName.trim() ||
      !email.trim()
    ) {
      setMessage(
        "Salon name, owner name and email are required."
      );
      return;
    }

    setSending(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        setMessage(
          "You must be logged in to TanSalonOS."
        );
        setSending(false);
        return;
      }

      const response = await fetch(
        "/api/platform/salons/invite-owner",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            salonName: salonName.trim(),
            fullName: fullName.trim(),
            email: email
              .trim()
              .toLowerCase(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.error ||
            "Could not send owner invitation."
        );
        return;
      }

      setSuccess(true);
      setMessage(
        result.message ||
          "Owner invitation sent successfully."
      );

      setSalonName("");
      setFullName("");
      setEmail("");
    } catch (error) {
      console.error(
        "Invite owner error:",
        error
      );

      setMessage(
        "Unexpected error sending owner invitation."
      );
    } finally {
      setSending(false);
    }
  }

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <p className="text-sm font-bold text-slate-300">
          Checking Platform Admin access...
        </p>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <section className="w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-900 p-7 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
            Access Denied
          </p>

          <h1 className="mt-2 text-2xl font-black text-white">
            Platform Admin
          </h1>

          <p className="mt-3 text-sm font-semibold text-slate-400">
            {accessMessage}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
            TanSalonOS
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Platform Admin
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Create a new TanSalonOS salon and invite its first owner.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                Salon Name
              </label>

              <input
                type="text"
                value={salonName}
                onChange={(event) =>
                  setSalonName(event.target.value)
                }
                placeholder="e.g. Glow Tanning Studio"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                TanSalonOS will create the salon automatically.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                Owner Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder="e.g. Jane Smith"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                Owner Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="owner@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={inviteOwner}
              disabled={sending}
              className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? "Creating Salon & Sending Invitation..."
                : "Create Salon & Send Invitation"}
            </button>
          </div>

          {message && (
            <div
              className={`mt-5 rounded-xl border p-4 text-sm font-semibold ${
                success
                  ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                  : "border-red-500/40 bg-red-950/30 text-red-200"
              }`}
            >
              {message}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
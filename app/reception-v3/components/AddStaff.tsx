"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddStaff({
  open,
  onClose,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    setFullName("");
    setEmail("");
    setMessage("");
    setSaving(false);
  }, [open]);

  if (!open) return null;

  async function createStaff() {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setMessage("Please enter the staff member's full name.");
      return;
    }

    if (!trimmedEmail) {
      setMessage("Please enter an email address.");
      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      setMessage("Your login session has expired.");
      return;
    }

    const response = await fetch("/api/staff/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fullName: trimmedName,
        email: trimmedEmail,
      }),
    });

    const result = await response.json();

    setSaving(false);

    if (!response.ok) {
      setMessage(result.error || "Unable to create staff member.");
      return;
    }

    setMessage("Staff invitation sent successfully.");

    setFullName("");
    setEmail("");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl">

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">
            Add Staff Member
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1 text-sm font-bold text-slate-300 hover:border-amber-400 hover:text-amber-400"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-amber-400"
            />
          </div>

          {message && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-semibold text-slate-200">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={createStaff}
            disabled={saving}
            className="w-full rounded-xl bg-amber-400 py-3 font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Staff Member"}
          </button>

          <p className="text-sm text-slate-400">
            The staff member will receive an invitation email to create their own password.
          </p>

        </div>
      </div>
    </div>
  );
}
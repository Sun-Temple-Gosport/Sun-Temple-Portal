"use client";

import { useState } from "react";

type Props = {
  onCreateCustomer: (customer: {
    full_name: string;
    phone: string;
    email: string;
  }) => Promise<void>;
};

export default function NewCustomer({ onCreateCustomer }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!fullName.trim()) {
      alert("Customer name is required");
      return;
    }

    setSaving(true);

    try {
      await onCreateCustomer({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });

      setFullName("");
      setPhone("");
      setEmail("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold text-white">New Customer</h2>

      <div className="grid gap-3">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none"
        />

        {email.trim() && (
  <div className="mt-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
    <p className="font-semibold">📧 Online Account</p>
    <p className="mt-1">
      Please ensure the customer's email address is correct.
      This email will be used by the customer to activate their
      online account by selecting <strong>"Forgot Password"</strong>
       on the customer portal.
    </p>
  </div>
)}

        <button
          onClick={handleCreate}
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Customer"}
        </button>
      </div>
    </section>
  );
}
"use client";

import { useEffect, useState } from "react";
import type { CustomerBalance } from "../types";

type Props = {
  open: boolean;
  customer: CustomerBalance | null;
  onClose: () => void;
  onSave: (
    full_name: string,
    phone: string,
    email: string
  ) => Promise<void>;
};

export default function EditCustomer({
  open,
  customer,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!customer) return;

    setName(customer.full_name || "");
    setPhone(customer.phone || "");
    setEmail(customer.email || "");
  }, [customer]);

  if (!open || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">

        <h2 className="text-2xl font-black text-white">
          Edit Customer
        </h2>

        <div className="mt-6 space-y-4">

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          />

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          />

        </div>

        <div className="mt-6 flex justify-end gap-3">

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-300"
          >
            Cancel
          </button>

          <button
            onClick={() => onSave(name, phone, email)}
            className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-black"
          >
            Save Changes
          </button>

        </div>
      </div>
    </div>
  );
}
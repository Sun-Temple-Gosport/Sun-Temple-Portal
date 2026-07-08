"use client";

import type { CustomerBalance, Sale } from "../types";
import { formatExpiry } from "../utils";

type PackageOption = {
  id: string | number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean | null;
};

type Props = {
  selectedCustomer: CustomerBalance | null;
  manualAdd: string;
  setManualAdd: (value: string) => void;
  onAddMinutes: (sale?: Sale) => Promise<void>;
  packages: PackageOption[];
};

export default function CustomerCard({
  selectedCustomer,
  manualAdd,
  setManualAdd,
  onAddMinutes,
  packages,
}: Props) {
  if (!selectedCustomer) return null;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
          Customer Control
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          {selectedCustomer.full_name || "Unnamed Customer"}
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          {selectedCustomer.email || "No email"} ·{" "}
          {selectedCustomer.phone || "No phone"}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white">
            {selectedCustomer.total_minutes} mins Available
          </span>

          <span className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200">
            Expires: {formatExpiry(selectedCustomer.next_expiry)}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
          Sell Package
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(packages.length > 0
  ? packages.filter((pack) => pack.active !== false && pack.minutes >= 30)
  : [
      { id: 30, minutes: 30, price: 19 },
      { id: 60, minutes: 60, price: 34 },
      { id: 90, minutes: 90, price: 47 },
      { id: 120, minutes: 120, price: 55 },
      { id: 240, minutes: 240, price: 100 },
    ]
).map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() =>
                  onAddMinutes({
  minutes: pack.minutes,
  amount: pack.price,
  description: `${pack.minutes} minute package`,
})
                }
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white hover:bg-emerald-400"
              >
                {pack.minutes} mins
                <br />£{pack.price}
              </button>
            ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
          Manual Minutes
        </p>

        <div className="flex gap-3">
          <input
            value={manualAdd}
            onChange={(e) => setManualAdd(e.target.value)}
            placeholder="Minutes"
            className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
          />

          <button
            type="button"
            onClick={() => onAddMinutes()}
            className="rounded-2xl bg-sky-500 px-5 py-3 font-black text-white hover:bg-sky-400"
          >
            Add
          </button>
        </div>
      </div>
    </section>
  );
}
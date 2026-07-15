"use client";

import type { CustomerBalance } from "../types";

type Props = {
  recentCustomers: CustomerBalance[];
  selectedCustomer: CustomerBalance | null;
  onSelectCustomer: (customer: CustomerBalance) => void;
};

export default function RecentCustomers({
  recentCustomers,
  selectedCustomer,
  onSelectCustomer,
}: Props) {
  if (recentCustomers.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
          Recently Used
        </p>

        <p className="hidden text-xs font-bold text-slate-500 sm:block">
          One-click customer select
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {recentCustomers.map((customer) => {
          const isSelected =
            selectedCustomer?.customer_id === customer.customer_id;

          return (
            <button
              key={customer.customer_id}
              type="button"
              onClick={() => onSelectCustomer(customer)}
              className={`min-w-[210px] rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${
                isSelected
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-slate-700 bg-slate-950 hover:border-amber-400 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-white">
                    {customer.full_name || "Unnamed Customer"}
                  </p>

                  <p className="mt-1 truncate text-xs font-medium text-slate-400">
                    {customer.phone || customer.email || "No contact"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-2xl font-black leading-none text-emerald-400">
                    {customer.total_minutes ?? 0}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    mins
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
"use client";

import type { CustomerBalance, CustomerHistory } from "../types";

type Props = {
  customer: CustomerBalance;
  history: CustomerHistory | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerHistory({
  customer,
  history,
}: Props) {
  if (!history) return null;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
        Customer History
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        {customer.full_name}
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-black uppercase text-slate-500">
            Last Visit
          </p>

          {history.lastVisit ? (
            <>
              <p className="mt-2 text-lg font-black text-white">
                {history.lastVisit.bed_name}
              </p>

              <p className="text-sm text-slate-400">
                {history.lastVisit.minutes} mins
              </p>

              <p className="text-sm text-slate-500">
                {formatDate(history.lastVisit.started_at)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No visits recorded
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs font-black uppercase text-slate-500">
            Lifetime
          </p>

          <div className="mt-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Visits</span>
              <span className="font-black text-white">
                {history.totalVisits}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Minutes Bought</span>
              <span className="font-black text-white">
                {history.totalMinutesPurchased}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Total Spent</span>
              <span className="font-black text-emerald-400">
                £{history.totalSpent.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <p className="mb-3 text-xs font-black uppercase text-slate-500">
          Recent Purchases
        </p>

        {history.purchases.length === 0 ? (
          <p className="text-sm text-slate-500">
            No purchases recorded.
          </p>
        ) : (
          <div className="space-y-2">
            {history.purchases.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2"
              >
                <div>
                  <p className="font-bold text-white">
                    {sale.minutes} mins
                  </p>

                  <p className="text-xs text-slate-500">
                    {formatDate(sale.created_at)}
                  </p>
                </div>

                <p className="font-black text-emerald-400">
                  £{Number(sale.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
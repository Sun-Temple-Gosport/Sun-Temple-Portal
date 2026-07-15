"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CashUpRecord = {
  id: string;
  business_date: string;
  revenue: number | null;
  card_revenue: number | null;
  cash_revenue: number | null;
  complimentary_revenue: number | null;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null;
  packages_sold: number | null;
  minutes_sold: number | null;
  customers_today: number | null;
  sessions_today: number | null;
  created_at?: string | null;
};

function formatMoney(value: number | null) {
  return `£${Number(value ?? 0).toFixed(2)}`;
}

function formatBusinessDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatClosedTime(value?: string | null) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CashUpHistory() {
  const [cashUps, setCashUps] = useState<CashUpRecord[]>([]);
  const [selectedCashUp, setSelectedCashUp] =
    useState<CashUpRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadCashUps();
  }, []);

  async function loadCashUps() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("cash_ups")
      .select(
        `
          id,
          business_date,
          revenue,
          card_revenue,
          cash_revenue,
          complimentary_revenue,
          expected_cash,
          counted_cash,
          difference,
          packages_sold,
          minutes_sold,
          customers_today,
          sessions_today,
          created_at
        `
      )
      .order("business_date", { ascending: false });

    if (error) {
      console.error("Unable to load cash-up history:", error);
      setErrorMessage(error.message);
      setCashUps([]);
      setLoading(false);
      return;
    }

    setCashUps((data ?? []) as CashUpRecord[]);
    setLoading(false);
  }

  return (
    <>
      <section className="space-y-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
            Previous Cash-Ups
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
            History
          </h2>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Review every completed end-of-day cash-up.
          </p>
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 text-center shadow-xl shadow-black/10">
            <p className="text-lg font-black text-white">
              Loading cash-up history…
            </p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="rounded-[2rem] border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-lg font-black text-red-300">
              Cash-up history could not be loaded
            </p>

            <p className="mt-2 text-sm font-semibold text-red-200/70">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={loadCashUps}
              className="mt-5 rounded-full bg-amber-400 px-5 py-2 text-xs font-black uppercase tracking-wide text-black hover:bg-amber-300"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !errorMessage && cashUps.length === 0 && (
          <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 text-center shadow-xl shadow-black/10">
            <p className="text-xl font-black text-white">
              No completed cash-ups yet
            </p>

            <p className="mt-3 text-sm font-semibold text-slate-500">
              Completed end-of-day cash-ups will appear here.
            </p>
          </div>
        )}

        {!loading && !errorMessage && cashUps.length > 0 && (
          <div className="space-y-4">
            {cashUps.map((cashUp) => {
              const difference = Number(cashUp.difference ?? 0);
              const isBalanced = Math.abs(difference) < 0.01;

              return (
                <button
                  key={cashUp.id}
                  type="button"
                  onClick={() => setSelectedCashUp(cashUp)}
                  className="w-full rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 text-left shadow-xl shadow-black/10 transition hover:border-amber-400 hover:bg-slate-900 sm:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                        Business Date
                      </p>

                      <h3 className="mt-2 text-xl font-black text-white">
                        {formatBusinessDate(cashUp.business_date)}
                      </h3>

                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                        <p className="text-sm font-bold text-slate-400">
                          Revenue{" "}
                          <span className="text-lg font-black text-emerald-400">
                            {formatMoney(cashUp.revenue)}
                          </span>
                        </p>

                        <p className="text-sm font-bold text-slate-400">
                          Packages{" "}
                          <span className="font-black text-white">
                            {Number(cashUp.packages_sold ?? 0)}
                          </span>
                        </p>

                        <p className="text-sm font-bold text-slate-400">
                          Sessions{" "}
                          <span className="font-black text-white">
                            {Number(cashUp.sessions_today ?? 0)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      {isBalanced ? (
                        <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-400">
                          ✓ Balanced
                        </div>
                      ) : difference > 0 ? (
                        <div className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-black text-sky-400">
                          Over {formatMoney(difference)}
                        </div>
                      ) : (
                        <div className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-400">
                          Short {formatMoney(Math.abs(difference))}
                        </div>
                      )}

                      <p className="mt-4 text-xs font-black uppercase tracking-wide text-amber-400">
                        View Cash-Up →
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedCashUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-slate-700 bg-slate-950 p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
                  Completed Cash-Up
                </p>

                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  {formatBusinessDate(selectedCashUp.business_date)}
                </h2>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Closed {formatClosedTime(selectedCashUp.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCashUp(null)}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <DetailCard
                label="Revenue"
                value={formatMoney(selectedCashUp.revenue)}
              />
              <DetailCard
                label="Card Revenue"
                value={formatMoney(selectedCashUp.card_revenue)}
              />
              <DetailCard
                label="Cash Revenue"
                value={formatMoney(selectedCashUp.cash_revenue)}
              />
              <DetailCard
                label="Complimentary"
                value={formatMoney(selectedCashUp.complimentary_revenue)}
              />
              <DetailCard
                label="Expected Cash"
                value={formatMoney(selectedCashUp.expected_cash)}
              />
              <DetailCard
                label="Cash Counted"
                value={formatMoney(selectedCashUp.counted_cash)}
              />
              <DetailCard
                label="Packages Sold"
                value={String(selectedCashUp.packages_sold ?? 0)}
              />
              <DetailCard
                label="Minutes Sold"
                value={String(selectedCashUp.minutes_sold ?? 0)}
              />
              <DetailCard
                label="Customers"
                value={String(selectedCashUp.customers_today ?? 0)}
              />
              <DetailCard
                label="Sessions"
                value={String(selectedCashUp.sessions_today ?? 0)}
              />
            </div>

            <div className="mt-5">
              <DifferenceCard difference={Number(selectedCashUp.difference ?? 0)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function DifferenceCard({ difference }: { difference: number }) {
  const isBalanced = Math.abs(difference) < 0.01;

  if (isBalanced) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
          Cash Difference
        </p>

        <p className="mt-2 text-2xl font-black text-emerald-400">
          ✓ Balanced
        </p>
      </div>
    );
  }

  if (difference > 0) {
    return (
      <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">
          Cash Difference
        </p>

        <p className="mt-2 text-2xl font-black text-sky-400">
          Over {formatMoney(difference)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300">
        Cash Difference
      </p>

      <p className="mt-2 text-2xl font-black text-red-400">
        Short {formatMoney(Math.abs(difference))}
      </p>
    </div>
  );
}
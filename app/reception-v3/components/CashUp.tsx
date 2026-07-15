"use client";

import { useMemo, useState } from "react";
type CashUpSale = {
  id: string | number;
  customer_name: string | null;
  minutes: number;
  amount: number;
  payment_method: string | null;
  created_at: string;
};

type SaveCashUpData = {
  businessDate: string;
  revenue: number;
  cardRevenue: number;
  cashRevenue: number;
  complimentaryRevenue: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  packagesSold: number;
  minutesSold: number;
  customersToday: number;
  sessionsToday: number;
};

type Props = {
  revenueToday: number;
  cardRevenueToday: number;
  cashRevenueToday: number;
  complimentaryToday: number;
  salesToday: number;
  minutesSoldToday: number;
  customersToday: number;
  sessionsToday: number;
  sales: CashUpSale[];
  onSaveCashUp: (data: SaveCashUpData) => Promise<boolean>;
};

type SummaryCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  valueColour: string;
  icon: React.ReactNode;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}

function CardIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9.5a2 2 0 0 1-2 2" />
      <path d="M17 14.5a2 2 0 0 1 2-2" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M12 9v12" />
      <path d="M3 13h18" />
      <path d="M12 9H7.5A2.5 2.5 0 1 1 10 6.5Z" />
      <path d="M12 9h4.5A2.5 2.5 0 1 0 14 6.5Z" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="m4.5 7.8 7.5 4.3 7.5-4.3" />
      <path d="M12 12.1V21" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.42 1.42" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  valueColour,
  icon,
}: SummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/75 p-5 shadow-xl shadow-black/10">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              {title}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-600">
              {subtitle}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-300">
            {icon}
          </div>
        </div>

        <p
          className={`mt-7 text-4xl font-black tracking-[-0.04em] ${valueColour}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function CashUp({
  revenueToday,
  cardRevenueToday,
  cashRevenueToday,
  complimentaryToday,
  salesToday,
  minutesSoldToday,
  customersToday,
  sessionsToday,
  sales,
  onSaveCashUp,
}: Props) {
    const [cashCounted, setCashCounted] = useState("");
const [cashUpConfirmed, setCashUpConfirmed] = useState(false);
const [savingCashUp, setSavingCashUp] = useState(false);

const countedCash = Number(cashCounted || 0);

const cashDifference = useMemo(() => {
  if (!cashCounted.trim()) return 0;
  return countedCash - cashRevenueToday;
}, [cashCounted, countedCash, cashRevenueToday]);

const hasCashCount = cashCounted.trim() !== "";

const differenceLabel =
  cashDifference === 0
    ? "Balanced"
    : cashDifference > 0
      ? "Over"
      : "Short";

const differenceColour =
  !hasCashCount || cashDifference === 0
    ? "text-emerald-400"
    : "text-rose-400";
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  async function handleConfirmCashUp() {
  if (!hasCashCount || savingCashUp) return;

  setSavingCashUp(true);

  const success = await onSaveCashUp({
    businessDate: new Date().toISOString().slice(0, 10),
    revenue: revenueToday,
    cardRevenue: cardRevenueToday,
    cashRevenue: cashRevenueToday,
    complimentaryRevenue: complimentaryToday,
    expectedCash: cashRevenueToday,
    countedCash,
    difference: cashDifference,
    packagesSold: salesToday,
    minutesSold: minutesSoldToday,
    customersToday,
    sessionsToday,
  });

  setSavingCashUp(false);

  if (success) {
    setCashUpConfirmed(true);
  }
}

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
          End of Day
        </p>

        <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Cash-Up
        </h2>

        <p className="mt-2 text-sm font-medium text-slate-500">{today}</p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-amber-950/20 sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_1.2fr] xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Total Revenue
            </p>

            <p className="mt-6 text-6xl font-black tracking-[-0.06em] text-white sm:text-7xl lg:text-8xl">
              {formatMoney(revenueToday)}
            </p>

            <p className="mt-4 text-sm font-semibold text-slate-500">
              Total package revenue recorded today
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.07] p-4">
              <div className="flex items-center gap-3 text-sky-300">
                <CardIcon />

                <p className="text-[10px] font-black uppercase tracking-[0.06em]">
                  Card
                </p>
              </div>

              <p className="mt-5 text-3xl font-black tracking-tight text-sky-400">
                {formatMoney(cardRevenueToday)}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4">
              <div className="flex items-center gap-3 text-amber-300">
                <CashIcon />

                <p className="text-xs font-black uppercase tracking-[0.16em]">
                  Cash
                </p>
              </div>

              <p className="mt-5 text-3xl font-black tracking-tight text-amber-400">
                {formatMoney(cashRevenueToday)}
              </p>
            </div>

            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] p-4">
              <div className="flex items-center gap-3 text-violet-300">
                <GiftIcon />

                <p className="text-xs font-black uppercase tracking-[0.16em]">
                  Complimentary
                </p>
              </div>

              <p className="mt-5 text-3xl font-black tracking-tight text-violet-400">
                {formatMoney(complimentaryToday)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/[0.07] p-6 shadow-xl shadow-emerald-950/10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Expected Cash
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              Cash payments recorded in the system
            </p>
          </div>

          <p className="text-5xl font-black tracking-[-0.05em] text-emerald-400">
            {formatMoney(cashRevenueToday)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Packages Sold"
          value={salesToday}
          subtitle="Completed sales"
          valueColour="text-amber-400"
          icon={<PackageIcon />}
        />

        <SummaryCard
          title="Minutes Sold"
          value={minutesSoldToday.toLocaleString("en-GB")}
          subtitle="Package minutes"
          valueColour="text-violet-400"
          icon={<ClockIcon />}
        />

        <SummaryCard
          title="Customers"
          value={customersToday}
          subtitle="Unique tanning customers"
          valueColour="text-sky-400"
          icon={<UsersIcon />}
        />

        <SummaryCard
          title="Sessions"
          value={sessionsToday}
          subtitle="Beds started today"
          valueColour="text-rose-400"
          icon={<SunIcon />}
        />
      </div>
      <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/70 shadow-xl shadow-black/10">
  <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">
        Today&apos;s Sales
      </p>

      <h3 className="mt-1 text-xl font-black text-white">
        Transaction Breakdown
      </h3>
    </div>

    <p className="text-xs font-bold text-slate-500">
      {sales.length} {sales.length === 1 ? "transaction" : "transactions"}
    </p>
  </div>

  {sales.length === 0 ? (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-bold text-slate-400">
        No package sales recorded today.
      </p>
    </div>
  ) : (
    <div className="divide-y divide-slate-800">
      {sales.map((sale) => {
        const method = sale.payment_method?.toLowerCase() || "card";

        const paymentClass =
          method === "cash"
            ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
            : method === "complimentary"
              ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
              : "border-sky-500/20 bg-sky-500/10 text-sky-300";

        const paymentLabel =
          method === "cash"
            ? "Cash"
            : method === "complimentary"
              ? "Complimentary"
              : "Card";

        const saleTime = new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(sale.created_at));

        return (
          <div
            key={sale.id}
            className="grid gap-4 px-5 py-4 transition hover:bg-white/[0.02] sm:grid-cols-[80px_1fr_auto_auto] sm:items-center"
          >
            <p className="text-sm font-black text-slate-400">
              {saleTime}
            </p>

            <div>
              <p className="font-black text-white">
                {sale.customer_name || "Customer"}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                {sale.minutes} minute package
              </p>
            </div>

            <span
              className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${paymentClass}`}
            >
              {paymentLabel}
            </span>

            <p className="text-lg font-black text-white sm:min-w-[90px] sm:text-right">
              {formatMoney(sale.amount)}
            </p>
          </div>
        );
      })}
    </div>
  )}
</div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/70 shadow-xl shadow-black/10">
  <div className="border-b border-slate-800 px-5 py-5 sm:px-6">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
      Till Reconciliation
    </p>

    <h3 className="mt-1 text-xl font-black text-white">
      Count the Cash Drawer
    </h3>

    <p className="mt-2 text-sm font-semibold text-slate-500">
      Enter the physical cash counted at the end of the day.
    </p>
  </div>

  <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.07] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
        Expected Cash
      </p>

      <p className="mt-4 text-4xl font-black tracking-tight text-amber-400">
        {formatMoney(cashRevenueToday)}
      </p>

      <p className="mt-2 text-xs font-semibold text-slate-500">
        Cash sales recorded today
      </p>
    </div>

    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <label
        htmlFor="cash-counted"
        className="text-xs font-black uppercase tracking-[0.18em] text-slate-400"
      >
        Cash Counted
      </label>

      <div className="mt-4 flex items-center rounded-2xl border border-slate-700 bg-slate-950 px-4 focus-within:border-amber-400">
        <span className="text-2xl font-black text-slate-500">£</span>

        <input
          id="cash-counted"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={cashCounted}
          onChange={(event) => {
            setCashCounted(event.target.value);
            setCashUpConfirmed(false);
          }}
          placeholder="0.00"
          className="min-w-0 flex-1 bg-transparent px-3 py-4 text-3xl font-black text-white outline-none placeholder:text-slate-700"
        />
      </div>

      <p className="mt-2 text-xs font-semibold text-slate-500">
        Physical cash in the drawer
      </p>
    </div>

    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
        Difference
      </p>

      <p
        className={`mt-4 text-4xl font-black tracking-tight ${differenceColour}`}
      >
        {hasCashCount ? formatMoney(cashDifference) : "—"}
      </p>

      <p className={`mt-2 text-sm font-black ${differenceColour}`}>
        {hasCashCount ? differenceLabel : "Awaiting cash count"}
      </p>
    </div>
  </div>

  <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <div>
      <p className="text-sm font-black text-white">
        {cashUpConfirmed
          ? "Cash-up confirmed"
          : "Review the figures before confirming"}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        This confirmation is temporary until cash-up records are stored in the
        database.
      </p>
    </div>

    <button
  type="button"
  disabled={!hasCashCount || savingCashUp || cashUpConfirmed}
  onClick={handleConfirmCashUp}
  className={`rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${
    hasCashCount && !savingCashUp && !cashUpConfirmed
      ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
      : "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-600"
  }`}
>
  {savingCashUp
    ? "Saving..."
    : cashUpConfirmed
      ? "Cash-Up Saved"
      : "Confirm Cash-Up"}
</button>
  </div>
</div>
    </section>
  );
}
"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  revenueToday: number;
  cardRevenueToday: number;
  cashRevenueToday: number;
  complimentaryToday: number;
  minutesSoldToday: number;
  salesToday: number;
  customersToday: number;
  sessionsToday: number;
  bedsRunning: number;
  bedsFree: number;
  occupancy: number;
};

type IconName =
  | "card"
  | "cash"
  | "gift"
  | "package"
  | "clock"
  | "users"
  | "sun"
  | "bed"
  | "check"
  | "chart";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: IconName;
  valueColour: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(value);
}

function useAnimatedNumber(value: number, duration = 650) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const difference = value - startValue;
    const startTime = performance.now();

    let animationFrame = 0;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(startValue + difference * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
    // displayValue is deliberately excluded so animation starts from
    // the currently displayed figure whenever the actual value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return displayValue;
}

function DashboardIcon({ name }: { name: IconName }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const icons: Record<IconName, ReactNode> = {
    card: (
      <svg {...commonProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    ),
    cash: (
      <svg {...commonProps}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 9.5a2 2 0 0 1-2 2" />
        <path d="M17 14.5a2 2 0 0 1 2-2" />
      </svg>
    ),
    gift: (
      <svg {...commonProps}>
        <rect x="3" y="9" width="18" height="12" rx="2" />
        <path d="M12 9v12" />
        <path d="M3 13h18" />
        <path d="M12 9H7.5A2.5 2.5 0 1 1 10 6.5Z" />
        <path d="M12 9h4.5A2.5 2.5 0 1 0 14 6.5Z" />
      </svg>
    ),
    package: (
      <svg {...commonProps}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4.5 7.8 7.5 4.3 7.5-4.3" />
        <path d="M12 12.1V21" />
      </svg>
    ),
    clock: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    users: (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    sun: (
      <svg {...commonProps}>
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
    ),
    bed: (
      <svg {...commonProps}>
        <path d="M3 7v11" />
        <path d="M21 18v-6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v6" />
        <path d="M3 15h18" />
        <path d="M6 10V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
      </svg>
    ),
    check: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    ),
    chart: (
      <svg {...commonProps}>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </svg>
    ),
  };

  return icons[name];
}

function IconBox({
  icon,
  className,
}: {
  icon: IconName;
  className?: string;
}) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-slate-900/80 ${className ?? "border-slate-800 text-slate-300"}`}
    >
      <DashboardIcon name={icon} />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  valueColour,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/75 p-5 shadow-xl shadow-black/10 transition duration-200 hover:-translate-y-1 hover:border-slate-700">
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

          <IconBox icon={icon} />
        </div>

        <p
          className={`mt-7 text-5xl font-black tracking-[-0.04em] ${valueColour}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function OwnerDashboard({
  revenueToday,
  cardRevenueToday,
  cashRevenueToday,
  complimentaryToday,
  minutesSoldToday,
  salesToday,
  customersToday,
  sessionsToday,
  bedsRunning,
  bedsFree,
  occupancy,
}: Props) {
  const [lastUpdated, setLastUpdated] = useState("");

  const animatedRevenue = useAnimatedNumber(revenueToday);
  const animatedCardRevenue = useAnimatedNumber(cardRevenueToday);
  const animatedCashRevenue = useAnimatedNumber(cashRevenueToday);
  const animatedComplimentary = useAnimatedNumber(complimentaryToday);

  useEffect(() => {
    function updateTime() {
      setLastUpdated(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())
      );
    }

    updateTime();

    const timer = window.setInterval(updateTime, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  // Sun Temple currently has four beds.
  // Math.max prevents a temporary 0 / 0 display while live statistics load.
  const totalBeds = Math.max(4, bedsRunning + bedsFree);
  const availableBeds = Math.max(0, totalBeds - bedsRunning);

  const calculatedOccupancy =
    totalBeds > 0 ? (bedsRunning / totalBeds) * 100 : 0;

  const safeOccupancy = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(occupancy) && occupancy > 0
        ? occupancy
        : calculatedOccupancy
    )
  );

  const cardPercentage =
    revenueToday > 0
      ? Math.round((cardRevenueToday / revenueToday) * 100)
      : 0;

  const cashPercentage =
    revenueToday > 0
      ? Math.round((cashRevenueToday / revenueToday) * 100)
      : 0;

  const occupancyColour =
    safeOccupancy >= 100
      ? "text-rose-400"
      : safeOccupancy >= 75
        ? "text-amber-400"
        : "text-emerald-400";

  const occupancyBarColour =
    safeOccupancy >= 100
      ? "bg-rose-400"
      : safeOccupancy >= 75
        ? "bg-amber-400"
        : "bg-emerald-400";

  const salonStatus =
    safeOccupancy >= 100
      ? "Full"
      : safeOccupancy >= 75
        ? "Busy"
        : bedsRunning > 0
          ? "Running smoothly"
          : "Quiet";

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
            Owner Overview
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Dashboard
          </h2>

          <p className="mt-2 text-sm font-medium text-slate-500">
            Today&apos;s salon performance at a glance.
          </p>
        </div>

        <div className="w-fit rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>

            <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
              Live
            </span>
          </div>

          <p className="mt-1 text-[11px] font-bold text-slate-500">
            Updated {lastUpdated || "just now"}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-emerald-950/20 sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sky-500/[0.04] blur-3xl" />

        <div className="relative">
          <div className="grid gap-8 xl:grid-cols-[1fr_1.25fr] xl:items-end">
            <div>
              <div className="flex items-center gap-3">
                <IconBox
                  icon="chart"
                  className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                />

                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                  Revenue Today
                </p>
              </div>

              <p className="mt-7 text-6xl font-black tracking-[-0.065em] text-white sm:text-7xl lg:text-8xl">
                {formatMoney(animatedRevenue)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <IconBox
                    icon="card"
                    className="h-9 w-9 rounded-xl border-sky-500/20 bg-sky-500/10 text-sky-300"
                  />

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">
                    Card
                  </p>
                </div>

                <p className="mt-5 text-3xl font-black tracking-tight text-sky-400">
                  {formatMoney(animatedCardRevenue)}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {cardPercentage}% of revenue
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <IconBox
                    icon="cash"
                    className="h-9 w-9 rounded-xl border-amber-500/20 bg-amber-500/10 text-amber-300"
                  />

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                    Cash
                  </p>
                </div>

                <p className="mt-5 text-3xl font-black tracking-tight text-amber-400">
                  {formatMoney(animatedCashRevenue)}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  {cashPercentage}% of revenue
                </p>
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] p-4">
                <div className="flex items-center gap-3">
                  <IconBox
                    icon="gift"
                    className="h-9 w-9 rounded-xl border-violet-500/20 bg-violet-500/10 text-violet-300"
                  />

                  <p className="text-[10px] font-black uppercase tracking-[0.06em] text-violet-300">
                    Complimentary
                  </p>
                </div>

                <p className="mt-5 text-3xl font-black tracking-tight text-violet-400">
                  {formatMoney(animatedComplimentary)}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  Separate from revenue
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.025] px-4 py-3">
              <span className="text-xs font-bold text-slate-500">
                Packages sold
              </span>

              <strong className="text-sm font-black text-white">
                {salesToday}
              </strong>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-white/[0.025] px-4 py-3">
              <span className="text-xs font-bold text-slate-500">
                Package minutes sold
              </span>

              <strong className="text-sm font-black text-white">
                {minutesSoldToday.toLocaleString("en-GB")}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Packages Sold"
          value={salesToday}
          subtitle="Completed today"
          icon="package"
          valueColour="text-amber-400"
        />

        <StatCard
          title="Minutes Sold"
          value={minutesSoldToday.toLocaleString("en-GB")}
          subtitle="Package minutes"
          icon="clock"
          valueColour="text-violet-400"
        />

        <StatCard
          title="Customers Today"
          value={customersToday}
          subtitle="Unique customers"
          icon="users"
          valueColour="text-sky-400"
        />

        <StatCard
          title="Sessions Today"
          value={sessionsToday}
          subtitle="Beds started"
          icon="sun"
          valueColour="text-rose-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.35fr]">
        <StatCard
          title="Beds Running"
          value={`${bedsRunning} / ${totalBeds}`}
          subtitle={`${availableBeds} currently available`}
          icon="bed"
          valueColour="text-emerald-400"
        />

        <StatCard
          title="Beds Available"
          value={availableBeds}
          subtitle={`${totalBeds} beds in total`}
          icon="check"
          valueColour="text-lime-400"
        />

        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/75 p-5 shadow-xl shadow-black/10">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Occupancy
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-600">
                  Current salon utilisation
                </p>
              </div>

              <IconBox icon="chart" />
            </div>

            <div className="mt-6 flex items-end justify-between gap-4">
              <p
                className={`text-5xl font-black tracking-[-0.04em] ${occupancyColour}`}
              >
                {Math.round(safeOccupancy)}%
              </p>

              <div className="text-right">
                <p className="text-sm font-black text-slate-300">
                  {salonStatus}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-600">
                  {bedsRunning} running · {availableBeds} available
                </p>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-900">
              <div
                className={`h-full rounded-full transition-all duration-700 ${occupancyBarColour}`}
                style={{ width: `${safeOccupancy}%` }}
              />
            </div>

            <div className="mt-3 flex justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
              <span>Quiet</span>
              <span>Busy</span>
              <span>Full</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
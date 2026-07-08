"use client";

type Props = {
  revenueToday: number;
  salesToday: number;
  customersToday: number;
  sessionsToday: number;
  bedsRunning: number;
  bedsFree: number;
  occupancy: number;
};

const cards = [
  {
    key: "revenueToday",
    title: "Revenue Today",
    prefix: "£",
    suffix: "",
    colour: "text-emerald-400",
  },
  {
    key: "salesToday",
    title: "Packages Sold",
    prefix: "",
    suffix: "",
    colour: "text-amber-400",
  },
  {
    key: "customersToday",
    title: "Customers Today",
    prefix: "",
    suffix: "",
    colour: "text-sky-400",
  },
  {
    key: "sessionsToday",
    title: "Sessions Today",
    prefix: "",
    suffix: "",
    colour: "text-violet-400",
  },
  {
    key: "bedsRunning",
    title: "Beds Running",
    prefix: "",
    suffix: "",
    colour: "text-red-400",
  },
  {
    key: "occupancy",
    title: "Occupancy",
    prefix: "",
    suffix: "%",
    colour: "text-amber-400",
  },
] as const;

export default function OwnerDashboard(props: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => {
        const value = props[card.key] ?? 0;

        return (
          <div
            key={card.key}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              {card.title}
            </p>

            <p className={`mt-3 text-4xl font-black ${card.colour}`}>
              {card.prefix}
              {card.key === "revenueToday" ? Number(value).toFixed(2) : value}
              {card.suffix}
            </p>
          </div>
        );
      })}
    </section>
  );
}
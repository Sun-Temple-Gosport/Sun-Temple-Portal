"use client";

type Props = {
  runningBeds: number;
  freeBeds: number;
  completeBeds: number;
  totalBeds: number;
  selectedCustomerMinutes: number | null;
  customersShown: number;
};

export default function StatsBar({
  runningBeds,
  freeBeds,
  completeBeds,
  totalBeds,
  selectedCustomerMinutes,
  customersShown,
}: Props) {
  const occupancy =
    totalBeds === 0 ? 0 : Math.round((runningBeds / totalBeds) * 100);

  const stats = [
    {
      title: "Beds Running",
      value: `${runningBeds}/${totalBeds}`,
      colour: "text-red-400",
    },
    {
      title: "Beds Free",
      value: freeBeds,
      colour: "text-emerald-400",
    },
    {
      title: "Complete",
      value: completeBeds,
      colour: "text-amber-400",
    },
    {
      title: "Occupancy",
      value: `${occupancy}%`,
      colour: "text-sky-400",
    },
    {
      title: "Selected Minutes",
      value: selectedCustomerMinutes ?? "-",
      colour: "text-violet-400",
    },
    {
      title: "Customers Found",
      value: customersShown,
      colour: "text-white",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            {stat.title}
          </p>

          <p className={`mt-3 text-4xl font-black ${stat.colour}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </section>
  );
}
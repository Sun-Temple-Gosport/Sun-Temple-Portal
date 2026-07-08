"use client";

type Activity = {
  id: string;
  text: string;
  time: string;
};

type Props = {
  activities: Activity[];
};

export default function ActivityFeed({ activities }: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
          Live Activity
        </p>

        <h2 className="mt-1 text-2xl font-black text-white">
          Today's Activity
        </h2>
      </div>

      <div className="space-y-3">
        {activities.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-slate-400">
            No activity yet today.
          </div>
        )}

        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4"
          >
            <span className="font-semibold text-white">
              {activity.text}
            </span>

            <span className="text-sm font-bold text-amber-400">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
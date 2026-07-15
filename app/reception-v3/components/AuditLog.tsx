"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuditEntry = {
  id: string;
  created_at: string;
  staff_name: string;
  action: string;
  customer_name: string | null;
  details: string | null;
};

function formatAuditTime(value: string) {
  const date = new Date(value);
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const entryDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (entryDay.getTime() === startOfToday.getTime()) {
    return `Today • ${time}`;
  }

  if (entryDay.getTime() === startOfYesterday.getTime()) {
    return `Yesterday • ${time}`;
  }

  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${day} • ${time}`;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  async function loadAudit() {
    setLoading(true);

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setEntries((data ?? []) as AuditEntry[]);
    }

    setLoading(false);
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
          Owner Audit
        </p>

        <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Audit Log
        </h2>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Permanent record of important business activity.
        </p>
      </div>

      {loading && (
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 text-center">
          <p className="text-white font-bold">
            Loading audit log...
          </p>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 text-center">
          <p className="text-white font-bold">
            No audit entries yet.
          </p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    {formatAuditTime(entry.created_at)}
                  </p>

                  <h3 className="mt-2 text-xl font-black text-white">
                    {entry.action}
                  </h3>
                </div>

                <div className="rounded-full bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-400">
                  {entry.staff_name}
                </div>
              </div>

              {entry.customer_name && (
                <p className="mt-5 text-sm font-bold text-slate-400">
                  Customer
                </p>
              )}

              {entry.customer_name && (
                <p className="text-lg font-black text-white">
                  {entry.customer_name}
                </p>
              )}

              {entry.details && (
                <>
                  <p className="mt-5 text-sm font-bold text-slate-400">
                    Details
                  </p>

                  <p className="text-lg font-black text-emerald-400">
                    {entry.details}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
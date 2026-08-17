"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StaffMember = {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  disabled: boolean;
};

type RotaEntry = {
  id: string;
  staff_id: string;
  rota_date: string;
  entry_type: "working" | "annual_leave" | "sick" | "day_off";
  start_time: string | null;
  end_time: string | null;
};

type RotaPattern = {
  id: string;
  staff_id: string;
  day_of_week: number;
  entry_type: "working" | "annual_leave" | "sick" | "day_off";
  start_time: string | null;
  end_time: string | null;
  starts_on: string;
  ends_on: string | null;
  active: boolean;
};

function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  IMPORTANT:
  Existing owner rota entries were created using UTC date keys.
  This deliberately uses the same key for manual entries so the
  read-only staff rota matches the owner rota exactly.
*/
function formatSavedEntryDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function StaffRotaPage() {
  const router = useRouter();

  const [weekStart, setWeekStart] = useState(() =>
    getStartOfWeek(new Date())
  );

  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index)
  );

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rotaEntries, setRotaEntries] = useState<RotaEntry[]>([]);
  const [rotaPatterns, setRotaPatterns] = useState<RotaPattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRota() {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/staff-login");
        return;
      }

      try {
        const startDate = formatSavedEntryDate(weekStart);

        const response = await fetch(
          `/api/staff/rota-team?weekStart=${startDate}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(result.error || "Could not load staff rota.");
          return;
        }

        const team = (result.staff ?? []).map(
          (member: Omit<StaffMember, "disabled">) => ({
            ...member,
            disabled: false,
          })
        );

        setStaff(team as StaffMember[]);
        setRotaEntries((result.rotaEntries ?? []) as RotaEntry[]);
        setRotaPatterns((result.rotaPatterns ?? []) as RotaPattern[]);
      } catch (error) {
        console.error("Could not load staff rota.", error);
      } finally {
        setLoading(false);
      }
    }

    void loadRota();
  }, [weekStart, router]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
              Staff
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Staff Rota
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              View the team rota.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/reception-v3")}
            className="rounded-full border border-slate-700 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-300"
          >
            Back to Reception
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Staff Rota
              </p>

              <p className="mt-1 text-lg font-black text-white">
                {weekDays[0].toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
                {" → "}
                {weekDays[6].toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setWeekStart((current) => addDays(current, -7))
                }
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-300"
              >
                Previous Week
              </button>

              <button
                type="button"
                onClick={() =>
                  setWeekStart(getStartOfWeek(new Date()))
                }
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-300"
              >
                This Week
              </button>

              <button
                type="button"
                onClick={() =>
                  setWeekStart((current) => addDays(current, 7))
                }
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase text-slate-300"
              >
                Next Week
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading rota...</p>
          ) : staff.length === 0 ? (
            <p className="text-slate-400">No staff found.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[950px]">
                <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-2">
                  <div />

                  {weekDays.map((day) => (
                    <div
                      key={formatLocalDate(day)}
                      className="px-2 py-2 text-center"
                    >
                      <p className="text-xs font-black uppercase text-slate-400">
                        {day.toLocaleDateString("en-GB", {
                          weekday: "short",
                        })}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {day.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}

                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="contents"
                    >
                      <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                        <span className="font-black text-white">
                          {member.full_name}
                        </span>
                      </div>

                      {weekDays.map((day) => {
                        const displayDate = formatLocalDate(day);

                        /*
                          Manual entries deliberately use the same UTC
                          date key as the existing owner rota.
                        */
                        const savedDate = formatSavedEntryDate(day);

                        const entry = rotaEntries.find(
                          (rotaEntry) =>
                            rotaEntry.staff_id === member.id &&
                            rotaEntry.rota_date === savedDate
                        );

                        const jsDay = day.getDay();
                        const dayOfWeek = jsDay === 0 ? 7 : jsDay;

                        const recurringPattern = rotaPatterns.find(
                          (pattern) =>
                            pattern.staff_id === member.id &&
                            pattern.day_of_week === dayOfWeek &&
                            pattern.active &&
                            displayDate >= pattern.starts_on &&
                            (!pattern.ends_on ||
                              displayDate <= pattern.ends_on)
                        );

                        return (
                          <div
                            key={`${member.id}-${displayDate}`}
                            className="flex min-h-20 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-2 text-center"
                          >
                            {entry ? (
                              entry.entry_type === "working" ? (
                                <div>
                                  <p className="text-xs font-black uppercase text-emerald-400">
                                    Working
                                  </p>

                                  <p className="mt-1 text-xs font-bold text-white">
                                    {entry.start_time?.slice(0, 5)} –{" "}
                                    {entry.end_time?.slice(0, 5)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs font-black uppercase text-amber-400">
                                  {entry.entry_type === "annual_leave"
                                    ? "Annual Leave"
                                    : entry.entry_type === "sick"
                                      ? "Sick"
                                      : "Day Off"}
                                </span>
                              )
                            ) : recurringPattern ? (
                              recurringPattern.entry_type === "working" ? (
                                <div>
                                  <p className="text-xs font-black uppercase text-amber-400">
                                    Repeating
                                  </p>

                                  <p className="mt-1 text-xs font-bold text-white">
                                    {recurringPattern.start_time?.slice(0, 5)} –{" "}
                                    {recurringPattern.end_time?.slice(0, 5)}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs font-black uppercase text-amber-400">
                                  {recurringPattern.entry_type === "annual_leave"
                                    ? "Annual Leave"
                                    : recurringPattern.entry_type === "sick"
                                      ? "Sick"
                                      : "Day Off"}
                                </span>
                              )
                            ) : (
                              <span className="text-xs font-bold text-slate-600">
                                —
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
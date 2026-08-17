"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getWorkingHours(entry: RotaEntry) {
  if (
    entry.entry_type !== "working" ||
    !entry.start_time ||
    !entry.end_time
  ) {
    return 0;
  }

  const [startHour, startMinute] = entry.start_time
    .slice(0, 5)
    .split(":")
    .map(Number);

  const [endHour, endMinute] = entry.end_time
    .slice(0, 5)
    .split(":")
    .map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  return Math.max(0, (endTotalMinutes - startTotalMinutes) / 60);
}

export default function StaffRota() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rotaEntries, setRotaEntries] = useState<RotaEntry[]>([]);
  const [monthlyRotaEntries, setMonthlyRotaEntries] = useState<RotaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() =>
  getStartOfWeek(new Date())
);
const [summaryMonth, setSummaryMonth] = useState(() => {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );
});

const [reportStartDate, setReportStartDate] = useState("");
const [reportEndDate, setReportEndDate] = useState("");
const [reportEntries, setReportEntries] = useState<RotaEntry[]>([]);
const [loadingReport, setLoadingReport] = useState(false);
const [editingCell, setEditingCell] = useState<{
  staffId: string;
  rotaDate: string;
} | null>(null);

const [entryType, setEntryType] = useState<
  "working" | "annual_leave" | "sick" | "day_off"
>("working");

const [startTime, setStartTime] = useState("09:00");
const [endTime, setEndTime] = useState("17:00");
const [savingEntry, setSavingEntry] = useState(false);
const [deletingEntry, setDeletingEntry] = useState(false);
const [copyingWeek, setCopyingWeek] = useState(false);
const [rotaMessage, setRotaMessage] = useState("");
const weekEnd = addDays(weekStart, 6);

const weekDays = Array.from({ length: 7 }, (_, index) =>
  addDays(weekStart, index)
);

  useEffect(() => {
    void loadStaff();
  }, []);

  useEffect(() => {
  void loadRotaEntries();
}, [weekStart]);

useEffect(() => {
  void loadMonthlyRotaEntries();
}, [summaryMonth]);

  async function loadStaff() {
    setLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("Owner session could not be found.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/staff/list", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(result.error || "Could not load staff members.");
        setLoading(false);
        return;
      }

      setStaff(
        (result.staff ?? []).filter(
          (member: StaffMember) => !member.disabled
        )
      );
    } catch (error) {
      console.error("Could not connect to the staff list API.", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRotaEntries() {
  const startDate = weekStart.toISOString().slice(0, 10);
  const endDate = weekEnd.toISOString().slice(0, 10);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Could not confirm the logged-in owner.");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    console.error("Could not determine the current salon.");
    return;
  }

  const { data, error } = await supabase
    .from("staff_rota_entries")
    .select(
      "id, staff_id, rota_date, entry_type, start_time, end_time"
    )
    .eq("salon_id", profile.salon_id)
    .gte("rota_date", startDate)
    .lte("rota_date", endDate)
    .order("rota_date", { ascending: true });

  if (error) {
    console.error("Could not load rota entries:", error.message);
    return;
  }

  setRotaEntries((data ?? []) as RotaEntry[]);
}

async function loadMonthlyRotaEntries() {
  const monthStart = new Date(
    summaryMonth.getFullYear(),
    summaryMonth.getMonth(),
    1
  );

  const monthEnd = new Date(
    summaryMonth.getFullYear(),
    summaryMonth.getMonth() + 1,
    0
  );

  const startDate = monthStart.toISOString().slice(0, 10);
  const endDate = monthEnd.toISOString().slice(0, 10);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Could not confirm the logged-in owner.");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    console.error("Could not determine the current salon.");
    return;
  }

  const { data, error } = await supabase
    .from("staff_rota_entries")
    .select(
      "id, staff_id, rota_date, entry_type, start_time, end_time"
    )
    .eq("salon_id", profile.salon_id)
    .gte("rota_date", startDate)
    .lte("rota_date", endDate)
    .order("rota_date", { ascending: true });

  if (error) {
    console.error(
      "Could not load monthly rota entries:",
      error.message
    );
    return;
  }

  setMonthlyRotaEntries((data ?? []) as RotaEntry[]);
}

async function loadCustomReport() {
  if (!reportStartDate || !reportEndDate) {
    setRotaMessage("Please choose a start date and end date.");
    return;
  }

  if (reportEndDate < reportStartDate) {
    setRotaMessage("End date cannot be before start date.");
    return;
  }

  setLoadingReport(true);
  setRotaMessage("");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setRotaMessage("Could not confirm the logged-in owner.");
    setLoadingReport(false);
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    setRotaMessage("Could not determine the current salon.");
    setLoadingReport(false);
    return;
  }

  const { data, error } = await supabase
    .from("staff_rota_entries")
    .select(
      "id, staff_id, rota_date, entry_type, start_time, end_time"
    )
    .eq("salon_id", profile.salon_id)
    .gte("rota_date", reportStartDate)
    .lte("rota_date", reportEndDate)
    .order("rota_date", { ascending: true });

  if (error) {
    setRotaMessage(error.message);
    setLoadingReport(false);
    return;
  }

  setReportEntries((data ?? []) as RotaEntry[]);
  setRotaMessage("Custom hours report loaded.");
  setLoadingReport(false);
}



  async function saveRotaEntry() {
  if (!editingCell) return;

  if (
    entryType === "working" &&
    (!startTime || !endTime || endTime <= startTime)
  ) {
    setRotaMessage("Please enter a valid start and finish time.");
    return;
  }

  setSavingEntry(true);
  setRotaMessage("");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setRotaMessage("Could not confirm the logged-in owner.");
    setSavingEntry(false);
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    setRotaMessage("Could not determine the current salon.");
    setSavingEntry(false);
    return;
  }

  const { error } = await supabase
    .from("staff_rota_entries")
    .upsert(
      {
        salon_id: profile.salon_id,
        staff_id: editingCell.staffId,
        rota_date: editingCell.rotaDate,
        entry_type: entryType,
        start_time: entryType === "working" ? startTime : null,
        end_time: entryType === "working" ? endTime : null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "salon_id,staff_id,rota_date",
      }
    );

  if (error) {
    setRotaMessage(error.message);
    setSavingEntry(false);
    return;
  }

 setRotaMessage("Rota entry saved.");
setEditingCell(null);
await loadRotaEntries();
setSavingEntry(false);
}

async function deleteRotaEntry(entry: RotaEntry) {
  setDeletingEntry(true);
  setRotaMessage("");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setRotaMessage("Could not confirm the logged-in owner.");
    setDeletingEntry(false);
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    setRotaMessage("Could not determine the current salon.");
    setDeletingEntry(false);
    return;
  }

  const { error } = await supabase
    .from("staff_rota_entries")
    .delete()
    .eq("id", entry.id)
    .eq("salon_id", profile.salon_id);

  if (error) {
    setRotaMessage(error.message);
    setDeletingEntry(false);
    return;
  }

  setEditingCell(null);
  await loadRotaEntries();
  await loadMonthlyRotaEntries();

  setRotaMessage("Rota entry removed.");
  setDeletingEntry(false);
}

async function copyPreviousWeek() {
  setCopyingWeek(true);
  setRotaMessage("");

  try {
    const previousWeekStart = addDays(weekStart, -7);
    const previousWeekEnd = addDays(weekStart, -1);

    const currentWeekStart = weekStart;
    const currentWeekEnd = addDays(weekStart, 6);

    const previousStartDate = previousWeekStart
      .toISOString()
      .slice(0, 10);

    const previousEndDate = previousWeekEnd
      .toISOString()
      .slice(0, 10);

    const currentStartDate = currentWeekStart
      .toISOString()
      .slice(0, 10);

    const currentEndDate = currentWeekEnd
      .toISOString()
      .slice(0, 10);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRotaMessage("Could not confirm the logged-in owner.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("salon_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.salon_id) {
      setRotaMessage("Could not determine the current salon.");
      return;
    }

    const { data: previousEntries, error: previousError } =
      await supabase
        .from("staff_rota_entries")
        .select(
          "staff_id, rota_date, entry_type, start_time, end_time"
        )
        .eq("salon_id", profile.salon_id)
        .gte("rota_date", previousStartDate)
        .lte("rota_date", previousEndDate);

    if (previousError) {
      setRotaMessage(previousError.message);
      return;
    }

    if (!previousEntries || previousEntries.length === 0) {
      setRotaMessage(
        "There are no rota entries in the previous week to copy."
      );
      return;
    }

    const { data: existingEntries, error: existingError } =
      await supabase
        .from("staff_rota_entries")
        .select("staff_id, rota_date")
        .eq("salon_id", profile.salon_id)
        .gte("rota_date", currentStartDate)
        .lte("rota_date", currentEndDate);

    if (existingError) {
      setRotaMessage(existingError.message);
      return;
    }

    const existingKeys = new Set(
      (existingEntries ?? []).map(
        (entry) => `${entry.staff_id}-${entry.rota_date}`
      )
    );

    const entriesToCopy = previousEntries
      .map((entry) => {
        const sourceDate = new Date(
          `${entry.rota_date}T00:00:00Z`
        );

        sourceDate.setUTCDate(sourceDate.getUTCDate() + 7);

        return {
          salon_id: profile.salon_id,
          staff_id: entry.staff_id,
          rota_date: sourceDate.toISOString().slice(0, 10),
          entry_type: entry.entry_type,
          start_time: entry.start_time,
          end_time: entry.end_time,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(
        (entry) =>
          !existingKeys.has(
            `${entry.staff_id}-${entry.rota_date}`
          )
      );

    if (entriesToCopy.length === 0) {
      setRotaMessage(
        "Nothing copied because this week already contains those rota entries."
      );
      return;
    }

    const { error: insertError } = await supabase
      .from("staff_rota_entries")
      .insert(entriesToCopy);

    if (insertError) {
      setRotaMessage(insertError.message);
      return;
    }

    await loadRotaEntries();
    await loadMonthlyRotaEntries();

    setRotaMessage(
      `${entriesToCopy.length} rota entries copied from the previous week.`
    );
  } finally {
    setCopyingWeek(false);
  }
}

  return (
  <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
        Staff Management
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        Staff Rota
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        Plan weekly shifts, annual leave, sick days and days off.
      </p>
      {rotaMessage && (
  <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
    <p className="font-black text-emerald-400">
      ✓ {rotaMessage}
    </p>
  </div>
)}
    </div>

    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Week
          </p>

          <p className="mt-1 text-lg font-black text-white">
            {formatShortDate(weekStart)} → {formatShortDate(weekEnd)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={copyPreviousWeek}
    disabled={copyingWeek}
    className="rounded-full border border-amber-500 px-4 py-2 text-xs font-black uppercase text-amber-400 disabled:opacity-50"
  >
    {copyingWeek ? "Checking..." : "Copy Previous Week"}
  </button>

  <button
    type="button"
    onClick={() =>
      setWeekStart((current) => addDays(current, -7))
    }
    className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300"
  >
    Previous Week
  </button>

          <button
            type="button"
            onClick={() =>
              setWeekStart(getStartOfWeek(new Date()))
            }
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400 hover:text-amber-400"
          >
            This Week
          </button>

          <button
            type="button"
            onClick={() =>
              setWeekStart((current) => addDays(current, 7))
            }
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400 hover:text-amber-400"
          >
            Next Week
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center"
          >
            <p className="text-xs font-black uppercase text-slate-500">
              {day.toLocaleDateString("en-GB", {
                weekday: "short",
              })}
            </p>

            <p className="mt-1 text-sm font-black text-white">
              {day.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
    Weekly Rota
  </p>

  {loading ? (
    <p className="mt-3 text-sm font-semibold text-slate-400">
      Loading staff members...
    </p>
  ) : staff.length === 0 ? (
    <p className="mt-3 text-sm font-semibold text-slate-400">
      No active staff members found.
    </p>
  ) : (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[1100px]">
        <div className="grid grid-cols-[180px_repeat(7,1fr)] gap-2">
          <div />

          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="px-2 py-2 text-center"
            >
              <p className="text-xs font-black uppercase text-slate-500">
                {day.toLocaleDateString("en-GB", {
                  weekday: "short",
                })}
              </p>

              <p className="text-sm font-black text-white">
                {day.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
              </p>
            </div>
          ))}

          {staff.map((member) => (
            <div key={member.id} className="contents">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
  <span className="font-black text-white">
    {member.full_name}
  </span>

  <span className="whitespace-nowrap text-xs font-black text-amber-400">
    {rotaEntries
      .filter((entry) => entry.staff_id === member.id)
      .reduce((total, entry) => total + getWorkingHours(entry), 0)
      .toFixed(1)}{" "}
    hrs
  </span>
</div>

              {weekDays.map((day) => {
  const rotaDate = day.toISOString().slice(0, 10);

  const savedEntry = rotaEntries.find(
    (entry) =>
      entry.staff_id === member.id &&
      entry.rota_date === rotaDate
  );

  return (
                <div
  key={`${member.id}-${day.toISOString()}`}
  className="min-h-24 rounded-xl border border-slate-800 bg-slate-950 p-3"
>
  {editingCell?.staffId === member.id &&
  editingCell.rotaDate === day.toISOString().slice(0, 10) ? (
    <div className="space-y-3">
      <select
        value={entryType}
        onChange={(event) =>
          setEntryType(
            event.target.value as
              | "working"
              | "annual_leave"
              | "sick"
              | "day_off"
          )
        }
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-white"
      >
        <option value="working">Working</option>
        <option value="annual_leave">Annual Leave</option>
        <option value="sick">Sick</option>
        <option value="day_off">Day Off</option>
      </select>

      {entryType === "working" && (
        <div className="space-y-2">
  <label className="block">
    <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
      Start
    </span>

    <input
      type="time"
      value={startTime}
      onChange={(event) => setStartTime(event.target.value)}
      className="w-full min-w-[110px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
    />
  </label>

  <label className="block">
    <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
      Finish
    </span>

    <input
      type="time"
      value={endTime}
      onChange={(event) => setEndTime(event.target.value)}
      className="w-full min-w-[110px] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
    />
  </label>
</div>
      )}

      <div className="flex flex-wrap gap-2">
  <button
    type="button"
    onClick={() => void saveRotaEntry()}
    disabled={savingEntry || deletingEntry}
    className="flex-1 rounded-lg bg-amber-400 px-2 py-2 text-xs font-black text-black disabled:opacity-50"
  >
    {savingEntry ? "Saving..." : "Save"}
  </button>

  {savedEntry && (
    <button
      type="button"
      onClick={() => void deleteRotaEntry(savedEntry)}
      disabled={savingEntry || deletingEntry}
      className="flex-1 rounded-lg border border-red-500 px-2 py-2 text-xs font-black text-red-300 disabled:opacity-50"
    >
      {deletingEntry ? "Removing..." : "Remove"}
    </button>
  )}

  <button
    type="button"
    onClick={() => setEditingCell(null)}
    disabled={savingEntry || deletingEntry}
    className="flex-1 rounded-lg border border-slate-700 px-2 py-2 text-xs font-black text-slate-300 disabled:opacity-50"
  >
    Cancel
  </button>
</div>
    </div>
  ) : savedEntry ? (
  <button
    type="button"
    onClick={() => {
      setEditingCell({
        staffId: member.id,
        rotaDate,
      });
      setEntryType(savedEntry.entry_type);
      setStartTime(savedEntry.start_time?.slice(0, 5) ?? "09:00");
      setEndTime(savedEntry.end_time?.slice(0, 5) ?? "17:00");
    }}
    className="h-full w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-center"
  >
    <span className="block text-xs font-black uppercase text-emerald-400">
      {savedEntry.entry_type === "working"
        ? "Working"
        : savedEntry.entry_type === "annual_leave"
          ? "Annual Leave"
          : savedEntry.entry_type === "sick"
            ? "Sick"
            : "Day Off"}
    </span>

    {savedEntry.entry_type === "working" &&
      savedEntry.start_time &&
      savedEntry.end_time && (
        <span className="mt-1 block text-xs font-bold text-white">
          {savedEntry.start_time.slice(0, 5)} –{" "}
          {savedEntry.end_time.slice(0, 5)}
        </span>
      )}
  </button>
) : (
    <button
      type="button"
      onClick={() => {
        setEditingCell({
          staffId: member.id,
          rotaDate: day.toISOString().slice(0, 10),
        });
        setEntryType("working");
        setStartTime("09:00");
        setEndTime("17:00");
      }}
      className="h-full w-full text-center"
    >
      <span className="text-xs font-black uppercase text-slate-500">
        Add Shift
      </span>
    </button>
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

<div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        Monthly Summary
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {summaryMonth.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={() =>
          setSummaryMonth(
            (current) =>
              new Date(
                current.getFullYear(),
                current.getMonth() - 1,
                1
              )
          )
        }
        className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400 hover:text-amber-400"
      >
        Previous Month
      </button>

      <button
        type="button"
        onClick={() => {
          const today = new Date();

          setSummaryMonth(
            new Date(
              today.getFullYear(),
              today.getMonth(),
              1
            )
          );
        }}
        className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400 hover:text-amber-400"
      >
        This Month
      </button>

      <button
        type="button"
        onClick={() =>
          setSummaryMonth(
            (current) =>
              new Date(
                current.getFullYear(),
                current.getMonth() + 1,
                1
              )
          )
        }
        className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400 hover:text-amber-400"
      >
        Next Month
      </button>
    </div>
  </div>

  <div className="mt-5 space-y-2">
    {staff.map((member) => {
      const staffEntries = monthlyRotaEntries.filter(
        (entry) => entry.staff_id === member.id
      );

      const totalHours = staffEntries.reduce(
        (total, entry) => total + getWorkingHours(entry),
        0
      );

      const annualLeaveDays = staffEntries.filter(
  (entry) => entry.entry_type === "annual_leave"
).length;

const sickDays = staffEntries.filter(
  (entry) => entry.entry_type === "sick"
).length;

const daysOff = staffEntries.filter(
  (entry) => entry.entry_type === "day_off"
).length;

return (
        <div
          key={member.id}
          className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="font-black text-white">
            {member.full_name}
          </span>

          <div className="flex flex-wrap gap-4 text-sm font-bold">
  <span className="text-amber-400">
    {totalHours.toFixed(1)} hrs worked
  </span>

  <span className="text-slate-300">
    {annualLeaveDays} annual leave
  </span>

  <span className="text-slate-300">
    {sickDays} sick
  </span>

  <span className="text-slate-300">
    {daysOff} days off
  </span>
</div>
        </div>
      );
    })}
    </div>
</div>

<div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
  <div>
    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
      Custom Hours Report
    </p>

    <p className="mt-1 text-sm text-slate-400">
      Choose any date range to calculate staff hours and attendance.
    </p>
  </div>

  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        From
      </span>

      <input
        type="date"
        value={reportStartDate}
        onChange={(event) =>
          setReportStartDate(event.target.value)
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
      />
    </label>

    <label className="space-y-2">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        To
      </span>

      <input
        type="date"
        value={reportEndDate}
        onChange={(event) =>
          setReportEndDate(event.target.value)
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
      />
    </label>

    <div className="flex items-end">
      <button
        type="button"
        onClick={() => void loadCustomReport()}
        disabled={loadingReport}
        className="w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black disabled:opacity-50"
      >
        {loadingReport ? "Loading..." : "Run Report"}
      </button>
    </div>
  </div>

  {reportEntries.length > 0 && (
    <div className="mt-6 space-y-2">
      {staff.map((member) => {
        const staffEntries = reportEntries.filter(
          (entry) => entry.staff_id === member.id
        );

        const totalHours = staffEntries.reduce(
          (total, entry) => total + getWorkingHours(entry),
          0
        );

        const annualLeaveDays = staffEntries.filter(
          (entry) => entry.entry_type === "annual_leave"
        ).length;

        const sickDays = staffEntries.filter(
          (entry) => entry.entry_type === "sick"
        ).length;

        const daysOff = staffEntries.filter(
          (entry) => entry.entry_type === "day_off"
        ).length;

        return (
          <div
            key={member.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-black text-white">
              {member.full_name}
            </span>

            <div className="flex flex-wrap gap-4 text-sm font-bold">
              <span className="text-amber-400">
                {totalHours.toFixed(1)} hrs worked
              </span>

              <span className="text-slate-300">
                {annualLeaveDays} annual leave
              </span>

              <span className="text-slate-300">
                {sickDays} sick
              </span>

              <span className="text-slate-300">
                {daysOff} days off
              </span>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

  </section>
);
}
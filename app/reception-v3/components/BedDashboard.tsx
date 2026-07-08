"use client";

import { useEffect, useState } from "react";
import type { BedSession, CustomerBalance } from "../types";

type BedName = "St Lucia" | "Barbados" | "St Kitts" | "Antigua";

type Props = {
  selectedCustomer: CustomerBalance | null;
  sessions: BedSession[];
  onStartSession: (bedName: string, minutes: number) => Promise<boolean>;
  onFinishSession: (sessionId: string) => Promise<void>;
};

const beds: BedName[] = ["St Lucia", "Barbados", "St Kitts", "Antigua"];
const sessionMinutes = [8, 10, 12, 16];

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export default function BedDashboard({
  selectedCustomer,
  sessions,
  onStartSession,
  onFinishSession,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [selectedBed, setSelectedBed] = useState<BedName>("St Lucia");
  const [selectedMinutes, setSelectedMinutes] = useState<number>(10);
  const [customMinutes, setCustomMinutes] = useState("");
  const [starting, setStarting] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeSessions = sessions.filter(
    (session) => session.status === "active"
  );

  const selectedBedSession = activeSessions.find(
    (session) => session.bed_name === selectedBed
  );

  const freeBeds = beds.filter(
    (bed) => !activeSessions.some((session) => session.bed_name === bed)
  );

  const runningBeds = activeSessions.filter(
    (session) => new Date(session.ends_at).getTime() > now
  );

  const doneBeds = activeSessions.filter(
    (session) => new Date(session.ends_at).getTime() <= now
  );

  async function startSession() {
    if (selectedBedSession) return;

    setStarting(true);
    const success = await onStartSession(selectedBed, selectedMinutes);
    setStarting(false);

    if (success) {
      const nextFreeBed = freeBeds.find((bed) => bed !== selectedBed);
      if (nextFreeBed) setSelectedBed(nextFreeBed);
    }
  }

  async function finishSession(sessionId: string) {
    setFinishingId(sessionId);
    await onFinishSession(sessionId);
    setFinishingId(null);
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            Live Bed Control
          </p>

          <h2 className="mt-1 text-3xl font-black text-white">
            Bed Dashboard
          </h2>

          <p className="text-sm font-medium text-slate-400">
            Select one bed, choose minutes, then start the session.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-2xl font-black text-emerald-300">
              {freeBeds.length}
            </p>
            <p className="text-xs font-bold uppercase text-slate-500">Free</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-2xl font-black text-red-300">
              {runningBeds.length}
            </p>
            <p className="text-xs font-bold uppercase text-slate-500">In Use</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-2xl font-black text-amber-300">
              {doneBeds.length}
            </p>
            <p className="text-xs font-bold uppercase text-slate-500">Done</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {beds.map((bed) => {
          const session = activeSessions.find(
            (item) => item.bed_name === bed
          );

          const remaining = session
            ? new Date(session.ends_at).getTime() - now
            : 0;

          const isRunning = session && remaining > 0;
          const isDone = session && remaining <= 0;

          return (
            <button
              key={bed}
              type="button"
              onClick={() => setSelectedBed(bed)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedBed === bed
                  ? "border-amber-400 bg-amber-400/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-black text-white">{bed}</p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                    isRunning
                      ? "bg-red-500 text-white"
                      : isDone
                      ? "bg-amber-400 text-black"
                      : "bg-emerald-400 text-black"
                  }`}
                >
                  {isRunning ? "In Use" : isDone ? "Done" : "Free"}
                </span>
              </div>

              <p className="mt-2 text-sm font-bold text-slate-400">
                {session
                  ? `${session.customer_name || "Customer"} · ${
                      isDone ? "Done" : formatRemaining(remaining)
                    }`
                  : "Available"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            Start Session
          </p>

          <h3 className="mt-2 text-3xl font-black text-white">
            {selectedBed}
          </h3>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Selected Customer
            </p>

            <p className="mt-2 text-xl font-black text-white">
              {selectedCustomer?.full_name || "No customer selected"}
            </p>

            <p className="mt-1 text-sm font-bold text-slate-400">
              {selectedCustomer
                ? `${selectedCustomer.total_minutes ?? 0} mins available`
                : "Search and select a customer first"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
  {sessionMinutes.map((minutes) => (
    <button
      key={minutes}
      type="button"
      onClick={() => setSelectedMinutes(minutes)}
      className={`rounded-xl px-5 py-2 text-sm font-bold transition ${
        selectedMinutes === minutes
          ? "bg-amber-400 text-black"
          : "border border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400"
      }`}
    >
      {minutes}
      <span className="ml-1 text-xs uppercase">mins</span>
    </button>
  ))}
</div>

<div className="mt-4 flex gap-2">
  <input
    type="number"
    min={1}
    placeholder="Custom minutes"
    value={customMinutes}
    onChange={(e) => setCustomMinutes(e.target.value)}
    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500"
  />

  <button
    type="button"
    onClick={() => {
      const mins = Number(customMinutes);

      if (mins > 0) {
        setSelectedMinutes(mins);
      }
    }}
    className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black hover:bg-amber-300"
  >
    Set
  </button>
</div>
          <button
            type="button"
            disabled={!selectedCustomer || !!selectedBedSession || starting}
            onClick={startSession}
            className="mt-4 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {starting
              ? "Starting..."
              : selectedBedSession
              ? "Bed Not Available"
              : "Start Session"}
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            Active / Done Beds
          </p>

          <div className="mt-4 space-y-3">
            {activeSessions.length === 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm font-bold text-slate-400">
                No beds currently running.
              </div>
            )}

            {activeSessions.map((session) => {
              const remaining =
                new Date(session.ends_at).getTime() - now;
              const isDone = remaining <= 0;

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl border p-4 ${
                    isDone
                      ? "border-amber-500/40 bg-amber-950/20"
                      : "border-red-500/40 bg-red-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-black text-white">
                        {session.bed_name}
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-300">
                        {session.customer_name || "Customer"}
                      </p>
                    </div>

                    <p
                      className={`text-3xl font-black ${
                        isDone ? "text-amber-300" : "text-red-300"
                      }`}
                    >
                      {isDone ? "Done" : formatRemaining(remaining)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={finishingId === session.id}
                    onClick={() => finishSession(session.id)}
                    className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-black uppercase text-black transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    {finishingId === session.id
                      ? "Clearing..."
                      : isDone
                      ? "Clear Bed"
                      : "Finish Session"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
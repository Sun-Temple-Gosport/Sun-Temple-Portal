"use client";

import { useState } from "react";
import type { BedSession, CustomerBalance } from "../types";

type Props = {
  bedName: string;
  session: BedSession | undefined;
  now: number;
  selectedCustomer: CustomerBalance | null;
  starting: boolean;
  finishingId: string | null;
  onStartSession: (bedName: string, minutes: number) => Promise<boolean>;
  onFinishSession: (sessionId: string) => Promise<void>;
};

const startMinutes = [
  { minutes: 8, colour: "bg-emerald-500 hover:bg-emerald-400" },
  { minutes: 10, colour: "bg-sky-500 hover:bg-sky-400" },
  { minutes: 12, colour: "bg-violet-500 hover:bg-violet-400" },
  { minutes: 16, colour: "bg-rose-500 hover:bg-rose-400" },
];

export default function BedCard({
  bedName,
  session,
  now,
  selectedCustomer,
  starting,
  finishingId,
  onStartSession,
  onFinishSession,
}: Props) {
  const [customMinutes, setCustomMinutes] = useState("");

  const remaining = session ? new Date(session.ends_at).getTime() - now : 0;
  const isFinished = !!session && remaining <= 0;
  const isRunning = !!session && remaining > 0;

  function formatTime(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  async function startCustomMinutes() {
    const minutes = Number(customMinutes);

    if (!minutes || minutes <= 0 || starting || !selectedCustomer) return;

    const success = await onStartSession(bedName, minutes);

    if (success) {
      setCustomMinutes("");
    }
  }

  return (
    <div
      className={[
        "rounded-3xl border p-5 transition duration-300",
        !session
          ? "border-emerald-500/25 bg-slate-950"
          : isFinished
          ? "border-amber-400/60 bg-amber-950/20"
          : "border-sky-500/40 bg-sky-950/30",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="min-w-0 text-lg font-black leading-tight text-white">
  {bedName}
</h3>
          <p className="mt-1 text-base font-bold text-slate-300">
            {session
              ? session.customer_name || "Customer in session"
              : "Available"}
          </p>
        </div>

        <span
  className={[
    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none",
    !session
      ? "bg-emerald-500/15 text-emerald-300"
      : isFinished
      ? "bg-amber-500/15 text-amber-300"
      : "bg-red-500/15 text-red-300",
  ].join(" ")}
>
  {!session ? "Free" : isFinished ? "Done" : "In Use"}
</span>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          Timer
        </p>

        <p
          className={[
            "mt-1 font-black leading-none",
            !session
              ? "text-4xl text-emerald-300"
              : isFinished
              ? "text-3xl text-amber-300"
              : "text-5xl text-white",
          ].join(" ")}
        >
          {!session ? "Free" : isFinished ? "Done" : formatTime(remaining)}
        </p>
      </div>

      {!session && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {startMinutes.map((item) => (
              <button
                key={item.minutes}
                type="button"
                disabled={!selectedCustomer || starting}
                onClick={() => onStartSession(bedName, item.minutes)}
                className={`rounded-2xl px-4 py-3 text-lg font-black text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${item.colour}`}
              >
                {item.minutes}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") startCustomMinutes();
              }}
              placeholder="Custom"
              className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-amber-400 disabled:opacity-40"
              disabled={!selectedCustomer || starting}
            />

            <button
              type="button"
              disabled={!selectedCustomer || starting}
              onClick={startCustomMinutes}
              className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start
            </button>
          </div>
        </>
      )}

      {isRunning && session && (
        <p className="mt-4 text-center text-sm font-bold text-slate-300">
          Started for {session.minutes} minutes
        </p>
      )}

      {isFinished && session && (
        <button
          type="button"
          disabled={finishingId === session.id}
          onClick={() => onFinishSession(session.id)}
          className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-black text-white shadow-lg transition hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {finishingId === session.id ? "Finishing..." : "✓ Finish Session"}
        </button>
      )}
    </div>
  );
}
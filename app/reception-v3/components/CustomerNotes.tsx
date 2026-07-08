"use client";

import { useState } from "react";

type Note = {
  id: string;
  note: string;
  created_at: string;
};

type Props = {
  notes: Note[];
  onAddNote: (note: string) => Promise<void>;
};

const quickNotes = [
  "⭐ VIP Customer",
  "👷 Staff Member",
  "⚠️ Medical Condition",
  "☀️ Burns Easily",
  "💳 Account Query",
  "🎁 Complimentary Minutes",
];

function getNoteColour(note: string) {
  if (note.includes("⭐")) return "text-yellow-300";
  if (note.includes("⚠️")) return "text-red-400";
  if (note.includes("👷")) return "text-sky-300";
  if (note.includes("🎁")) return "text-purple-300";
  if (note.includes("☀️")) return "text-orange-300";
  return "text-white";
}

export default function CustomerNotes({
  notes,
  onAddNote,
}: Props) {
  const [newNote, setNewNote] = useState("");

  async function saveNote() {
    if (!newNote.trim()) return;

    await onAddNote(newNote.trim());
    setNewNote("");
  }

  async function saveQuickNote(note: string) {
    await onAddNote(note);
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
        Customer Notes
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickNotes.map((note) => (
          <button
            key={note}
            type="button"
            onClick={() => saveQuickNote(note)}
            className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-400 hover:text-white"
          >
            {note}
          </button>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a customer note..."
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
        />

        <button
          type="button"
          onClick={saveNote}
          className="rounded-xl bg-amber-400 px-5 font-black text-black hover:bg-amber-300"
        >
          Save
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">
            No notes for this customer.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${getNoteColour(note.note)}`}>
                    {note.note}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(note.created_at).toLocaleString("en-GB")}
                  </p>
                </div>

                
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
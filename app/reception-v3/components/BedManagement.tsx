"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Bed = {
  id: number;
  name: string;
  display_order: number;
  active: boolean;
};

export default function BedManagement() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [addBedOpen, setAddBedOpen] = useState(false);
  const [newBedName, setNewBedName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBeds();
  }, []);

  async function loadBeds() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("beds")
      .select("id, name, display_order, active")
      .order("display_order", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setBeds(data ?? []);
    setLoading(false);
  }

  async function addBed() {
    const trimmedName = newBedName.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter a bed name.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const nextDisplayOrder =
      beds.length === 0
        ? 1
        : Math.max(...beds.map((bed) => bed.display_order)) + 1;

    const { error } = await supabase.from("beds").insert({
      name: trimmedName,
      display_order: nextDisplayOrder,
      active: true,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setNewBedName("");
    setAddBedOpen(false);
    setSuccessMessage(`${trimmedName} added successfully.`);
    await loadBeds();
    setSaving(false);
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
            Salon Setup
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Bed Management
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Add, rename, reorder and disable beds for your salon.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddBedOpen(true);
            setErrorMessage("");
            setSuccessMessage("");
          }}
          className="rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black hover:bg-amber-300"
        >
          Add Bed
        </button>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm font-bold text-emerald-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-sm font-bold text-red-300">
          {errorMessage}
        </div>
      )}

      {addBedOpen && (
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <label
            htmlFor="new-bed-name"
            className="text-sm font-black text-white"
          >
            New bed name
          </label>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="new-bed-name"
              type="text"
              value={newBedName}
              onChange={(event) => setNewBedName(event.target.value)}
              placeholder="Enter bed name"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
            />

            <button
              type="button"
              onClick={addBed}
              disabled={saving}
              className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Bed"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAddBedOpen(false);
                setNewBedName("");
                setErrorMessage("");
              }}
              disabled={saving}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-black text-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400">
            Loading beds...
          </div>
        )}

        {!loading && !errorMessage && beds.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
            <p className="font-bold text-white">No beds found.</p>
          </div>
        )}

        {!loading &&
          beds.map((bed) => (
            <div
              key={bed.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-lg font-black text-white">{bed.name}</p>

                <p className="mt-1 text-sm text-slate-400">
                  Display order: {bed.display_order}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                    bed.active
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {bed.active ? "Active" : "Inactive"}
                </span>

                <button
                  type="button"
                  disabled
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 opacity-50"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
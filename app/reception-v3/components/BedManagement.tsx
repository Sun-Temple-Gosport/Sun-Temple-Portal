"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Bed = {
  id: number;
  name: string;
  display_order: number;
  active: boolean;
};

async function getCurrentSalonId() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      salonId: null,
      error: userError ?? new Error("User is not logged in."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    return {
      salonId: null,
      error:
        profileError ??
        new Error("Could not determine the current salon."),
    };
  }

  return {
    salonId: profile.salon_id,
    error: null,
  };
}

export default function BedManagement() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [addBedOpen, setAddBedOpen] = useState(false);
  const [newBedName, setNewBedName] = useState("");

  const [editingBedId, setEditingBedId] =
    useState<number | null>(null);
  const [editingBedName, setEditingBedName] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadBeds();
  }, []);

  async function loadBeds() {
    setLoading(true);
    setErrorMessage("");

    const { salonId, error: salonError } =
      await getCurrentSalonId();

    if (salonError || !salonId) {
      setErrorMessage(
        salonError?.message ||
          "Could not determine the current salon."
      );
      setBeds([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("beds")
      .select("id, name, display_order, active")
      .eq("salon_id", salonId)
      .eq("active", true)
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

    const { salonId, error: salonError } =
      await getCurrentSalonId();

    if (salonError || !salonId) {
      setErrorMessage(
        salonError?.message ||
          "Could not determine the current salon."
      );
      setSaving(false);
      return;
    }

    const nextDisplayOrder =
      beds.length === 0
        ? 1
        : Math.max(
            ...beds.map((bed) => bed.display_order)
          ) + 1;

    const { error } = await supabase.from("beds").insert({
      salon_id: salonId,
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
    setSuccessMessage(
      `${trimmedName} added successfully.`
    );

    await loadBeds();
    setSaving(false);
  }

  async function renameBed() {
    if (editingBedId === null) return;

    const trimmedName = editingBedName.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter a bed name.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { salonId, error: salonError } =
      await getCurrentSalonId();

    if (salonError || !salonId) {
      setErrorMessage(
        salonError?.message ||
          "Could not determine the current salon."
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("beds")
      .update({
        name: trimmedName,
      })
      .eq("id", editingBedId)
      .eq("salon_id", salonId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setEditingBedId(null);
    setEditingBedName("");
    setSuccessMessage("Bed renamed successfully.");

    await loadBeds();
    setSaving(false);
  }

  async function deleteBed(bed: Bed) {
    const confirmed = window.confirm(
      `Remove "${bed.name}" from Reception?\n\nThis bed will be hidden, but its history will be kept.`
    );

    if (!confirmed) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { salonId, error: salonError } =
      await getCurrentSalonId();

    if (salonError || !salonId) {
      setErrorMessage(
        salonError?.message ||
          "Could not determine the current salon."
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("beds")
      .update({
        active: false,
      })
      .eq("id", bed.id)
      .eq("salon_id", salonId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    if (editingBedId === bed.id) {
      setEditingBedId(null);
      setEditingBedName("");
    }

    setSuccessMessage(
      `${bed.name} removed successfully.`
    );

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
            Add, rename and remove beds from your salon.
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
              onChange={(event) =>
                setNewBedName(event.target.value)
              }
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

        {!loading &&
          !errorMessage &&
          beds.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
              <p className="font-bold text-white">
                No active beds found.
              </p>
            </div>
          )}

        {!loading &&
          beds.map((bed) => (
            <div
              key={bed.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                {editingBedId === bed.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingBedName}
                      onChange={(event) =>
                        setEditingBedName(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBedId(null);
                          setEditingBedName("");
                        }}
                        disabled={saving}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={renameBed}
                        disabled={saving}
                        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-black text-white">
                      {bed.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Display order: {bed.display_order}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-300">
                  Active
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setEditingBedId(bed.id);
                    setEditingBedName(bed.name);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  disabled={saving}
                  className="rounded-full border border-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-300 transition hover:bg-amber-400 hover:text-black disabled:opacity-50"
                >
                  Rename
                </button>

                <button
                  type="button"
                  onClick={() => deleteBed(bed)}
                  disabled={saving}
                  className="rounded-full border border-red-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
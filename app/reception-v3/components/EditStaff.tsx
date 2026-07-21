"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type StaffMember = {
  id: string;
  full_name: string;
  email: string | null;
  role: string | null;
};

type Props = {
  open: boolean;
  staff: StaffMember | null;
  onClose: () => void;
};

export default function EditStaff({
  open,
  staff,
  onClose,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!staff) return;

    setFullName(staff.full_name);
    setMessage("");
  }, [staff]);

  if (!open || !staff) return null;

  async function saveChanges() {
    if (!staff) return;
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setMessage("Please enter the staff member's full name.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("update_staff_name", {
  p_staff_id: staff.id,
  p_full_name: trimmedName,
});

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Staff member updated successfully.");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">
            Edit Staff Member
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1 text-sm font-bold text-slate-300 hover:border-amber-400 hover:text-amber-400"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Email
            </label>

            <input
              disabled
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-400"
              value={staff.email ?? ""}
            />
          </div>

          {message && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-semibold text-slate-200">
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="w-full rounded-xl bg-amber-400 py-3 font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <hr className="border-slate-800" />

          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-slate-700 py-3 font-black text-slate-300 opacity-50"
          >
            Send Password Reset
          </button>

          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-orange-700 py-3 font-black text-orange-400 opacity-50"
          >
            Disable Account
          </button>

          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-red-700 py-3 font-black text-red-400 opacity-50"
          >
            Delete Staff Member
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function EditStaff({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl">

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">
            Edit Staff Member
          </h2>

          <button
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
              disabled
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              value=""
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Email
            </label>

            <input
              disabled
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              value=""
            />
          </div>

          <button
            disabled
            className="w-full rounded-xl bg-amber-400 py-3 font-black text-black opacity-50"
          >
            Save Changes
          </button>

          <hr className="border-slate-800" />

          <button
            disabled
            className="w-full rounded-xl border border-slate-700 py-3 font-black text-slate-300 opacity-50"
          >
            Send Password Reset
          </button>

          <button
            disabled
            className="w-full rounded-xl border border-orange-700 py-3 font-black text-orange-400 opacity-50"
          >
            Disable Account
          </button>

          <button
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
"use client";

import { useEffect, useState } from "react";

export type PackageOption = {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean;
};

type Props = {
  open: boolean;
  packages: PackageOption[];
  onClose: () => void;
  onSave: (pkg: PackageOption) => Promise<void>;
};

export default function OwnerSettings({
  open,
  packages,
  onClose,
  onSave,
}: Props) {
  const [localPackages, setLocalPackages] = useState<PackageOption[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    setLocalPackages(packages.map((pkg) => ({ ...pkg })));
  }, [packages]);

  if (!open) return null;

  function updateLocalPackage(id: number, changes: Partial<PackageOption>) {
    setLocalPackages((current) =>
      current.map((pkg) => (pkg.id === id ? { ...pkg, ...changes } : pkg))
    );
  }

  async function saveLocalPackage(id: number) {
    const pkg = localPackages.find((item) => item.id === id);
    if (!pkg) return;

    setSavingId(id);
    await onSave(pkg);
    setSavingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
              Owner Settings
            </p>

            <h2 className="text-3xl font-black text-white">Package Prices</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-5 py-2 font-bold text-slate-300 hover:border-amber-400"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          {localPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_110px_120px_120px_100px_100px] md:items-end">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500">
                    Name
                  </label>
                  <input
                    value={pkg.name ?? ""}
                    readOnly
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 font-bold text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500">
                    Minutes
                  </label>
                  <input
                    type="number"
                    value={pkg.minutes}
                    readOnly
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 p-3 font-bold text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500">
                    Price £
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={pkg.price}
                    onChange={(e) =>
                      updateLocalPackage(pkg.id, {
                        price: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-500">
                    Expiry
                  </label>
                  <input
                    type="number"
                    value={pkg.expiry_days ?? 30}
                    onChange={(e) =>
                      updateLocalPackage(pkg.id, {
                        expiry_days: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold text-white"
                  />
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 font-bold text-white">
                  <input
                    type="checkbox"
                    checked={pkg.active}
                    onChange={(e) =>
                      updateLocalPackage(pkg.id, {
                        active: e.target.checked,
                      })
                    }
                  />
                  Active
                </label>

                <button
                  type="button"
                  onClick={() => saveLocalPackage(pkg.id)}
                  className="rounded-xl bg-emerald-400 px-4 py-3 font-black text-black hover:bg-emerald-300"
                >
                  {savingId === pkg.id ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
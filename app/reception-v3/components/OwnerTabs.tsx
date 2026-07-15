"use client";

export type OwnerView =
  | "dashboard"
  | "cashup"
  | "history"
  | "audit"
  | "settings"
  | "staff";

type Props = {
  isOwnerMode: boolean;
  ownerView: OwnerView;
  onSelectView: (view: OwnerView) => void;
  onOpenSettings: () => void;
  onEnterStaffMode: () => void;
};

export default function OwnerTabs({
  isOwnerMode,
  ownerView,
  onSelectView,
  onOpenSettings,
  onEnterStaffMode,
}: Props) {
  function tabClass(view: OwnerView) {
    return `rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
      isOwnerMode && ownerView === view
        ? "bg-amber-400 text-black"
        : "border border-slate-700 bg-slate-900 text-slate-300"
    }`;
  }

  return (
    <div className="mx-auto flex max-w-7xl justify-end gap-2 px-4 pt-4 md:px-8">
      <button
        type="button"
        onClick={() => onSelectView("dashboard")}
        className={tabClass("dashboard")}
      >
        Dashboard
      </button>

      <button
        type="button"
        onClick={() => onSelectView("cashup")}
        className={tabClass("cashup")}
      >
        Cash Up
      </button>

      <button
        type="button"
        onClick={() => onSelectView("history")}
        className={tabClass("history")}
      >
        History
      </button>

      <button
        type="button"
        onClick={() => onSelectView("audit")}
        className={tabClass("audit")}
      >
        Audit
      </button>

      {isOwnerMode && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400"
        >
          Settings
        </button>
      )}

      <button
        type="button"
        onClick={onEnterStaffMode}
        className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
          !isOwnerMode
            ? "bg-amber-400 text-black"
            : "border border-slate-700 bg-slate-900 text-slate-300"
        }`}
      >
        Staff
      </button>
    </div>
  );
}
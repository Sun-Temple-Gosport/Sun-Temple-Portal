"use client";

import OwnerDashboard from "./OwnerDashboard";
import CashUp from "./CashUp";
import CashUpHistory from "./CashUpHistory";
import AuditLog from "./AuditLog";
import StaffManagement from "./StaffManagement";

import type { OwnerView } from "./OwnerTabs";

type CashUpSale = {
  id: string | number;
  customer_name: string | null;
  minutes: number;
  amount: number;
  payment_method: string | null;
  created_at: string;
};

type SaveCashUpDetails = {
  businessDate: string;
  revenue: number;
  cardRevenue: number;
  cashRevenue: number;
  complimentaryRevenue: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  packagesSold: number;
  minutesSold: number;
  customersToday: number;
  sessionsToday: number;
};

type Props = {
  ownerView: OwnerView;

  revenueToday: number;
  cardRevenueToday: number;
  cashRevenueToday: number;
  complimentaryToday: number;
  minutesSoldToday: number;
  salesToday: number;
  customersToday: number;
  sessionsToday: number;
  bedsRunning: number;
  bedsFree: number;
  occupancy: number;

  cashUpSales: CashUpSale[];

  onSaveCashUp: (
    details: SaveCashUpDetails
  ) => Promise<boolean>;
};

function StaffManagementPlaceholder() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
            Owner Access
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Staff Management
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Manage staff accounts, access and password resets.
          </p>
        </div>

        <button
          type="button"
          disabled
          className="rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black opacity-50"
        >
          Add Staff Member
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
        <p className="font-bold text-white">
          Staff accounts will appear here.
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Your existing staff records will be connected in the next step.
        </p>
      </div>
    </section>
  );
}

export default function OwnerArea({
  ownerView,
  revenueToday,
  cardRevenueToday,
  cashRevenueToday,
  complimentaryToday,
  minutesSoldToday,
  salesToday,
  customersToday,
  sessionsToday,
  bedsRunning,
  bedsFree,
  occupancy,
  cashUpSales,
  onSaveCashUp,
}: Props) {
  if (ownerView === "dashboard") {
    return (
      <OwnerDashboard
        revenueToday={revenueToday}
        cardRevenueToday={cardRevenueToday}
        cashRevenueToday={cashRevenueToday}
        complimentaryToday={complimentaryToday}
        minutesSoldToday={minutesSoldToday}
        salesToday={salesToday}
        customersToday={customersToday}
        sessionsToday={sessionsToday}
        bedsRunning={bedsRunning}
        bedsFree={bedsFree}
        occupancy={occupancy}
      />
    );
  }

  if (ownerView === "cashup") {
    return (
      <CashUp
        revenueToday={revenueToday}
        cardRevenueToday={cardRevenueToday}
        cashRevenueToday={cashRevenueToday}
        complimentaryToday={complimentaryToday}
        salesToday={salesToday}
        minutesSoldToday={minutesSoldToday}
        customersToday={customersToday}
        sessionsToday={sessionsToday}
        sales={cashUpSales}
        onSaveCashUp={onSaveCashUp}
      />
    );
  }

  if (ownerView === "history") {
    return <CashUpHistory />;
  }

  if (ownerView === "audit") {
    return <AuditLog />;
  }

  if (ownerView === "staff") {
  return <StaffManagement />;
}

  return null;
}
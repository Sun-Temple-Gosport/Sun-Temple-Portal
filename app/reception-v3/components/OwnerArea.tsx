"use client";

import OwnerDashboard from "./OwnerDashboard";
import CashUp from "./CashUp";
import CashUpHistory from "./CashUpHistory";
import AuditLog from "./AuditLog";

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

  return null;
}
"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

type UseDashboardOptions = {
  getStartOfToday: () => string;
  showMessage: (message: string) => void;
};

export type CashUpSale = {
  id: string | number;
  customer_name: string | null;
  minutes: number;
  amount: number;
  payment_method: string | null;
  created_at: string;
};

export function useDashboard({
  getStartOfToday,
  showMessage,
}: UseDashboardOptions) {
  const [salesToday, setSalesToday] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [customersToday, setCustomersToday] = useState(0);

  const [revenueToday, setRevenueToday] = useState(0);
  const [cardRevenueToday, setCardRevenueToday] = useState(0);
  const [cashRevenueToday, setCashRevenueToday] = useState(0);
  const [complimentaryToday, setComplimentaryToday] = useState(0);
  const [minutesSoldToday, setMinutesSoldToday] = useState(0);

  const [cashUpSales, setCashUpSales] = useState<CashUpSale[]>([]);

  async function loadRevenueToday() {
    const { data, error } = await supabase
      .from("reception_sales")
      .select("id, customer_id, amount, minutes, payment_method")
      .gte("created_at", getStartOfToday());

    if (error) {
      showMessage(error.message);
      return;
    }

    const sales = data ?? [];
    const uniqueCustomers = new Set(
  sales
    .map((row) => row.customer_id)
    .filter((customerId): customerId is string => Boolean(customerId))
);

    const totalRevenue = sales.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    const cardRevenue = sales
      .filter((row) => row.payment_method === "card")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const cashRevenue = sales
      .filter((row) => row.payment_method === "cash")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const complimentaryRevenue = sales
      .filter((row) => row.payment_method === "complimentary")
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const minutesSold = sales.reduce(
      (sum, row) => sum + Number(row.minutes || 0),
      0
    );

    setRevenueToday(totalRevenue);
    setCardRevenueToday(cardRevenue);
    setCashRevenueToday(cashRevenue);
    setComplimentaryToday(complimentaryRevenue);
    setMinutesSoldToday(minutesSold);
    setSalesToday(sales.length);
    setCustomersToday(uniqueCustomers.size);
  }

  async function loadCashUpSales() {
    const { data, error } = await supabase
      .from("reception_sales")
      .select(
        "id, customer_name, minutes, amount, payment_method, created_at"
      )
      .gte("created_at", getStartOfToday())
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(error.message);
      return;
    }

    setCashUpSales(
      (data ?? []).map((sale) => ({
        ...sale,
        minutes: Number(sale.minutes || 0),
        amount: Number(sale.amount || 0),
      }))
    );
  }

  return {
    salesToday,
    setSalesToday,

    sessionsToday,
    setSessionsToday,

    customersToday,
    setCustomersToday,

    revenueToday,
    setRevenueToday,

    cardRevenueToday,
    setCardRevenueToday,

    cashRevenueToday,
    setCashRevenueToday,

    complimentaryToday,
    setComplimentaryToday,

    minutesSoldToday,
    setMinutesSoldToday,

    cashUpSales,

    loadRevenueToday,
    loadCashUpSales,
  };
}
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

  sale_type?: "package" | "retail";
  product_name?: string | null;
  quantity?: number | null;
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
    const startOfToday = getStartOfToday();

    const [
      { data: receptionData, error: receptionError },
      { data: retailData, error: retailError },
    ] = await Promise.all([
      supabase
        .from("reception_sales")
        .select("id, customer_id, amount, minutes, payment_method")
        .gte("created_at", startOfToday),

      supabase
        .from("product_sales")
        .select("id, total_amount, payment_method")
        .gte("created_at", startOfToday),
    ]);

    if (receptionError) {
      showMessage(receptionError.message);
      return;
    }

    if (retailError) {
      showMessage(retailError.message);
      return;
    }

    const receptionSales = receptionData ?? [];
    const retailSales = retailData ?? [];

    const uniqueCustomers = new Set(
      receptionSales
        .map((row) => row.customer_id)
        .filter((customerId): customerId is string =>
          Boolean(customerId)
        )
    );

    const receptionRevenue = receptionSales.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    const retailRevenue = retailSales.reduce(
      (sum, row) => sum + Number(row.total_amount || 0),
      0
    );

    const cardRevenue =
      receptionSales
        .filter((row) => row.payment_method === "card")
        .reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        ) +
      retailSales
        .filter((row) => row.payment_method === "card")
        .reduce(
          (sum, row) => sum + Number(row.total_amount || 0),
          0
        );

    const cashRevenue =
      receptionSales
        .filter((row) => row.payment_method === "cash")
        .reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        ) +
      retailSales
        .filter((row) => row.payment_method === "cash")
        .reduce(
          (sum, row) => sum + Number(row.total_amount || 0),
          0
        );

    const complimentaryRevenue =
      receptionSales
        .filter(
          (row) => row.payment_method === "complimentary"
        )
        .reduce(
          (sum, row) => sum + Number(row.amount || 0),
          0
        ) +
      retailSales
        .filter(
          (row) => row.payment_method === "complimentary"
        )
        .reduce(
          (sum, row) => sum + Number(row.total_amount || 0),
          0
        );

    const minutesSold = receptionSales.reduce(
      (sum, row) => sum + Number(row.minutes || 0),
      0
    );

    setRevenueToday(receptionRevenue + retailRevenue);
    setCardRevenueToday(cardRevenue);
    setCashRevenueToday(cashRevenue);
    setComplimentaryToday(complimentaryRevenue);

    // Package/tanning figures remain package/tanning figures only.
    setMinutesSoldToday(minutesSold);
    setSalesToday(receptionSales.length);
    setCustomersToday(uniqueCustomers.size);
  }

  async function loadCashUpSales() {
    const startOfToday = getStartOfToday();

    const [
      { data: packageData, error: packageError },
      { data: retailData, error: retailError },
    ] = await Promise.all([
      supabase
        .from("reception_sales")
        .select(
          "id, customer_name, minutes, amount, payment_method, created_at"
        )
        .gte("created_at", startOfToday),

      supabase
        .from("product_sales")
        .select(
          "id, total_amount, payment_method, created_at"
        )
        .gte("created_at", startOfToday),
    ]);

    if (packageError) {
      showMessage(packageError.message);
      return;
    }

    if (retailError) {
      showMessage(retailError.message);
      return;
    }

    const retailSaleIds = (retailData ?? []).map(
      (sale) => sale.id
    );

    let retailItems: {
      sale_id: string;
      product_id: string;
      quantity: number;
    }[] = [];

    let retailProducts: {
      id: string;
      name: string;
    }[] = [];

    if (retailSaleIds.length > 0) {
      const { data: itemData, error: itemError } =
        await supabase
          .from("product_sale_items")
          .select("sale_id, product_id, quantity")
          .in("sale_id", retailSaleIds);

      if (itemError) {
        showMessage(itemError.message);
        return;
      }

      retailItems = (itemData ?? []).map((item) => ({
        sale_id: String(item.sale_id),
        product_id: String(item.product_id),
        quantity: Number(item.quantity || 0),
      }));

      const productIds = [
        ...new Set(
          retailItems.map((item) => item.product_id)
        ),
      ];

      if (productIds.length > 0) {
        const { data: productData, error: productError } =
          await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds);

        if (productError) {
          showMessage(productError.message);
          return;
        }

        retailProducts = (productData ?? []).map(
          (product) => ({
            id: String(product.id),
            name: product.name,
          })
        );
      }
    }

    const productNames = new Map(
      retailProducts.map((product) => [
        product.id,
        product.name,
      ])
    );

    const retailDetails = new Map<
      string,
      {
        names: string[];
        quantity: number;
      }
    >();

    retailItems.forEach((item) => {
      const existing = retailDetails.get(item.sale_id) ?? {
        names: [],
        quantity: 0,
      };

      const productName =
        productNames.get(item.product_id) ?? "Retail Product";

      if (!existing.names.includes(productName)) {
        existing.names.push(productName);
      }

      existing.quantity += item.quantity;

      retailDetails.set(item.sale_id, existing);
    });

    const packageSales: CashUpSale[] = (packageData ?? []).map(
      (sale) => ({
        id: sale.id,
        customer_name: sale.customer_name,
        minutes: Number(sale.minutes || 0),
        amount: Number(sale.amount || 0),
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        sale_type: "package",
        product_name: null,
        quantity: null,
      })
    );

    const retailSales: CashUpSale[] = (retailData ?? []).map(
      (sale) => {
        const details = retailDetails.get(String(sale.id));

        return {
          id: `retail-${sale.id}`,
          customer_name: null,
          minutes: 0,
          amount: Number(sale.total_amount || 0),
          payment_method: sale.payment_method,
          created_at: sale.created_at,
          sale_type: "retail",
          product_name:
            details?.names.join(", ") || "Retail Product",
          quantity: details?.quantity ?? 1,
        };
      }
    );

    const combinedSales = [
      ...packageSales,
      ...retailSales,
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    setCashUpSales(combinedSales);
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
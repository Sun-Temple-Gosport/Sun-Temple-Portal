"use client";

import { useEffect, useState } from "react";
import type { CustomerBalance, Sale } from "../types";
import { formatExpiry } from "../utils";
import { supabase } from "@/lib/supabase";

type PackageOption = {
  id: string | number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean | null;
};

type PaymentMethod = "card" | "cash";

type Props = {
  selectedCustomer: CustomerBalance | null;
  manualAdd: string;
  setManualAdd: (value: string) => void;
  onAddMinutes: (sale?: Sale) => Promise<void>;
  onEditCustomer: () => void;
  packages: PackageOption[];
};

export default function CustomerCard({
  selectedCustomer,
  manualAdd,
  setManualAdd,
  onAddMinutes,
  onEditCustomer,
  packages,
}: Props) {
  const [pendingPackage, setPendingPackage] =
    useState<PackageOption | null>(null);

  const [sellingPackageId, setSellingPackageId] = useState<
    string | number | null
  >(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");
    const [vipDiscountPercent, setVipDiscountPercent] = useState(0);

useEffect(() => {
  async function loadVipDiscount() {
    const { data, error } = await supabase
      .from("vip_settings")
      .select("discount_percent")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Failed to load VIP discount:", error.message);
      return;
    }

    setVipDiscountPercent(Number(data?.discount_percent ?? 0));
  }

  loadVipDiscount();
}, []);

  if (!selectedCustomer) return null;

  const customerName =
    selectedCustomer.full_name || "Unnamed Customer";

  const basePackages =
    packages.length > 0
      ? packages.filter(
          (pack) => pack.active !== false && pack.minutes >= 30
        )
      : [
          {
            id: 30,
            name: "30 minute package",
            minutes: 30,
            price: 19,
            expiry_days: 30,
            active: true,
          },
          {
            id: 60,
            name: "60 minute package",
            minutes: 60,
            price: 34,
            expiry_days: 30,
            active: true,
          },
          {
            id: 90,
            name: "90 minute package",
            minutes: 90,
            price: 47,
            expiry_days: 30,
            active: true,
          },
          {
            id: 120,
            name: "120 minute package",
            minutes: 120,
            price: 55,
            expiry_days: 30,
            active: true,
          },
          {
            id: 240,
            name: "240 minute package",
            minutes: 240,
            price: 100,
            expiry_days: 30,
            active: true,
          },
        ];
        const isVip =
  !!selectedCustomer.vip_expires_at &&
  new Date(selectedCustomer.vip_expires_at) > new Date();

const visiblePackages = basePackages.map((pack) => ({
  ...pack,
  price:
    isVip && vipDiscountPercent > 0
      ? Number(
          (
            Number(pack.price) *
            (1 - vipDiscountPercent / 100)
          ).toFixed(2)
        )
      : Number(pack.price),
}));

  function openPackageConfirmation(pack: PackageOption) {
    if (sellingPackageId !== null) return;

    setPaymentMethod("card");
    setPendingPackage(pack);
  }

  function closePackageConfirmation() {
    if (sellingPackageId !== null) return;

    setPendingPackage(null);
    setPaymentMethod("card");
  }

  async function confirmPackageSale() {
    if (!pendingPackage || sellingPackageId !== null) return;

    const packageToSell = pendingPackage;

    setSellingPackageId(packageToSell.id);

    try {
      await onAddMinutes({
        minutes: packageToSell.minutes,
        amount: Number(packageToSell.price),
        description:
          packageToSell.name ||
          `${packageToSell.minutes} minute package`,
        payment_method: paymentMethod,
      });

      setPendingPackage(null);
      setPaymentMethod("card");
    } finally {
      setSellingPackageId(null);
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
  <div className="flex items-start justify-between gap-4">
    <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Customer Control
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {customerName}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {selectedCustomer.email || "No email"} ·{" "}
            {selectedCustomer.phone || "No phone"}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
  <span className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white">
    {selectedCustomer.total_minutes} mins Available
  </span>

  <span className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200">
    Expires: {formatExpiry(selectedCustomer.next_expiry)}
  </span>

  {selectedCustomer.vip_expires_at &&
    new Date(selectedCustomer.vip_expires_at) > new Date() && (
      <span className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-black text-emerald-300">
        VIP Member · Expires{" "}
        {new Date(selectedCustomer.vip_expires_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    )}
</div>
        </div>
        </div>

<button
  type="button"
  onClick={onEditCustomer}
  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-200 hover:border-amber-400"
>
  Edit Customer
</button>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Sell Package
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visiblePackages.map((pack) => {
              const isSelling = sellingPackageId === pack.id;

              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => openPackageConfirmation(pack)}
                  disabled={sellingPackageId !== null}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSelling ? (
                    "Processing..."
                  ) : (
                    <>
                      {pack.minutes} mins
                      <br />£{Number(pack.price).toFixed(2)}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Manual Minutes
          </p>

          <div className="flex gap-3">
            <input
              value={manualAdd}
              onChange={(e) => setManualAdd(e.target.value)}
              placeholder="Minutes"
              className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400"
            />

            <button
              type="button"
              onClick={() => onAddMinutes()}
              className="rounded-2xl bg-sky-500 px-5 py-3 font-black text-white transition hover:bg-sky-400"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {pendingPackage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          onMouseDown={closePackageConfirmation}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-package-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Package Sale
                </p>

                <h3
                  id="confirm-package-title"
                  className="mt-2 text-2xl font-black text-white"
                >
                  Confirm sale
                </h3>
              </div>

              <button
                type="button"
                onClick={closePackageConfirmation}
                disabled={sellingPackageId !== null}
                aria-label="Close confirmation"
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-black text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Customer
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  {customerName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Package
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-400">
                    {pendingPackage.minutes} mins
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Price
                  </p>

                  <p className="mt-1 text-xl font-black text-amber-400">
                    £{Number(pendingPackage.price).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Payment Method
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    disabled={sellingPackageId !== null}
                    aria-pressed={paymentMethod === "card"}
                    className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      paymentMethod === "card"
                        ? "border-sky-400 bg-sky-500/15"
                        : "border-slate-700 bg-slate-950 hover:border-slate-500"
                    }`}
                  >
                    <p className="text-lg font-black text-white">
                      💳 Card
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-400">
                      SumUp terminal
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    disabled={sellingPackageId !== null}
                    aria-pressed={paymentMethod === "cash"}
                    className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      paymentMethod === "cash"
                        ? "border-emerald-400 bg-emerald-500/15"
                        : "border-slate-700 bg-slate-950 hover:border-slate-500"
                    }`}
                  >
                    <p className="text-lg font-black text-white">
                      💷 Cash
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Cash payment
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-red-900/50 bg-red-950/30 p-4">
              <p className="text-sm font-bold leading-6 text-red-200">
                Please check the customer, package, price and payment method
                carefully. The minutes will be added as soon as the sale is
                confirmed.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closePackageConfirmation}
                disabled={sellingPackageId !== null}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-black text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPackageSale}
                disabled={sellingPackageId !== null}
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sellingPackageId !== null
                  ? "Processing..."
                  : `Confirm ${
                      paymentMethod === "card" ? "Card" : "Cash"
                    } Sale`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
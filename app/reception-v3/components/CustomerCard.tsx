"use client";

import { useEffect, useState } from "react";
import type { CustomerBalance, Sale } from "../types";
import { formatExpiry } from "../utils";
import { supabase } from "@/lib/supabase";
import CombinedCheckout from "./CombinedCheckout";

type PackageOption = {
  id: string | number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean | null;
  is_unlimited?: boolean;
};

type PackageSale = Sale & {
  is_unlimited?: boolean;
  expiry_days?: number | null;
};

type PaymentMethod = "card" | "cash";

type DiscountType = "none" | "blue_light" | "military";

type Props = {
  selectedCustomer: CustomerBalance | null;
  manualAdd: string;
  setManualAdd: (value: string) => void;
  onAddMinutes: (sale?: PackageSale) => Promise<void>;
  onEditCustomer: () => void;
  packages: PackageOption[];
  onAddPackageToBasket?: (pack: {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  is_unlimited?: boolean;
}) => void;
};

export default function CustomerCard({
  selectedCustomer,
  manualAdd,
  setManualAdd,
  onAddMinutes,
  onEditCustomer,
  packages,
  onAddPackageToBasket,
}: Props) {
  const [pendingPackage, setPendingPackage] =
    useState<PackageOption | null>(null);
    const [combinedPackage, setCombinedPackage] =
  useState<PackageOption | null>(null);

  const [sellingPackageId, setSellingPackageId] = useState<
    string | number | null
  >(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");
    const [discountsOpen, setDiscountsOpen] = useState(false);
const [selectedDiscount, setSelectedDiscount] =
  useState<DiscountType>("none");
const [discountExpiry, setDiscountExpiry] = useState("");
const [savingDiscount, setSavingDiscount] = useState(false);
   const [vipDiscountPercent, setVipDiscountPercent] = useState(0);

const [activeUnlimitedExpiry, setActiveUnlimitedExpiry] =
  useState<string | null>(null);

useEffect(() => {
  async function loadVipDiscount() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Failed to determine logged-in user:",
        userError?.message
      );
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("salon_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.salon_id) {
      console.error(
        "Failed to determine current salon:",
        profileError?.message || "Salon ID missing."
      );
      return;
    }

    const { data, error } = await supabase
      .from("vip_settings")
      .select("discount_percent")
      .eq("salon_id", profile.salon_id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load VIP discount:", error.message);
      return;
    }

    setVipDiscountPercent(Number(data?.discount_percent ?? 0));
  }

  void loadVipDiscount();
}, []);

useEffect(() => {
  async function loadUnlimitedStatus() {
    setActiveUnlimitedExpiry(null);

    if (!selectedCustomer) {
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Could not determine logged-in user for Unlimited status:",
        userError?.message
      );
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("salon_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.salon_id) {
      console.error(
        "Could not determine salon for Unlimited status:",
        profileError?.message || "Salon ID missing."
      );
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("purchases")
      .select("expiry_date")
      .eq("salon_id", profile.salon_id)
      .eq("customer_id", selectedCustomer.customer_id)
      .eq("payment_status", "paid")
      .eq("is_unlimited", true)
      .gte("expiry_date", today)
      .order("expiry_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Could not load Unlimited status:",
        error.message
      );
      return;
    }

    setActiveUnlimitedExpiry(data?.expiry_date ?? null);
  }

  void loadUnlimitedStatus();
}, [selectedCustomer]);
async function saveDiscount() {
  if (!selectedCustomer) return;

  if (selectedDiscount !== "none" && !discountExpiry) {
    window.alert("Please enter the discount expiry date.");
    return;
  }

  setSavingDiscount(true);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    window.alert(
      userError?.message || "Could not determine the logged-in user."
    );
    setSavingDiscount(false);
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    window.alert(
      profileError?.message || "Could not determine the current salon."
    );
    setSavingDiscount(false);
    return;
  }

  const { error } = await supabase
    .from("customers")
    .update({
      discount_type:
        selectedDiscount === "none" ? null : selectedDiscount,
      discount_expires_at:
        selectedDiscount === "none"
          ? null
          : `${discountExpiry}T23:59:59`,
    })
    .eq("customer_id", selectedCustomer.customer_id)
    .eq("salon_id", profile.salon_id);

  setSavingDiscount(false);

  if (error) {
    window.alert(error.message);
    return;
  }

  selectedCustomer.discount_type =
    selectedDiscount === "none" ? null : selectedDiscount;

  selectedCustomer.discount_expires_at =
    selectedDiscount === "none"
      ? null
      : `${discountExpiry}T23:59:59`;

  setDiscountsOpen(false);
}

  if (!selectedCustomer) return null;

  const customerName =
    selectedCustomer.full_name || "Unnamed Customer";

  const basePackages =
    packages.length > 0
      ? packages.filter(
          (pack) =>
            pack.active !== false &&
            (pack.is_unlimited === true || pack.minutes >= 30)
        )
      : [
          {
            id: 30,
            name: "30 minute package",
            minutes: 30,
            price: 19,
            expiry_days: 30,
            active: true,
            is_unlimited: false,
          },
          {
            id: 60,
            name: "60 minute package",
            minutes: 60,
            price: 34,
            expiry_days: 30,
            active: true,
            is_unlimited: false,
          },
          {
            id: 90,
            name: "90 minute package",
            minutes: 90,
            price: 47,
            expiry_days: 30,
            active: true,
            is_unlimited: false,
          },
          {
            id: 120,
            name: "120 minute package",
            minutes: 120,
            price: 55,
            expiry_days: 30,
            active: true,
            is_unlimited: false,
          },
          {
            id: 240,
            name: "240 minute package",
            minutes: 240,
            price: 100,
            expiry_days: 30,
            active: true,
            is_unlimited: false,
          },
        ];
        const isVip =
  !!selectedCustomer.vip_expires_at &&
  new Date(selectedCustomer.vip_expires_at) > new Date();

const staffDiscountIsActive =
  !!selectedCustomer.discount_expires_at &&
  new Date(selectedCustomer.discount_expires_at) >= new Date() &&
  (selectedCustomer.discount_type === "blue_light" ||
    selectedCustomer.discount_type === "military");

function getPackagePrice(pack: PackageOption) {
  const basePrice = Number(pack.price);

  const staffDiscountPercent =
    staffDiscountIsActive && pack.minutes >= 60 ? 10 : 0;

  const appliedDiscountPercent = Math.max(
    isVip ? vipDiscountPercent : 0,
    staffDiscountPercent
  );

  return Number(
    (basePrice * (1 - appliedDiscountPercent / 100)).toFixed(2)
  );
}

const visiblePackages = basePackages;

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
        minutes: packageToSell.is_unlimited ? 0 : packageToSell.minutes,
        amount: getPackagePrice(packageToSell),
        description:
          packageToSell.name ||
          (packageToSell.is_unlimited
            ? "Unlimited package"
            : `${packageToSell.minutes} minute package`),
        payment_method: paymentMethod,
        is_unlimited: packageToSell.is_unlimited === true,
        expiry_days: packageToSell.expiry_days,
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

          <div className="mt-2 flex flex-wrap items-center gap-3">
  <h2 className="text-2xl font-black text-white">
    {customerName}
  </h2>

  {activeUnlimitedExpiry && (
    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
      Unlimited
    </span>
  )}
</div>

          <p className="mt-1 text-sm text-slate-400">
            {selectedCustomer.email || "No email"} ·{" "}
            {selectedCustomer.phone || "No phone"}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
  {activeUnlimitedExpiry ? (
  <span className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white">
    Unlimited · Expires{" "}
    {new Date(
      `${activeUnlimitedExpiry}T00:00:00`
    ).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}
  </span>
) : (
  <>
    <span className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-black text-white">
      {selectedCustomer.total_minutes} mins Available
    </span>

    <span className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200">
      Expires: {formatExpiry(selectedCustomer.next_expiry)}
    </span>
  </>
)}

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
    {selectedCustomer.discount_type &&
  selectedCustomer.discount_expires_at &&
  new Date(selectedCustomer.discount_expires_at) >= new Date() && (
    <span
      className={`rounded-2xl border px-4 py-2 text-sm font-black ${
        selectedCustomer.discount_type === "blue_light"
          ? "border-sky-400/40 bg-sky-500/15 text-sky-300"
          : "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
      }`}
    >
      {selectedCustomer.discount_type === "blue_light"
        ? "🟦 Blue Light Card"
        : "🟢 Military Discount"}
      {" · Expires "}
      {new Date(
        selectedCustomer.discount_expires_at
      ).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
    </span>
)}
</div>
        </div>
        </div>

<div className="flex flex-wrap gap-3">
  <button
    type="button"
    onClick={onEditCustomer}
    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-200 hover:border-amber-400"
  >
    Edit Customer
  </button>

 <button
  type="button"
  onClick={() => setDiscountsOpen(true)}
  className="rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm font-black text-amber-300 transition hover:border-amber-400 hover:bg-amber-500/20"
>
  Discounts
</button>
</div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            Sell Package
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {visiblePackages.map((pack) => {
  const isSelling = sellingPackageId === pack.id;

  const displayPrice = getPackagePrice(pack);

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
                      {pack.is_unlimited
                        ? "Unlimited"
                        : `${pack.minutes} mins`}
                      <br />£{displayPrice.toFixed(2)}
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
                    {pendingPackage.is_unlimited
                      ? "Unlimited"
                      : `${pendingPackage.minutes} mins`}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Price
                  </p>

                  <p className="mt-1 text-xl font-black text-amber-400">
                    £{getPackagePrice(pendingPackage).toFixed(2)}
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
                carefully.{" "}
                {pendingPackage.is_unlimited
                  ? `Unlimited access will be activated for ${
                      pendingPackage.expiry_days ?? 30
                    } days as soon as the sale is confirmed.`
                  : "The minutes will be added as soon as the sale is confirmed."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
  onClick={() => {
    if (
      !pendingPackage ||
      sellingPackageId !== null ||
      !onAddPackageToBasket
    ) {
      return;
    }

    onAddPackageToBasket({
      id: Number(pendingPackage.id),
      name: pendingPackage.name,
      minutes: pendingPackage.minutes,
      price: getPackagePrice(pendingPackage),
      expiry_days: pendingPackage.expiry_days,
      is_unlimited: pendingPackage.is_unlimited,
    });

    setPendingPackage(null);
    setPaymentMethod("card");
  }}
  disabled={
    sellingPackageId !== null ||
    !onAddPackageToBasket
  }
  className="rounded-2xl border border-amber-400 bg-amber-400/10 px-4 py-3 font-black text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
>
  Add to Basket
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

           {combinedPackage && (
  <CombinedCheckout
    open={true}
    customerName={customerName}
    packageName={
      combinedPackage.name ||
      (combinedPackage.is_unlimited
        ? "Unlimited package"
        : `${combinedPackage.minutes} minute package`)
    }
    packagePrice={getPackagePrice(combinedPackage)}
    onClose={() => setCombinedPackage(null)}
  />
)}

      {discountsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-discounts-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Customer Benefits
                </p>

                <h2
                  id="customer-discounts-title"
                  className="mt-2 text-2xl font-black text-white"
                >
                  Customer Discounts
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Apply a verified staff-only discount for {customerName}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDiscountsOpen(false)}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-black text-slate-300 hover:border-slate-500"
                aria-label="Close customer discounts"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <button
  type="button"
  onClick={() => {
    setSelectedDiscount("none");
    setDiscountExpiry("");
  }}
  aria-pressed={selectedDiscount === "none"}
  className={`w-full rounded-2xl border p-4 text-left transition ${
    selectedDiscount === "none"
      ? "border-amber-400 bg-amber-400/10"
      : "border-slate-700 bg-slate-900 hover:border-amber-400"
  }`}
>
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-lg">
      {selectedDiscount === "none" ? "◉" : "○"}
    </span>

    <div>
      <p className="font-black text-white">No discount</p>
      <p className="mt-1 text-sm text-slate-400">
        Remove any existing Blue Light or Military discount.
      </p>
    </div>
  </div>
</button>

              <button
  type="button"
  onClick={() => setSelectedDiscount("blue_light")}
  aria-pressed={selectedDiscount === "blue_light"}
  className={`w-full rounded-2xl border p-4 text-left transition ${
    selectedDiscount === "blue_light"
      ? "border-sky-400 bg-sky-400/10"
      : "border-slate-700 bg-slate-900 hover:border-sky-400"
  }`}
>
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-lg text-sky-300">
      {selectedDiscount === "blue_light" ? "◉" : "○"}
    </span>

    <div>
      <p className="font-black text-white">Blue Light Card — 10%</p>
      <p className="mt-1 text-sm text-slate-400">
        Valid Blue Light Card and expiry date required.
      </p>
    </div>
  </div>
</button>

              <button
  type="button"
  onClick={() => setSelectedDiscount("military")}
  aria-pressed={selectedDiscount === "military"}
  className={`w-full rounded-2xl border p-4 text-left transition ${
    selectedDiscount === "military"
      ? "border-emerald-400 bg-emerald-400/10"
      : "border-slate-700 bg-slate-900 hover:border-emerald-400"
  }`}
>
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-lg text-emerald-300">
      {selectedDiscount === "military" ? "◉" : "○"}
    </span>

    <div>
      <p className="font-black text-white">Military — 10%</p>
      <p className="mt-1 text-sm text-slate-400">
        Military identification must be verified in salon.
      </p>
    </div>
  </div>
</button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="discount-expiry-date"
                className="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
              >
                Expiry Date
              </label>

              <input
  id="discount-expiry-date"
  type="date"
  value={discountExpiry}
  onChange={(event) => setDiscountExpiry(event.target.value)}
  disabled={selectedDiscount === "none"}
  required={selectedDiscount !== "none"}
  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
/>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDiscountsOpen(false)}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-black text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
  type="button"
  onClick={saveDiscount}
  disabled={savingDiscount}
  className="rounded-2xl bg-amber-400 px-4 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
>
  {savingDiscount ? "Saving..." : "Save Discount"}
</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
"use client";

import { useState } from "react";

import type {
  CheckoutPackage,
  CheckoutRetailItem,
} from "../hooks/useCheckoutBasket";

type PaymentMethod = "card" | "cash";

type Props = {
  basketPackage: CheckoutPackage | null;
  retailItems: CheckoutRetailItem[];
  onReduceRetail: (productId: string) => void;
  onRemoveRetail: (productId: string) => void;
  onClear: () => void;
  onRemovePackage?: () => void;

  onCheckout?: (paymentMethod: PaymentMethod) => Promise<void>;
};

export default function CheckoutBasketPreview({
  basketPackage,
  retailItems,
  onReduceRetail,
  onRemoveRetail,
  onClear,
  onRemovePackage,
  onCheckout,
}: Props) {
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");

  const [processing, setProcessing] = useState(false);

  const hasItems =
    basketPackage !== null || retailItems.length > 0;

  if (!hasItems) {
    return null;
  }

  const retailTotal = retailItems.reduce(
    (sum, item) =>
      sum + Number(item.selling_price) * item.quantity,
    0
  );

  const packageTotal = basketPackage
    ? Number(basketPackage.price)
    : 0;

  const basketTotal = packageTotal + retailTotal;

  async function handleCheckout() {
    if (!onCheckout || processing) {
      return;
    }

    setProcessing(true);

    try {
      await onCheckout(paymentMethod);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
            Current Basket
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            Combined Sale
          </h2>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={processing}
          className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-red-400 hover:text-red-300 disabled:opacity-50"
        >
          Clear Basket
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {basketPackage && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-400">
                Package
              </p>

              <p className="mt-1 font-black text-white">
                {basketPackage.name ||
                  `${basketPackage.minutes} minute package`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <p className="font-black text-emerald-400">
                £{Number(basketPackage.price).toFixed(2)}
              </p>

              {onRemovePackage && (
                <button
                  type="button"
                  onClick={onRemovePackage}
                  disabled={processing}
                  className="rounded-full border border-red-500/40 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        {retailItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <div>
              <p className="font-black text-white">
                {item.name}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-500">
                Qty {item.quantity} · £
                {Number(item.selling_price).toFixed(2)} each
              </p>
            </div>

            <div className="flex items-center gap-2">
              <p className="mr-2 font-black text-white">
                £
                {(
                  Number(item.selling_price) *
                  item.quantity
                ).toFixed(2)}
              </p>

              <button
                type="button"
                onClick={() => onReduceRetail(item.id)}
                disabled={processing}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 font-black text-white disabled:opacity-50"
              >
                −
              </button>

              <button
                type="button"
                onClick={() => onRemoveRetail(item.id)}
                disabled={processing}
                className="rounded-full border border-red-500/40 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-wide text-slate-400">
            Basket Total
          </p>

          <p className="text-3xl font-black text-white">
            £{basketTotal.toFixed(2)}
          </p>
        </div>

        {basketPackage && retailItems.length > 0 && (
          <p className="mt-2 text-right text-xs font-bold text-slate-500">
            Package £{packageTotal.toFixed(2)} + Retail £
            {retailTotal.toFixed(2)}
          </p>
        )}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Payment
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            disabled={processing}
            className={`rounded-xl px-4 py-3 font-black transition ${
              paymentMethod === "card"
                ? "bg-amber-400 text-black"
                : "border border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Card
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            disabled={processing}
            className={`rounded-xl px-4 py-3 font-black transition ${
              paymentMethod === "cash"
                ? "bg-amber-400 text-black"
                : "border border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            Cash
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleCheckout()}
        disabled={!onCheckout || processing}
        className="mt-5 w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {processing
          ? "Completing Sale..."
          : `Complete £${basketTotal.toFixed(2)} Sale`}
      </button>

      {!onCheckout && (
        <p className="mt-3 text-center text-xs text-slate-500">
          Checkout connection will be enabled next.
        </p>
      )}
    </section>
  );
}
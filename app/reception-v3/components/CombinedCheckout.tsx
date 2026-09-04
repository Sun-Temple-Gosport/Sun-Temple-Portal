"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RetailProduct = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

type BasketItem = RetailProduct & {
  quantity: number;
};

type PaymentMethod = "card" | "cash";

type Props = {
  open: boolean;
  customerName: string;
  packageName: string;
  packagePrice: number;
  onClose: () => void;
};

export default function CombinedCheckout({
  open,
  customerName,
  packageName,
  packagePrice,
  onClose,
}: Props) {
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    async function loadRetailProducts() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("products")
        .select("id, name, selling_price, stock_quantity")
        .eq("active", true)
        .gt("stock_quantity", 0)
        .order("name", { ascending: true });

      if (error) {
        console.error(
          "Could not load products for combined checkout:",
          error
        );

        setProducts([]);
        setErrorMessage(
          "Could not load retail products."
        );
        setLoading(false);
        return;
      }

      setProducts(
        (data ?? []).map((product) => ({
          id: String(product.id),
          name: product.name,
          selling_price: Number(product.selling_price),
          stock_quantity: Number(product.stock_quantity),
        }))
      );

      setLoading(false);
    }

    setBasket([]);
    setPaymentMethod("card");

    void loadRetailProducts();
  }, [open]);

  function addProduct(product: RetailProduct) {
    setBasket((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  }

  function reduceProduct(productId: string) {
    setBasket((current) =>
      current
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const retailTotal = useMemo(
    () =>
      basket.reduce(
        (sum, item) =>
          sum +
          Number(item.selling_price) * item.quantity,
        0
      ),
    [basket]
  );

  const checkoutTotal =
    Number(packagePrice) + retailTotal;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
              Combined Checkout
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Basket
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {customerName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:border-slate-500"
          >
            Close
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-300">
            Tanning Package
          </p>

          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="font-black text-white">
              {packageName}
            </p>

            <p className="text-lg font-black text-emerald-400">
              £{Number(packagePrice).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Add Retail Products
          </p>

          {loading && (
            <p className="mt-4 text-sm font-bold text-slate-400">
              Loading retail products...
            </p>
          )}

          {!loading && errorMessage && (
            <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4">
              <p className="text-sm font-bold text-red-300">
                {errorMessage}
              </p>
            </div>
          )}

          {!loading &&
            !errorMessage &&
            products.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {products.map((product) => {
                  const basketItem = basket.find(
                    (item) => item.id === product.id
                  );

                  return (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-white">
                            {product.name}
                          </p>

                          <p className="mt-1 text-lg font-black text-amber-400">
                            £
                            {Number(
                              product.selling_price
                            ).toFixed(2)}
                          </p>

                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {product.stock_quantity} in stock
                          </p>
                        </div>

                        {!basketItem ? (
                          <button
                            type="button"
                            onClick={() =>
                              addProduct(product)
                            }
                            className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black hover:bg-amber-300"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                reduceProduct(product.id)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 font-black text-white"
                            >
                              −
                            </button>

                            <span className="min-w-6 text-center font-black text-white">
                              {basketItem.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                addProduct(product)
                              }
                              disabled={
                                basketItem.quantity >=
                                product.stock_quantity
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 font-black text-black disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {basket.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Retail Basket
            </p>

            <div className="mt-3 space-y-3">
              {basket.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4"
                >
                  <p className="text-sm font-bold text-white">
                    {item.name} × {item.quantity}
                  </p>

                  <p className="font-black text-white">
                    £
                    {(
                      Number(item.selling_price) *
                      item.quantity
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
            Payment
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`rounded-xl px-4 py-3 font-black ${
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
              className={`rounded-xl px-4 py-3 font-black ${
                paymentMethod === "cash"
                  ? "bg-amber-400 text-black"
                  : "border border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-wide text-slate-400">
              Basket Total
            </span>

            <span className="text-3xl font-black text-white">
              £{checkoutTotal.toFixed(2)}
            </span>
          </div>

          {retailTotal > 0 && (
            <div className="mt-3 text-right text-xs font-bold text-slate-500">
              Package £{Number(packagePrice).toFixed(2)}
              {" + "}
              Retail £{retailTotal.toFixed(2)}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled
          className="mt-6 w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black opacity-50"
        >
          Complete Combined Sale
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          Checkout confirmation will be connected next.
        </p>
      </div>
    </div>
  );
}
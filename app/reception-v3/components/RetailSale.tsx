"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CheckoutRetailProduct } from "../hooks/useCheckoutBasket";

type RetailProduct = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  active: boolean;
};

type PaymentMethod = "card" | "cash" | "complimentary";
type Props = {
  onAddToBasket?: (product: CheckoutRetailProduct) => void;
  refreshKey?: number;
};

export default function RetailSale({
  onAddToBasket,
  refreshKey = 0,
}: Props) {
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedProduct, setSelectedProduct] =
    useState<RetailProduct | null>(null);

  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("card");

  const [savingSale, setSavingSale] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select("id, name, selling_price, stock_quantity, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Could not load retail products:", error);
      setProducts([]);
      setErrorMessage("Could not load retail products.");
      setLoading(false);
      return;
    }

    setProducts((data ?? []) as RetailProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => {
  void loadProducts();
}, [loadProducts, refreshKey]);

  function openSale(product: RetailProduct) {
    setSelectedProduct(product);
    setQuantity("1");
    setPaymentMethod("card");
    setSaleError("");
    setSuccessMessage("");
  }

  function closeSale() {
    if (savingSale) {
      return;
    }

    setSelectedProduct(null);
    setQuantity("1");
    setPaymentMethod("card");
    setSaleError("");
  }

  const quantityNumber = Number(quantity);

  const validQuantity =
    Number.isInteger(quantityNumber) &&
    quantityNumber > 0 &&
    selectedProduct !== null &&
    quantityNumber <= selectedProduct.stock_quantity;

  const retailTotal =
    selectedProduct && validQuantity
      ? Number(selectedProduct.selling_price) * quantityNumber
      : 0;

  const amountToPay =
    paymentMethod === "complimentary" ? 0 : retailTotal;

  async function completeSale() {
    if (!selectedProduct || !validQuantity) {
      return;
    }

    setSavingSale(true);
    setSaleError("");

    const productName = selectedProduct.name;

    const { error } = await supabase.rpc("sell_product", {
      p_product_id: selectedProduct.id,
      p_quantity: quantityNumber,
      p_payment_method: paymentMethod,
      p_customer_id: null,
    });

    if (error) {
      console.error("Could not complete retail sale:", error);
      setSaleError(
        error.message || "Could not complete the retail sale."
      );
      setSavingSale(false);
      return;
    }

    setSavingSale(false);
    setSelectedProduct(null);
    setQuantity("1");
    setPaymentMethod("card");

    setSuccessMessage(
      `${productName} sale completed successfully.`
    );

    await loadProducts();
  }

  return (
    <>
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
            Retail
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Sell Product
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Sell retail stock and automatically update stock levels.
          </p>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4">
            <p className="text-sm font-bold text-emerald-300">
              {successMessage}
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center">
            <p className="text-sm font-bold text-slate-300">
              Loading products...
            </p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/40 p-5">
            <p className="text-sm font-bold text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {!loading && !errorMessage && products.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
            <p className="font-bold text-white">
              No retail products available.
            </p>
          </div>
        )}

        {!loading && !errorMessage && products.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <p className="font-black text-white">
                  {product.name}
                </p>

                <div className="mt-3">
  <p className="text-xl font-black text-amber-400">
    £{Number(product.selling_price).toFixed(2)}
  </p>

  <p className="mt-1 text-xs font-bold text-slate-500">
    {product.stock_quantity} in stock
  </p>

  <div className="mt-4 grid grid-cols-2 gap-2">
    {onAddToBasket && product.stock_quantity > 0 && (
      <button
        type="button"
        onClick={() =>
          onAddToBasket({
            id: product.id,
            name: product.name,
            selling_price: Number(product.selling_price),
            stock_quantity: product.stock_quantity,
          })
        }
        className="rounded-xl border border-amber-400 px-3 py-2 text-xs font-black text-amber-300 transition hover:bg-amber-400/10"
      >
        Basket
      </button>
    )}

    <button
      type="button"
      onClick={() => openSale(product)}
      disabled={product.stock_quantity <= 0}
      className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {product.stock_quantity > 0
        ? "Sell Now"
        : "Sold Out"}
    </button>
  </div>
</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Retail Sale
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  {selectedProduct.name}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  £{Number(selectedProduct.selling_price).toFixed(2)} each
                </p>
              </div>

              <button
                type="button"
                onClick={closeSale}
                disabled={savingSale}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:border-slate-500 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400">
                  Available Stock
                </span>

                <span className="text-lg font-black text-emerald-400">
                  {selectedProduct.stock_quantity}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                max={selectedProduct.stock_quantity}
                step="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
                disabled={savingSale}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400 disabled:opacity-50"
              />

              {!validQuantity && quantity !== "" && (
                <p className="mt-2 text-xs font-bold text-red-400">
                  Enter a whole number between 1 and{" "}
                  {selectedProduct.stock_quantity}.
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
                Payment
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  disabled={savingSale}
                  className={`rounded-xl px-3 py-3 text-sm font-black ${
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
                  disabled={savingSale}
                  className={`rounded-xl px-3 py-3 text-sm font-black ${
                    paymentMethod === "cash"
                      ? "bg-amber-400 text-black"
                      : "border border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod("complimentary")
                  }
                  disabled={savingSale}
                  className={`rounded-xl px-3 py-3 text-sm font-black ${
                    paymentMethod === "complimentary"
                      ? "bg-amber-400 text-black"
                      : "border border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  Comp
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-wide text-slate-400">
                  Total
                </span>

                <span className="text-3xl font-black text-white">
                  £{amountToPay.toFixed(2)}
                </span>
              </div>

              {paymentMethod === "complimentary" &&
                retailTotal > 0 && (
                  <p className="mt-2 text-right text-xs text-slate-500">
                    Retail value £{retailTotal.toFixed(2)}
                  </p>
                )}
            </div>

            {saleError && (
              <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4">
                <p className="text-sm font-bold text-red-300">
                  {saleError}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void completeSale()}
              disabled={!validQuantity || savingSale}
              className="mt-6 w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingSale ? "Completing Sale..." : "Complete Sale"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
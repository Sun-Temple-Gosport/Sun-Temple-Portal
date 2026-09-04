"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  low_stock_level: number;
  active: boolean;
};

type MovementType =
  | "delivery"
  | "damaged"
  | "tester"
  | "complimentary"
  | "adjustment"
  | "stocktake";

export default function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  const [productName, setProductName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [startingStock, setStartingStock] = useState("0");
  const [lowStockLevel, setLowStockLevel] = useState("0");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] =
    useState<MovementType>("delivery");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const [formError, setFormError] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, selling_price, cost_price, stock_quantity, low_stock_level, active"
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("Could not load products:", error);
      setErrorMessage("Could not load stock products.");
      setProducts([]);
      setLoading(false);
      return;
    }

    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function resetAddForm() {
    setProductName("");
    setSellingPrice("");
    setCostPrice("");
    setStartingStock("0");
    setLowStockLevel("0");
    setFormError("");
  }

  function closeAddProduct() {
    if (savingProduct) {
      return;
    }

    resetAddForm();
    setShowAddProduct(false);
  }

  function openAdjustStock(product: Product) {
    setSelectedProduct(product);
    setMovementType("delivery");
    setAdjustQuantity("");
    setAdjustNote("");
    setAdjustError("");
    setSuccessMessage("");
  }

  function closeAdjustStock() {
    if (savingAdjustment) {
      return;
    }

    setSelectedProduct(null);
    setAdjustQuantity("");
    setAdjustNote("");
    setAdjustError("");
  }

  async function handleAddProduct() {
    setFormError("");
    setSuccessMessage("");

    const cleanName = productName.trim();
    const sell = Number(sellingPrice);
    const cost = Number(costPrice);
    const stock = Number(startingStock);
    const low = Number(lowStockLevel);

    if (!cleanName) {
      setFormError("Enter a product name.");
      return;
    }

    if (
      sellingPrice.trim() === "" ||
      Number.isNaN(sell) ||
      sell < 0
    ) {
      setFormError("Enter a valid selling price.");
      return;
    }

    if (
      costPrice.trim() === "" ||
      Number.isNaN(cost) ||
      cost < 0
    ) {
      setFormError("Enter a valid cost price.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setFormError(
        "Starting stock must be a whole number of 0 or more."
      );
      return;
    }

    if (!Number.isInteger(low) || low < 0) {
      setFormError(
        "Low stock level must be a whole number of 0 or more."
      );
      return;
    }

    setSavingProduct(true);

    const { error } = await supabase.rpc("create_product", {
      p_name: cleanName,
      p_selling_price: sell,
      p_cost_price: cost,
      p_starting_stock: stock,
      p_low_stock_level: low,
    });

    if (error) {
      console.error("Could not create product:", error);
      setFormError(error.message || "Could not create product.");
      setSavingProduct(false);
      return;
    }

    setSavingProduct(false);
    resetAddForm();
    setShowAddProduct(false);
    setSuccessMessage(`${cleanName} added successfully.`);

    await loadProducts();
  }

  async function handleAdjustStock() {
    if (!selectedProduct) {
      return;
    }

    setAdjustError("");
    setSuccessMessage("");

    const enteredQuantity = Number(adjustQuantity);

    if (
      adjustQuantity.trim() === "" ||
      !Number.isInteger(enteredQuantity)
    ) {
      setAdjustError("Enter a whole number.");
      return;
    }

    let quantityChange = 0;

    if (movementType === "delivery") {
      if (enteredQuantity <= 0) {
        setAdjustError("Delivery quantity must be greater than zero.");
        return;
      }

      quantityChange = enteredQuantity;
    }

    if (
      movementType === "damaged" ||
      movementType === "tester" ||
      movementType === "complimentary"
    ) {
      if (enteredQuantity <= 0) {
        setAdjustError("Enter the number of items to remove.");
        return;
      }

      quantityChange = -enteredQuantity;
    }

    if (movementType === "adjustment") {
      if (enteredQuantity === 0) {
        setAdjustError(
          "Enter a positive or negative stock adjustment."
        );
        return;
      }

      quantityChange = enteredQuantity;
    }

    if (movementType === "stocktake") {
      if (enteredQuantity < 0) {
        setAdjustError("Actual stock cannot be below zero.");
        return;
      }

      quantityChange =
        enteredQuantity - selectedProduct.stock_quantity;

      if (quantityChange === 0) {
        setAdjustError(
          "The stock level already matches this amount."
        );
        return;
      }
    }

    setSavingAdjustment(true);

    const { data, error } = await supabase.rpc(
      "adjust_product_stock",
      {
        p_product_id: selectedProduct.id,
        p_quantity_change: quantityChange,
        p_movement_type: movementType,
        p_note: adjustNote.trim() || null,
      }
    );

    if (error) {
      console.error("Could not adjust stock:", error);
      setAdjustError(
        error.message || "Could not update the stock level."
      );
      setSavingAdjustment(false);
      return;
    }

    const newStock = Number(data);

    setSavingAdjustment(false);
    setSelectedProduct(null);
    setAdjustQuantity("");
    setAdjustNote("");
    setSuccessMessage(
      `${selectedProduct.name} stock updated to ${newStock}.`
    );

    await loadProducts();
  }

  function adjustmentLabel() {
    if (movementType === "stocktake") {
      return "Actual Stock Count";
    }

    if (movementType === "adjustment") {
      return "Stock Change";
    }

    return "Quantity";
  }

  function adjustmentHelp() {
    if (movementType === "delivery") {
      return "Enter how many new items have arrived.";
    }

    if (movementType === "damaged") {
      return "Enter how many damaged items should be removed.";
    }

    if (movementType === "tester") {
      return "Enter how many items have been used as testers.";
    }

    if (movementType === "complimentary") {
      return "Enter how many items have been given away.";
    }

    if (movementType === "adjustment") {
      return "Use a positive number to add stock or a negative number to remove stock.";
    }

    return "Enter the number of items physically counted in stock.";
  }

  return (
    <>
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
              Owner Access
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Stock Management
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Manage retail products, stock levels and stock movements.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError("");
              setSuccessMessage("");
              setShowAddProduct(true);
            }}
            className="rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black hover:bg-amber-300"
          >
            Add Product
          </button>
        </div>

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/30 p-4">
            <p className="text-sm font-bold text-emerald-300">
              {successMessage}
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-sm font-bold text-slate-300">
              Loading stock...
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
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
            <p className="font-bold text-white">
              No products added yet.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Your retail products will appear here.
            </p>
          </div>
        )}

        {!loading && !errorMessage && products.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                      Product
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                      Cost
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                      Sell
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                      Stock
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                      Low At
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-400">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {products.map((product) => {
                    const isLowStock =
                      product.stock_quantity <= product.low_stock_level;

                    return (
                      <tr key={product.id}>
                        <td className="px-4 py-4 font-bold text-white">
                          {product.name}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-300">
                          £{Number(product.cost_price).toFixed(2)}
                        </td>

                        <td className="px-4 py-4 text-right text-sm font-bold text-white">
                          £{Number(product.selling_price).toFixed(2)}
                        </td>

                        <td
                          className={`px-4 py-4 text-right text-sm font-black ${
                            isLowStock
                              ? "text-red-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {product.stock_quantity}
                        </td>

                        <td className="px-4 py-4 text-right text-sm text-slate-400">
                          {product.low_stock_level}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              product.active
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {product.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openAdjustStock(product)}
                            className="rounded-full border border-amber-400 px-4 py-2 text-xs font-black text-amber-400 hover:bg-amber-400 hover:text-black"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Stock Management
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Add Product
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAddProduct}
                disabled={savingProduct}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:border-slate-500"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  Product Name
                </label>

                <input
                  type="text"
                  value={productName}
                  onChange={(event) =>
                    setProductName(event.target.value)
                  }
                  placeholder="e.g. Australian Gold Accelerator"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                    Selling Price
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      £
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={sellingPrice}
                      onChange={(event) =>
                        setSellingPrice(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-8 pr-4 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                    Cost Price
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      £
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={costPrice}
                      onChange={(event) =>
                        setCostPrice(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-8 pr-4 text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                    Starting Stock
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={startingStock}
                    onChange={(event) =>
                      setStartingStock(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                    Low Stock Warning
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={lowStockLevel}
                    onChange={(event) =>
                      setLowStockLevel(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-900 bg-red-950/40 p-4">
                  <p className="text-sm font-bold text-red-300">
                    {formError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleAddProduct()}
                disabled={savingProduct}
                className="w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProduct
                  ? "Adding Product..."
                  : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Stock Management
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Adjust Stock
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  {selectedProduct.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeAdjustStock}
                disabled={savingAdjustment}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-black text-slate-300 hover:border-slate-500"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Current Stock
              </p>

              <p className="mt-1 text-3xl font-black text-white">
                {selectedProduct.stock_quantity}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  Reason
                </label>

                <select
                  value={movementType}
                  onChange={(event) => {
                    setMovementType(
                      event.target.value as MovementType
                    );
                    setAdjustQuantity("");
                    setAdjustError("");
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                >
                  <option value="delivery">New Delivery</option>
                  <option value="damaged">Damaged</option>
                  <option value="tester">Used as Tester</option>
                  <option value="complimentary">
                    Complimentary / Given Away
                  </option>
                  <option value="adjustment">
                    Manual Adjustment
                  </option>
                  <option value="stocktake">
                    Stocktake — Set Actual Stock
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  {adjustmentLabel()}
                </label>

                <input
                  type="number"
                  step="1"
                  value={adjustQuantity}
                  onChange={(event) =>
                    setAdjustQuantity(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  {adjustmentHelp()}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                  Note
                </label>

                <textarea
                  value={adjustNote}
                  onChange={(event) =>
                    setAdjustNote(event.target.value)
                  }
                  rows={3}
                  placeholder="Optional note"
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              {adjustError && (
                <div className="rounded-xl border border-red-900 bg-red-950/40 p-4">
                  <p className="text-sm font-bold text-red-300">
                    {adjustError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleAdjustStock()}
                disabled={savingAdjustment}
                className="w-full rounded-xl bg-amber-400 px-5 py-3 font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAdjustment
                  ? "Updating Stock..."
                  : "Update Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
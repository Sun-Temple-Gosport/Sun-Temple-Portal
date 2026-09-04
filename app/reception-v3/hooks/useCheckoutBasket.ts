"use client";

import { useState } from "react";

export type CheckoutPackage = {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  is_unlimited?: boolean;
};

export type CheckoutRetailProduct = {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
};

export type CheckoutRetailItem = CheckoutRetailProduct & {
  quantity: number;
};

export function useCheckoutBasket() {
  const [basketPackage, setBasketPackage] =
    useState<CheckoutPackage | null>(null);

  const [retailItems, setRetailItems] =
    useState<CheckoutRetailItem[]>([]);

  function setPackage(pack: CheckoutPackage | null) {
    setBasketPackage(pack);
  }

  function addRetailProduct(product: CheckoutRetailProduct) {
    setRetailItems((current) => {
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

  function reduceRetailProduct(productId: string) {
    setRetailItems((current) =>
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

  function removeRetailProduct(productId: string) {
    setRetailItems((current) =>
      current.filter((item) => item.id !== productId)
    );
  }

  function clearBasket() {
    setBasketPackage(null);
    setRetailItems([]);
  }

  return {
    basketPackage,
    retailItems,

    setPackage,
    addRetailProduct,
    reduceRetailProduct,
    removeRetailProduct,
    clearBasket,
  };
}
"use client";
import { useEffect, useState } from "react";
import CustomerSearch from "./CustomerSearch";
import NewCustomer from "./NewCustomer";
import RecentCustomers from "./RecentCustomers";
import RetailSale from "./RetailSale";
import CustomerCard from "./CustomerCard";
import CustomerHistory from "./CustomerHistory";
import CustomerNotes from "./CustomerNotes";
import CheckoutBasketPreview from "./Basketpreview";
import {
  useCheckoutBasket,
  type CheckoutPackage,
  type CheckoutPaygItem,
  type CheckoutRetailItem,
} from "../hooks/useCheckoutBasket";

import type {
  CustomerBalance,
  Sale,
  CustomerHistory as CustomerHistoryType,
} from "../types";

type CustomerNote = {
  id: string;
  note: string;
  created_at: string;
};

type PackageOption = {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean;
};

type NewCustomerDetails = {
  full_name: string;
  phone: string;
  email: string;
};

type Props = {
  search: string;
  setSearch: (value: string) => void;
  customers: CustomerBalance[];
  recentCustomers: CustomerBalance[];
  selectedCustomer: CustomerBalance | null;
  loading: boolean;
  manualMinutes: string;
  packages: PackageOption[];
  customerHistory: CustomerHistoryType | null;
  customerNotes: CustomerNote[];
  pendingPaygItem?: CheckoutPaygItem | null;
onPendingPaygItemHandled?: () => void;
 onCombinedCheckout?: (details: {
  paymentMethod: "card" | "cash";
  basketPackage: CheckoutPackage | null;
  paygItem: CheckoutPaygItem | null;
  retailItems: CheckoutRetailItem[];
}) => Promise<boolean>;

onTakeCardPayment: (
  amount: number,
  description: string
) => Promise<boolean>;

onSearchCustomers: () => void;
  onSelectCustomer: (customer: CustomerBalance) => void;
  onCreateCustomer: (customer: NewCustomerDetails) => Promise<void>;
  onSetManualMinutes: (value: string) => void;
  onAddMinutes: (sale?: Sale) => Promise<void>;
  onAddCustomerNote: (note: string) => Promise<void>;
  onDeleteCustomerNote: (id: string) => Promise<void>;
  onEditCustomer: () => void;
  
};

export default function CustomerArea({
  search,
  setSearch,
  customers,
  recentCustomers,
  selectedCustomer,
  loading,
  manualMinutes,
  packages,
  customerHistory,
  customerNotes,
  pendingPaygItem,
onPendingPaygItemHandled,
  onSearchCustomers,
  onSelectCustomer,
  onCreateCustomer,
  onSetManualMinutes,
  onAddMinutes,
  onAddCustomerNote,
  onDeleteCustomerNote,
  onEditCustomer,
onCombinedCheckout,
onTakeCardPayment,
}: Props) {
   const checkoutBasket = useCheckoutBasket();
const [retailRefreshKey, setRetailRefreshKey] = useState(0);

useEffect(() => {
  if (!pendingPaygItem) {
    return;
  }

  checkoutBasket.setPayg(pendingPaygItem);
  onPendingPaygItemHandled?.();
}, [pendingPaygItem]);
  return (
    <>
      <CustomerSearch
        selectedCustomer={selectedCustomer}
        customers={customers}
        loading={loading}
        onSearch={onSearchCustomers}
        onSelectCustomer={onSelectCustomer}
        search={search}
        setSearch={setSearch}
      />

      <NewCustomer onCreateCustomer={onCreateCustomer} />

      <RecentCustomers
        recentCustomers={recentCustomers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={onSelectCustomer}
      />
<RetailSale
  onAddToBasket={checkoutBasket.addRetailProduct}
  refreshKey={retailRefreshKey}
  onTakeCardPayment={onTakeCardPayment}
/>

<CheckoutBasketPreview
  basketPackage={checkoutBasket.basketPackage}
  paygItem={checkoutBasket.paygItem}
  retailItems={checkoutBasket.retailItems}
  onReduceRetail={checkoutBasket.reduceRetailProduct}
  onRemoveRetail={checkoutBasket.removeRetailProduct}
  onRemovePackage={() => checkoutBasket.setPackage(null)}
  onRemovePayg={() => checkoutBasket.setPayg(null)}
  onClear={checkoutBasket.clearBasket}
  onCheckout={
  onCombinedCheckout
    ? async (paymentMethod) => {
          const success = await onCombinedCheckout({
            paymentMethod,
            basketPackage: checkoutBasket.basketPackage,
            paygItem: checkoutBasket.paygItem,
            retailItems: checkoutBasket.retailItems,
          });

          if (success) {
            checkoutBasket.clearBasket();
            setRetailRefreshKey((current) => current + 1);
          }
        }
      : undefined
  }
/>
      {selectedCustomer && (
        <>
          <CustomerCard
  selectedCustomer={selectedCustomer}
  manualAdd={manualMinutes}
  setManualAdd={onSetManualMinutes}
  onAddMinutes={onAddMinutes}
  onEditCustomer={onEditCustomer}
  packages={packages.map((pkg) => ({
    ...pkg,
    price: Number(pkg.price),
  }))}
  onAddPackageToBasket={checkoutBasket.setPackage}
/>

          <CustomerHistory
            customer={selectedCustomer}
            history={customerHistory}
          />

          <CustomerNotes
  notes={customerNotes}
  onAddNote={onAddCustomerNote}
  onDeleteNote={onDeleteCustomerNote}
/>
        </>
      )}
    </>
  );
}
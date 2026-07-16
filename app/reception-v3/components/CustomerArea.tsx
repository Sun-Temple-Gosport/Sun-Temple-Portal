"use client";

import CustomerSearch from "./CustomerSearch";
import NewCustomer from "./NewCustomer";
import RecentCustomers from "./RecentCustomers";
import CustomerCard from "./CustomerCard";
import CustomerHistory from "./CustomerHistory";
import CustomerNotes from "./CustomerNotes";

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
  onSearchCustomers,
  onSelectCustomer,
  onCreateCustomer,
  onSetManualMinutes,
  onAddMinutes,
  onAddCustomerNote,
  onDeleteCustomerNote,
  onEditCustomer,
}: Props) {
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
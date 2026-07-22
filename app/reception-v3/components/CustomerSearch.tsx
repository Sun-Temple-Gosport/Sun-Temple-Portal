"use client";

import { CustomerBalance } from "../types";
import { formatExpiry } from "../utils";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  customers: CustomerBalance[];
  selectedCustomer: CustomerBalance | null;
  onSearch: () => void;
  onSelectCustomer: (customer: CustomerBalance) => void;
};

export default function CustomerSearch({
  search,
  setSearch,
  loading,
  customers,
  selectedCustomer,
  onSearch,
  onSelectCustomer,
}: Props) {
  return (
    <section style={styles.panel}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Customer Search</h2>
      </div>

      <input
        style={styles.searchInput}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, email or phone"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
      />

      {loading && <p style={styles.loading}>Searching...</p>}

      {customers.length > 0 && (
        <div style={styles.resultsList}>
          {customers.map((customer) => {
            const isSelected =
              selectedCustomer?.customer_id === customer.customer_id;

            return (
              <button
                key={customer.customer_id}
                style={{
                  ...styles.customerRow,
                  border: isSelected
                    ? "2px solid #f5c542"
                    : "1px solid #334155",
                }}
                type="button"
onClick={() => onSelectCustomer(customer)}
>
                <div>
                  <strong style={styles.customerName}>
                    {customer.full_name || "No name"}
                  </strong>

                  <div style={styles.customerMeta}>
                    <span>{customer.email || "No email"}</span>
                    <span>{customer.phone || "No phone"}</span>
                  </div>
                </div>

                <div style={styles.customerStats}>
                  <strong style={styles.minutes}>
                    {customer.total_minutes} mins
                  </strong>
                  <span style={styles.expiry}>
                    {formatExpiry(customer.next_expiry)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: "#171717",
    border: "1px solid #292929",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "22px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    color: "#f5c542",
  },
  searchInput: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#ffffff",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  loading: {
    marginTop: "12px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  resultsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "18px",
  },
  customerRow: {
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "14px 16px",
    borderRadius: "14px",
    textAlign: "left",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    cursor: "pointer",
  },
  customerName: {
    display: "block",
    fontSize: "20px",
    color: "#ffffff",
    marginBottom: "6px",
  },
  customerMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    color: "#cbd5e1",
    fontSize: "14px",
  },
  customerStats: {
    textAlign: "right",
    minWidth: "150px",
  },
  minutes: {
    display: "block",
    color: "#34d399",
    fontSize: "22px",
  },
  expiry: {
    display: "block",
    color: "#cbd5e1",
    fontSize: "14px",
    marginTop: "4px",
  },
};
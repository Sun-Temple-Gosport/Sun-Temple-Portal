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
    <section
      style={{
        background: "#171717",
        border: "1px solid #292929",
        borderRadius: "18px",
        padding: "22px",
        marginBottom: "22px",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          color: "#f5c542",
        }}
      >
        Customer Search
      </h2>

      <div
        style={{
          display: "flex",
          gap: "12px",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or phone"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
          style={{
            flex: 1,
            padding: "16px",
            borderRadius: "12px",
            fontSize: "16px",
          }}
        />

        <button
          onClick={onSearch}
          style={{
            padding: "16px 24px",
            borderRadius: "12px",
            background: "#f5c542",
            color: "#111",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {customers.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: "12px",
            marginTop: "18px",
          }}
        >
          {customers.map((customer) => (
            <button
              key={customer.customer_id}
              onClick={() => onSelectCustomer(customer)}
              style={{
                background: "#fff",
                color: "#111",
                padding: "16px",
                borderRadius: "14px",
                textAlign: "left",
                cursor: "pointer",
                border:
                  selectedCustomer?.customer_id === customer.customer_id
                    ? "3px solid #f5c542"
                    : "1px solid #ddd",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                {customer.full_name}
              </h3>

              <p>{customer.email}</p>

              <p>{customer.phone}</p>

              <hr />

              <strong>{customer.total_minutes} mins</strong>

              <div
                style={{
                  float: "right",
                }}
              >
                {formatExpiry(customer.next_expiry)}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
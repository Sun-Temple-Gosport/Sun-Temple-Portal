"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import Header from "./components/ReceptionHeader";
import CustomerSearch from "./components/CustomerSearch";
import { formatExpiry, timeLeft } from "./utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CustomerBalance = {
  customer_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  total_minutes: number;
  next_expiry: string | null;
};

type BedSession = {
  id: string;
  customer_id: string;
  bed_name: string;
  minutes: number;
  started_at: string;
  ends_at: string;
  status: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

const beds = ["St Lucia", "Barbados", "St Kitts", "Antigua"];
const quickMinutes = [7, 10, 12, 15];

export default function ReceptionPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerBalance | null>(null);

  const [sessions, setSessions] = useState<BedSession[]>([]);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);

  const [customDeduct, setCustomDeduct] = useState("");
  const [manualAdd, setManualAdd] = useState("");
  const [bedMinutes, setBedMinutes] = useState("");

  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    loadBeds();

    const timer = setInterval(() => {
      setTick(Date.now());
      loadBeds();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function searchCustomers() {
    if (!search.trim()) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("customer_balances")
      .select("*")
      .or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
      .order("full_name", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setCustomers(data || []);
    setLoading(false);
  }

  async function refreshCustomer(customerId: string) {
    const { data } = await supabase
      .from("customer_balances")
      .select("*")
      .eq("customer_id", customerId)
      .single();

    if (data) {
      setSelectedCustomer(data);
      setCustomers((prev) =>
        prev.map((c) => (c.customer_id === customerId ? data : c))
      );
    }
  }

  async function loadBeds() {
    const { data, error } = await supabase
  .from("bed_sessions")
  .select("*")
  .eq("status", "occupied")
  .order("started_at", { ascending: false });

if (error) {
  console.log("Bed load error:", error.message);
  return;
}

    const now = Date.now();

    const active = (data || []).filter(
      (session) => new Date(session.ends_at).getTime() > now
    );

    const finished = (data || []).filter(
      (session) => new Date(session.ends_at).getTime() <= now
    );

    setSessions(active);

    for (const session of finished) {
      await supabase
        .from("bed_sessions")
        .update({ status: "complete" })
        .eq("id", session.id);
    }
  }

  async function addMinutes() {
    if (!selectedCustomer) {
      alert("Select a customer first");
      return;
    }

    const minutes = Number(manualAdd);

    if (!minutes || minutes <= 0) {
      alert("Enter minutes to add");
      return;
    }

    const { error } = await supabase.rpc("add_manual_minutes", {
      p_customer_id: selectedCustomer.customer_id,
      p_minutes: minutes,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await refreshCustomer(selectedCustomer.customer_id);
    setManualAdd("");
  }

  async function deductMinutes(minutes: number) {
    if (!selectedCustomer) {
      alert("Select a customer first");
      return;
    }

    if (!minutes || minutes <= 0) return;

    if (selectedCustomer.total_minutes < minutes) {
      alert("Customer does not have enough minutes");
      return;
    }

    const { error } = await supabase.rpc("use_customer_minutes", {
      p_customer_id: selectedCustomer.customer_id,
      p_minutes: minutes,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await refreshCustomer(selectedCustomer.customer_id);
    setCustomDeduct("");
  }

  async function startBed() {
    if (!selectedCustomer) {
      alert("Select a customer first");
      return;
    }

    if (!selectedBed) {
      alert("Select a bed first");
      return;
    }

    const minutes = Number(bedMinutes);

    if (!minutes || minutes <= 0) {
      alert("Enter bed minutes");
      return;
    }

    if (selectedCustomer.total_minutes < minutes) {
      alert("Customer does not have enough minutes");
      return;
    }

    const alreadyOccupied = sessions.find((s) => s.bed_name === selectedBed);

    if (alreadyOccupied) {
      alert(`${selectedBed} is already occupied`);
      return;
    }

    const { error } = await supabase.rpc("start_bed_session", {
      p_customer_id: selectedCustomer.customer_id,
      p_bed_name: selectedBed,
      p_minutes: minutes,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await refreshCustomer(selectedCustomer.customer_id);
    await loadBeds();

    setSelectedBed(null);
    setBedMinutes("");
  }

  function getBedSession(bed: string) {
    return sessions.find((session) => session.bed_name === bed);
  }

  function formatExpiry(date: string | null) {
    if (!date) return "No expiry";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function timeLeft(endsAt: string) {
    const remaining = new Date(endsAt).getTime() - tick;

    if (remaining <= 0) return "Complete";

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>☀️ Sun Temple Reception</h1>
          <p style={styles.subtitle}>Salon control, minutes and live beds</p>
        </div>

        <div style={styles.statusPill}>
          {sessions.length} active bed{sessions.length === 1 ? "" : "s"}
        </div>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Customer Search</h2>

        <div style={styles.searchRow}>
          <input
            style={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or phone"
            onKeyDown={(e) => {
              if (e.key === "Enter") searchCustomers();
            }}
          />

          <button style={styles.goldButton} onClick={searchCustomers}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {customers.length > 0 && (
          <div style={styles.customerResults}>
            {customers.map((customer) => (
              <button
                key={customer.customer_id}
                style={{
                  ...styles.customerResult,
                  border:
                    selectedCustomer?.customer_id === customer.customer_id
                      ? "3px solid #f5c542"
                      : "1px solid #333",
                }}
                onClick={() => setSelectedCustomer(customer)}
              >
                <strong>{customer.full_name || "No name"}</strong>
                <span>{customer.email || "No email"}</span>
                <span>{customer.phone || "No phone"}</span>

                <div style={styles.resultBottom}>
                  <b>{customer.total_minutes} mins</b>
                  <span>{formatExpiry(customer.next_expiry)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={styles.mainGrid}>
        <div style={styles.leftColumn}>
          <section style={styles.panel}>
            <h2 style={styles.sectionTitle}>Selected Customer</h2>

            {!selectedCustomer ? (
              <div style={styles.emptyBox}>Search and select a customer.</div>
            ) : (
              <>
                <div style={styles.customerHero}>
                  <div>
                    <h3 style={styles.customerName}>
                      {selectedCustomer.full_name || "No name"}
                    </h3>
                    <p style={styles.customerDetail}>
                      {selectedCustomer.email || "No email"}
                    </p>
                    <p style={styles.customerDetail}>
                      {selectedCustomer.phone || "No phone"}
                    </p>
                  </div>

                  <div style={styles.minutesBox}>
                    <div style={styles.minutesNumber}>
                      {selectedCustomer.total_minutes}
                    </div>
                    <div style={styles.minutesLabel}>minutes remaining</div>
                  </div>

                  <div style={styles.expiryBox}>
                    <div style={styles.expiryLabel}>Next Expiry</div>
                    <div style={styles.expiryDate}>
                      {formatExpiry(selectedCustomer.next_expiry)}
                    </div>
                  </div>
                </div>

                <div style={styles.actionGrid}>
                  <div style={styles.actionCard}>
                    <h3>Add Minutes</h3>
                    <p style={styles.helpText}>
                      Manual bonus or correction. One-month expiry.
                    </p>

                    <div style={styles.inlineRow}>
                      <input
                        style={styles.smallInput}
                        type="number"
                        value={manualAdd}
                        onChange={(e) => setManualAdd(e.target.value)}
                        placeholder="Minutes"
                      />
                      <button style={styles.greenButton} onClick={addMinutes}>
                        Add
                      </button>
                    </div>
                  </div>

                  <div style={styles.actionCard}>
                    <h3>Deduct Minutes</h3>

                    <div style={styles.quickButtons}>
                      {quickMinutes.map((mins) => (
                        <button
                          key={mins}
                          style={styles.quickButton}
                          onClick={() => deductMinutes(mins)}
                        >
                          -{mins}
                        </button>
                      ))}
                    </div>

                    <div style={styles.inlineRow}>
                      <input
                        style={styles.smallInput}
                        type="number"
                        value={customDeduct}
                        onChange={(e) => setCustomDeduct(e.target.value)}
                        placeholder="Custom"
                      />
                      <button
                        style={styles.goldButton}
                        onClick={() => deductMinutes(Number(customDeduct))}
                      >
                        Deduct
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {selectedBed && (
            <section style={styles.startBedPanel}>
              <h2 style={styles.sectionTitle}>Start {selectedBed}</h2>

              {selectedCustomer ? (
                <p style={styles.helpText}>
                  Customer:{" "}
                  <strong>{selectedCustomer.full_name || selectedCustomer.email}</strong>
                </p>
              ) : (
                <p style={styles.helpText}>Select a customer first.</p>
              )}

              <div style={styles.quickButtons}>
                {quickMinutes.map((mins) => (
                  <button
                    key={mins}
                    style={styles.quickButton}
                    onClick={() => setBedMinutes(String(mins))}
                  >
                    {mins}
                  </button>
                ))}
              </div>

              <div style={styles.inlineRow}>
                <input
                  style={styles.smallInput}
                  type="number"
                  value={bedMinutes}
                  onChange={(e) => setBedMinutes(e.target.value)}
                  placeholder="Minutes"
                />

                <button style={styles.greenButton} onClick={startBed}>
                  Start Bed
                </button>

                <button
                  style={styles.greyButton}
                  onClick={() => {
                    setSelectedBed(null);
                    setBedMinutes("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
        </div>

        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Live Bed Dashboard</h2>

          <div style={styles.bedGrid}>
            {beds.map((bed) => {
              const session = getBedSession(bed);
              const occupied = !!session;

              return (
                <button
                  key={bed}
                  style={{
                    ...styles.bedCard,
                    background: occupied ? "#3a1515" : "#12351f",
                    border:
                      selectedBed === bed
                        ? "3px solid #f5c542"
                        : occupied
                        ? "1px solid #ff6666"
                        : "1px solid #56d364",
                  }}
                  onClick={() => {
                    if (!occupied) setSelectedBed(bed);
                  }}
                >
                  <div style={styles.bedTop}>
                    <h3>{bed}</h3>
                    <span
                      style={{
                        ...styles.bedStatus,
                        background: occupied ? "#ff6666" : "#56d364",
                      }}
                    >
                      {occupied ? "Occupied" : "Available"}
                    </span>
                  </div>

                  {occupied && session ? (
                    <>
                      <div style={styles.timer}>{timeLeft(session.ends_at)}</div>

                      <div style={styles.bedCustomer}>
                        {session.profiles?.full_name ||
                          session.profiles?.email ||
                          "Customer"}
                      </div>

                      <div style={styles.bedMinutes}>
                        {session.minutes} minute session
                      </div>
                    </>
                  ) : (
                    <div style={styles.availableText}>Click to start bed</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "#fff",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
  },

  title: {
    margin: 0,
    fontSize: "36px",
    color: "#f5c542",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#bbb",
    fontSize: "16px",
  },

  statusPill: {
    background: "#1c1c1c",
    border: "1px solid #333",
    padding: "14px 18px",
    borderRadius: "999px",
    color: "#f5c542",
    fontWeight: "bold",
  },

  panel: {
    background: "#171717",
    border: "1px solid #292929",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "22px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  },

  sectionTitle: {
    margin: "0 0 16px",
    fontSize: "22px",
    color: "#f5c542",
  },

  searchRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  searchInput: {
    flex: 1,
    minWidth: "260px",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #444",
    background: "#fff",
    color: "#111",
    fontSize: "16px",
  },

  customerResults: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "12px",
    marginTop: "18px",
  },

  customerResult: {
    background: "#fff",
    color: "#111",
    padding: "16px",
    borderRadius: "14px",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    cursor: "pointer",
  },

  resultBottom: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    marginTop: "10px",
    paddingTop: "10px",
    borderTop: "1px solid #ddd",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(360px, 1fr) minmax(360px, 1fr)",
    gap: "22px",
    alignItems: "start",
  },

  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },

  emptyBox: {
    background: "#0f0f0f",
    border: "1px dashed #444",
    padding: "28px",
    borderRadius: "14px",
    color: "#aaa",
    textAlign: "center",
  },

  customerHero: {
    display: "grid",
    gridTemplateColumns: "1fr 220px 220px",
    gap: "18px",
    alignItems: "center",
    background: "#0f0f0f",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #292929",
  },

  customerName: {
    margin: "0 0 8px",
    fontSize: "24px",
  },

  customerDetail: {
    margin: "5px 0",
    color: "#bbb",
  },

  minutesBox: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "18px",
    textAlign: "center",
  },

  minutesNumber: {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#f5c542",
    lineHeight: "1",
  },

  minutesLabel: {
    marginTop: "8px",
    color: "#ddd",
    fontSize: "15px",
  },

  expiryBox: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "18px",
    textAlign: "center",
  },

  expiryLabel: {
    color: "#f5c542",
    fontWeight: "bold",
    marginBottom: "8px",
  },

  expiryDate: {
    fontSize: "20px",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
    marginTop: "18px",
  },

  actionCard: {
    background: "#0f0f0f",
    border: "1px solid #292929",
    borderRadius: "16px",
    padding: "18px",
  },

  helpText: {
    color: "#bbb",
    marginTop: 0,
  },

  inlineRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    alignItems: "center",
  },

  smallInput: {
    flex: 1,
    minWidth: "130px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #444",
    background: "#fff",
    color: "#111",
    fontSize: "16px",
  },

  quickButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },

  quickButton: {
    padding: "14px 18px",
    borderRadius: "12px",
    border: "none",
    background: "#f5c542",
    color: "#111",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },

  goldButton: {
    padding: "14px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#f5c542",
    color: "#111",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },

  greenButton: {
    padding: "14px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#56d364",
    color: "#111",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },

  greyButton: {
    padding: "14px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#aaa",
    color: "#111",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },

  startBedPanel: {
    background: "#171717",
    border: "2px solid #f5c542",
    borderRadius: "18px",
    padding: "22px",
  },

  bedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
  },

  bedCard: {
    color: "#fff",
    minHeight: "210px",
    borderRadius: "18px",
    padding: "20px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  bedTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
  },

  bedStatus: {
    color: "#111",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
  },

  timer: {
    fontSize: "52px",
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    margin: "20px 0 10px",
  },

  bedCustomer: {
    fontSize: "18px",
    fontWeight: "bold",
    textAlign: "center",
  },

  bedMinutes: {
    color: "#ddd",
    textAlign: "center",
    marginTop: "6px",
  },

  availableText: {
    color: "#cfcfcf",
    textAlign: "center",
    fontSize: "18px",
    marginTop: "40px",
  },
};
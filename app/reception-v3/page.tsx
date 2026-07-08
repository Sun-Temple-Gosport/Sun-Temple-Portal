"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import NewCustomer from "./components/NewCustomer";
import EditCustomer from "./components/EditCustomer";
import ActivityFeed from "./components/ActivityFeed";
import ReceptionHeader from "./components/ReceptionHeader";
import CustomerSearch from "./components/CustomerSearch";
import CustomerCard from "./components/CustomerCard";
import CustomerHistory from "./components/CustomerHistory";
import CustomerNotes from "./components/CustomerNotes";
import BedDashboard from "./components/BedDashboard";
import OwnerDashboard from "./components/OwnerDashboard";
import OwnerSettings from "./components/OwnerSettings";

import type {
  CustomerBalance,
  BedSession,
  Sale,
  Activity,
  CustomerHistory as CustomerHistoryType,
} from "./types";

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RECENT_CUSTOMERS_KEY = "sun-temple-recent-customers-v3";
const TOTAL_BEDS = 4;

export default function ReceptionV3Page() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<CustomerBalance[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
  
  
    useState<CustomerBalance | null>(null);

  const [customerHistory, setCustomerHistory] =
    useState<CustomerHistoryType | null>(null);
    const [editingCustomer, setEditingCustomer] = useState(false);
    const [ownerSettingsOpen, setOwnerSettingsOpen] = useState(false);
const [packages, setPackages] = useState<PackageOption[]>([]);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);

  const [sessions, setSessions] = useState<BedSession[]>([]);
  const [manualMinutes, setManualMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isOwnerMode, setIsOwnerMode] = useState(true);

  const [salesToday, setSalesToday] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [customersToday, setCustomersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);

  function getStartOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }

  function showMessage(text: string) {
    setMessage(text);
  }

  function saveRecentCustomer(customer: CustomerBalance) {
    const updated = [
      customer,
      ...recentCustomers.filter(
        (item) => item.customer_id !== customer.customer_id
      ),
    ].slice(0, 8);

    setRecentCustomers(updated);
    localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(updated));
  }

  function selectCustomer(customer: CustomerBalance) {
    setSelectedCustomer(customer);
    saveRecentCustomer(customer);
  }

  async function createCustomer(customer: {
  full_name: string;
  phone: string;
  email: string;
}) {
  setLoading(true);
  setMessage("");

  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({
      full_name: customer.full_name,
      phone: customer.phone || null,
      email: customer.email || null,
    })
    .select("*")
    .single();

  if (error || !newCustomer) {
    setLoading(false);
    showMessage(error?.message || "Could not create customer.");
    return;
  }

  const customerId = newCustomer.customer_id;

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: customerId,
    full_name: customer.full_name,
    phone: customer.phone || null,
    email: customer.email || null,
  });

  if (profileError) {
    setLoading(false);
    showMessage(profileError.message);
    return;
  }

  const { data: balance, error: balanceError } = await supabase
    .from("customer_balances")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  setLoading(false);

  if (balanceError) {
    showMessage(balanceError.message);
    return;
  }

  const customerToSelect =
    balance ||
    ({
      customer_id: customerId,
      full_name: customer.full_name,
      phone: customer.phone || null,
      email: customer.email || null,
      total_minutes: 0,
      next_expiry: null,
    } as CustomerBalance);

  setCustomers([customerToSelect]);
  setSearch(customer.full_name);
  selectCustomer(customerToSelect);
  showMessage("Customer created successfully.");
}
async function updateCustomer(
  full_name: string,
  phone: string,
  email: string
) {
  if (!selectedCustomer) return;

  const { error } = await supabase
    .from("customers")
    .update({
      full_name,
      phone,
      email,
    })
    .eq("customer_id", selectedCustomer.customer_id);

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage("Customer updated successfully.");

  setEditingCustomer(false);

  await refreshSelectedCustomer(selectedCustomer.customer_id);
  await searchCustomers();
}
  async function loadCustomerNotes(customerId: string) {
    const { data, error } = await supabase
      .from("customer_notes")
      .select("id, note, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(error.message);
      return;
    }

    setCustomerNotes(data || []);
  }

  async function addCustomerNote(note: string) {
    if (!selectedCustomer) {
      showMessage("Please select a customer first.");
      return;
    }

    const { error } = await supabase.from("customer_notes").insert({
      customer_id: selectedCustomer.customer_id,
      note,
    });

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage("Customer note saved.");
    await loadCustomerNotes(selectedCustomer.customer_id);
  }

  async function deleteCustomerNote(id: string) {
    const { error } = await supabase
      .from("customer_notes")
      .delete()
      .eq("id", id);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage("Customer note deleted.");

    if (selectedCustomer) {
      await loadCustomerNotes(selectedCustomer.customer_id);
    }
  }

  async function loadCustomerHistory(customerId: string) {
    const { data: visitData, error: visitError } = await supabase
      .from("bed_sessions")
      .select("*")
      .eq("customer_id", customerId)
      .order("started_at", { ascending: false });

    if (visitError) {
      showMessage(visitError.message);
      return;
    }

    const { data: salesData, error: salesError } = await supabase
      .from("reception_sales")
      .select("id, minutes, amount, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (salesError) {
      showMessage(salesError.message);
      return;
    }

    const purchases = salesData ?? [];

    setCustomerHistory({
      lastVisit: visitData?.[0] ?? null,
      purchases: purchases.slice(0, 5),
      totalVisits: visitData?.length ?? 0,
      totalMinutesPurchased: purchases.reduce(
        (sum, sale) => sum + Number(sale.minutes || 0),
        0
      ),
      totalSpent: purchases.reduce(
        (sum, sale) => sum + Number(sale.amount || 0),
        0
      ),
    });
  }

  async function loadActiveSessions() {
    const { data, error } = await supabase
      .from("bed_sessions")
      .select("*")
      .eq("status", "active")
      .order("started_at", { ascending: false });

    if (error) {
      showMessage(error.message);
      return;
    }

    setSessions(data || []);
  }
  async function loadPackages() {
  const { data, error } = await supabase
    .from("packages")
    .select("id, name, minutes, price, expiry_days, active")
    .order("minutes", { ascending: true });

  if (error) {
    showMessage(error.message);
    return;
  }

  setPackages(data || []);
}

async function savePackage(updatedPackage: PackageOption) {
  const { error } = await supabase
    .from("packages")
    .update({
      price: updatedPackage.price,
      expiry_days: updatedPackage.expiry_days,
      active: updatedPackage.active,
    })
    .eq("id", updatedPackage.id);

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage("Package updated.");
  await loadPackages();
}

  async function loadSessionsToday() {
    const { data, error } = await supabase
      .from("bed_sessions")
      .select("id")
      .gte("started_at", getStartOfToday());

    if (error) {
      showMessage(error.message);
      return;
    }

    setSessionsToday(data?.length ?? 0);
  }

  async function loadCustomersToday() {
    const { data, error } = await supabase
      .from("bed_sessions")
      .select("customer_id")
      .gte("started_at", getStartOfToday());

    if (error) {
      showMessage(error.message);
      return;
    }

    const uniqueCustomers = new Set((data ?? []).map((row) => row.customer_id));
    setCustomersToday(uniqueCustomers.size);
  }

  async function loadRevenueToday() {
    const { data, error } = await supabase
      .from("reception_sales")
      .select("id, amount")
      .gte("created_at", getStartOfToday());

    if (error) {
      showMessage(error.message);
      return;
    }

    const total = (data ?? []).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );

    setRevenueToday(total);
    setSalesToday(data?.length ?? 0);
  }

  async function loadActivities() {
    const { data, error } = await supabase
      .from("reception_sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      showMessage(error.message);
      return;
    }

    setActivities(
      (data ?? []).map((sale) => ({
        id: sale.id,
        text: `💰 ${sale.customer_name || "Customer"} purchased ${
          sale.minutes
        } mins (£${sale.amount})`,
        time: new Date(sale.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))
    );
  }

  async function refreshDashboardStats() {
    await Promise.all([
      loadActiveSessions(),
      loadSessionsToday(),
      loadCustomersToday(),
      loadRevenueToday(),
      loadActivities(),
    ]);
  }

  useEffect(() => {
    const term = search.trim();

    if (term.length < 2) {
      setCustomers([]);
      return;
    }

    const timer = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerHistory(null);
      setCustomerNotes([]);
      return;
    }

    loadCustomerHistory(selectedCustomer.customer_id);
    loadCustomerNotes(selectedCustomer.customer_id);
  }, [selectedCustomer?.customer_id]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_CUSTOMERS_KEY);

    if (stored) {
      try {
        setRecentCustomers(JSON.parse(stored));
      } catch {
        localStorage.removeItem(RECENT_CUSTOMERS_KEY);
      }
    }

    refreshDashboardStats();
    {isOwnerMode && (
  <button
    type="button"
    onClick={() => {
      loadPackages();
      setOwnerSettingsOpen(true);
    }}
    className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300"
  >
    Settings
  </button>
)}

    const channel = supabase
      .channel("reception-v3-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bed_sessions" },
        () => {
          refreshDashboardStats();
          if (selectedCustomer) {
            loadCustomerHistory(selectedCustomer.customer_id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reception_sales" },
        () => {
          refreshDashboardStats();
          if (selectedCustomer) {
            loadCustomerHistory(selectedCustomer.customer_id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_notes" },
        () => {
          if (selectedCustomer) {
            loadCustomerNotes(selectedCustomer.customer_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCustomer?.customer_id]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  async function searchCustomers() {
    if (!search.trim()) return;

    setLoading(true);
    setMessage("");

    const term = search.trim();

    const { data, error } = await supabase
      .from("customer_balances")
      .select("*")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      .order("full_name", { ascending: true });

    setLoading(false);

    if (error) {
      showMessage(error.message);
      return;
    }

    setCustomers(data || []);
  }

  async function refreshSelectedCustomer(customerId?: string) {
    const id = customerId || selectedCustomer?.customer_id;
    if (!id) return;

    const { data, error } = await supabase
      .from("customer_balances")
      .select("*")
      .eq("customer_id", id)
      .single();

    if (error || !data) return;

    setSelectedCustomer(data);
    await loadCustomerHistory(id);
    await loadCustomerNotes(id);

    setCustomers((prev) =>
      prev.map((customer) => (customer.customer_id === id ? data : customer))
    );

    setRecentCustomers((prev) => {
      const updated = prev.map((customer) =>
        customer.customer_id === id ? data : customer
      );

      localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  async function recordSale(sale: Sale) {
    if (!selectedCustomer) return false;

    const { error } = await supabase.from("reception_sales").insert({
      customer_id: selectedCustomer.customer_id,
      customer_name: selectedCustomer.full_name || "Customer",
      minutes: sale.minutes,
      amount: sale.amount,
    });

    if (error) {
      showMessage(error.message);
      return false;
    }

    return true;
  }

  async function addMinutes(sale?: Sale) {
    if (!selectedCustomer) {
      showMessage("Please select a customer first.");
      return;
    }

    const minutesToAdd = sale?.minutes ?? Number(manualMinutes);

    if (!minutesToAdd || minutesToAdd <= 0) {
      showMessage("Please enter valid minutes.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("add_manual_minutes", {
      p_customer_id: selectedCustomer.customer_id,
      p_minutes: minutesToAdd,
    });

    setLoading(false);

    if (error) {
      showMessage(error.message);
      return;
    }

    if (sale) {
      const recorded = await recordSale(sale);
      if (!recorded) return;

      showMessage(`✓ Sold ${sale.description} (£${sale.amount})`);
    } else {
      showMessage(`${minutesToAdd} minutes added.`);
    }

    setManualMinutes("");

await refreshSelectedCustomer(selectedCustomer.customer_id);
await searchCustomers();
await refreshDashboardStats();
  }

  async function deductMinutes(minutesToUse: number) {
    if (!selectedCustomer) {
      showMessage("Please select a customer first.");
      return false;
    }

    if (!minutesToUse || minutesToUse <= 0) {
      showMessage("Please enter valid minutes.");
      return false;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("use_customer_minutes", {
      p_customer_id: selectedCustomer.customer_id,
      p_minutes: minutesToUse,
    });

    setLoading(false);

    if (error) {
      showMessage(error.message);
      return false;
    }

    await refreshSelectedCustomer();
    return true;
  }

  async function startBedSession(bedName: string, minutes: number) {
    if (!selectedCustomer) {
      showMessage("Please select a customer first.");
      return false;
    }

    const deducted = await deductMinutes(minutes);
    if (!deducted) return false;

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + minutes * 60 * 1000);

    const { error } = await supabase.from("bed_sessions").insert({
      customer_id: selectedCustomer.customer_id,
      customer_name: selectedCustomer.full_name || "Customer",
      bed_name: bedName,
      minutes,
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "active",
    });

    if (error) {
      showMessage(error.message);
      return false;
    }

    showMessage(`${bedName} started for ${minutes} minutes.`);
    await refreshSelectedCustomer();
    await refreshDashboardStats();
    return true;
  }

  async function finishBedSession(sessionId: string) {
    const { error } = await supabase
      .from("bed_sessions")
      .update({ status: "finished" })
      .eq("id", sessionId);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage("Bed session finished.");
    await refreshDashboardStats();

    if (selectedCustomer) {
      await loadCustomerHistory(selectedCustomer.customer_id);
    }
  }

  const activeBeds = sessions.filter((session) => session.status === "active");

  const bedsRunning = activeBeds.filter(
    (session) => new Date(session.ends_at).getTime() > Date.now()
  ).length;

  const bedsFree = Math.max(0, TOTAL_BEDS - activeBeds.length);
  const occupancy = Math.round((bedsRunning / TOTAL_BEDS) * 100);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <ReceptionHeader activeBeds={activeBeds.length} />

      <div className="mx-auto flex max-w-7xl justify-end gap-2 px-4 pt-4 md:px-8">
        <button
          type="button"
          onClick={() => setIsOwnerMode(true)}
          className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
            isOwnerMode
              ? "bg-amber-400 text-black"
              : "border border-slate-700 bg-slate-900 text-slate-300"
          }`}
        >
          Owner
        </button>
        {isOwnerMode && (
  <button
    type="button"
    onClick={() => {
      loadPackages();
      setOwnerSettingsOpen(true);
    }}
    className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-300 hover:border-amber-400"
  >
    Settings
  </button>
)}

        <button
          type="button"
          onClick={() => setIsOwnerMode(false)}
          className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
            !isOwnerMode
              ? "bg-amber-400 text-black"
              : "border border-slate-700 bg-slate-900 text-slate-300"
          }`}
        >
          Staff
        </button>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        {isOwnerMode && (
          <OwnerDashboard
            revenueToday={revenueToday}
            salesToday={salesToday}
            customersToday={customersToday}
            sessionsToday={sessionsToday}
            bedsRunning={bedsRunning}
            bedsFree={bedsFree}
            occupancy={occupancy}
          />
        )}

        {message && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-100">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <CustomerSearch
              selectedCustomer={selectedCustomer}
              customers={customers}
              loading={loading}
              onSearch={searchCustomers}
              onSelectCustomer={selectCustomer}
              search={search}
              setSearch={setSearch}
            />

            <NewCustomer onCreateCustomer={createCustomer} />

            {recentCustomers.length > 0 && (
              <section className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
                    Recently Used
                  </p>

                  <p className="hidden text-xs font-bold text-slate-500 sm:block">
                    One-click customer select
                  </p>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1">
                  {recentCustomers.map((customer) => {
                    const isSelected =
                      selectedCustomer?.customer_id === customer.customer_id;

                    return (
                      <button
                        key={customer.customer_id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className={`min-w-[210px] rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${
                          isSelected
                            ? "border-amber-400 bg-amber-500/10"
                            : "border-slate-700 bg-slate-950 hover:border-amber-400 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-white">
                              {customer.full_name || "Unnamed Customer"}
                            </p>
                            <p className="mt-1 truncate text-xs font-medium text-slate-400">
                              {customer.phone || customer.email || "No contact"}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-2xl font-black leading-none text-emerald-400">
                              {customer.total_minutes ?? 0}
                            </p>
                            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              mins
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {selectedCustomer && (
              <>
                <CustomerCard
  selectedCustomer={selectedCustomer}
  manualAdd={manualMinutes}
  setManualAdd={setManualMinutes}
  onAddMinutes={addMinutes}
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
                  onAddNote={addCustomerNote}
                  
                />
              </>
            )}

            <BedDashboard
              selectedCustomer={selectedCustomer}
              sessions={sessions}
              onStartSession={startBedSession}
              onFinishSession={finishBedSession}
            />
          </div>

          <div className="space-y-5">
            {isOwnerMode && <ActivityFeed activities={activities} />}
          </div>
        </div>
      </div>
          <EditCustomer
        open={editingCustomer}
        customer={selectedCustomer}
        onClose={() => setEditingCustomer(false)}
        onSave={updateCustomer}
      />
    <OwnerSettings
  open={ownerSettingsOpen}
  packages={packages}
  onClose={() => setOwnerSettingsOpen(false)}
  onSave={savePackage}
/>
    </main>
  );
}
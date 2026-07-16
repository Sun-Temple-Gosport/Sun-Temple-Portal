"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EditCustomer from "./components/EditCustomer";
import ActivityFeed from "./components/ActivityFeed";
import ReceptionHeader from "./components/ReceptionHeader";
import BedDashboard from "./components/BedDashboard";
import OwnerSettings from "./components/OwnerSettings";
import OwnerTabs, { type OwnerView } from "./components/OwnerTabs";
import CustomerArea from "./components/CustomerArea";
import OwnerArea from "./components/OwnerArea";
import { supabase } from "./lib/supabase";
import { recordSale as recordSaleService } from "./services/sales";
import { useDashboard } from "./hooks/useDashboard";
import {
  loadCustomerNotes as loadCustomerNotesService,
  addCustomerNote as addCustomerNoteService,
  deleteCustomerNote as deleteCustomerNoteService,
} from "./services/notes";
import {
  loadPackages as loadPackagesService,
  savePackage as savePackageService,
} from "./services/packages";
import {
  searchCustomers as searchCustomersService,
  createCustomer as createCustomerService,
  updateCustomer as updateCustomerService,
  loadCustomerBalance,
  loadCustomerBalanceOptional,
} from "./services/customers";
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



type UserRole = "owner" | "staff" | "customer";



const RECENT_CUSTOMERS_KEY = "sun-temple-recent-customers-v3";
const TODAY_ACTIVITY_KEY = "reception-v3-today-activity";
const TOTAL_BEDS = 4;

export default function ReceptionV3Page() {
    const router = useRouter();
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
  const [activities, setActivities] = useState<Activity[]>(() => {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(TODAY_ACTIVITY_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as Activity[];
  } catch {
    localStorage.removeItem(TODAY_ACTIVITY_KEY);
    return [];
  }
});
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [ownerView, setOwnerView] = useState<OwnerView>("dashboard");
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [userName, setUserName] = useState("Staff User");

  const dashboard = useDashboard({
  getStartOfToday,
  showMessage,
});

const {
  salesToday,
  setSalesToday,
  sessionsToday,
  setSessionsToday,
  customersToday,
  setCustomersToday,
  revenueToday,
  setRevenueToday,
  cardRevenueToday,
  setCardRevenueToday,
  cashRevenueToday,
  setCashRevenueToday,
  complimentaryToday,
  setComplimentaryToday,
  minutesSoldToday,
  setMinutesSoldToday,
  cashUpSales,
  loadRevenueToday,
  loadCashUpSales,
} = dashboard;

  function getStartOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }

  function showMessage(text: string) {
    setMessage(text);
  }

  async function logAudit({
  action,
  customerName,
  details,
}: {
  action: string;
  customerName?: string | null;
  details?: string | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Audit log skipped: no authenticated user.");
    return;
  }

  const { error } = await supabase.from("audit_log").insert({
    staff_id: user.id,
    staff_name: userName || "Staff User",
    action,
    customer_name: customerName || null,
    details: details || null,
  });

  if (error) {
    console.error("Audit log failed:", error);
  }
}

  async function loadUserRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    

    if (!user) {
      setUserRole("customer");
      setIsOwnerMode(false);
      setAuthLoaded(true);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();
      


    if (error) {
      setUserRole("customer");
      setIsOwnerMode(false);
      setAuthLoaded(true);
      return;
    }

    const role = data?.role?.toLowerCase();
    setUserName(data?.full_name || data?.email || "Staff User");
    

    if (role === "owner" || role === "staff") {
      setUserRole(role);
      setIsOwnerMode(role === "owner");
    } else {
      setUserRole("customer");
      setIsOwnerMode(false);
    }

    setAuthLoaded(true);
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
  }async function createCustomer(customer: {
  full_name: string;
  phone: string;
  email: string;
}) {
  setLoading(true);
  setMessage("");

  const { data: newCustomer, error } =
    await createCustomerService(customer);

  if (error || !newCustomer) {
    setLoading(false);
    showMessage(error?.message || "Could not create customer.");
    return;
  }

  const customerId = newCustomer.customer_id;

  const {
    data: balance,
    error: balanceError,
  } = await loadCustomerBalanceOptional(customerId);

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

    const { error } = await updateCustomerService(
  selectedCustomer.customer_id,
  full_name,
  phone,
  email
);
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
  const { data, error } = await loadCustomerNotesService(customerId);

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

  const { error } = await addCustomerNoteService(
    selectedCustomer.customer_id,
    note
  );

  if (error) {
    showMessage(error.message);
    return;
  }

  showMessage("Customer note saved.");
  await loadCustomerNotes(selectedCustomer.customer_id);
}

async function deleteCustomerNote(id: string) {
  const { error } = await deleteCustomerNoteService(id);

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
  const { data, error } = await loadPackagesService();

  if (error) {
    showMessage(error.message);
    return;
  }

  setPackages(data || []);
}

  async function savePackage(updatedPackage: PackageOption) {
  const { error } = await savePackageService(updatedPackage);

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

  


async function saveCashUp({
  businessDate,
  revenue,
  cardRevenue,
  cashRevenue,
  complimentaryRevenue,
  expectedCash,
  countedCash,
  difference,
  packagesSold,
  minutesSold,
  customersToday,
  sessionsToday,
}: {
  businessDate: string;
  revenue: number;
  cardRevenue: number;
  cashRevenue: number;
  complimentaryRevenue: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  packagesSold: number;
  minutesSold: number;
  customersToday: number;
  sessionsToday: number;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("cash_ups").upsert({
    business_date: businessDate,
    revenue,
    card_revenue: cardRevenue,
    cash_revenue: cashRevenue,
    complimentary_revenue: complimentaryRevenue,
    expected_cash: expectedCash,
    counted_cash: countedCash,
    difference,
    packages_sold: packagesSold,
    minutes_sold: minutesSold,
    customers_today: customersToday,
    sessions_today: sessionsToday,
    closed_by: user?.id ?? null,
    closed_at: new Date().toISOString(),
  });

  if (error) {
    showMessage(error.message);
    return false;
  }

  showMessage("Cash-up saved successfully.");

  return true;
}

  async function refreshDashboardStats() {
  await Promise.all([
    loadActiveSessions(),
    loadSessionsToday(),
    loadCustomersToday(),
    loadRevenueToday(),
    loadCashUpSales(),
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

    loadUserRole();
    loadPackages();
    refreshDashboardStats();

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
  localStorage.setItem(TODAY_ACTIVITY_KEY, JSON.stringify(activities));
}, [activities]);

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

  const { data, error } = await searchCustomersService(term);

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

  const { error } = await recordSaleService(
    selectedCustomer.customer_id,
    selectedCustomer.full_name || "Customer",
    sale
  );

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

  await logAudit({
    action: "Package Sold",
    customerName: selectedCustomer.full_name || "Unnamed Customer",
    details: `${sale.description} (£${Number(sale.amount).toFixed(2)})`,
  });

  setActivities((current) => [
    {
      id: crypto.randomUUID(),
      text: `✓ Sold ${sale.description} (£${Number(sale.amount).toFixed(2)}) to ${
        selectedCustomer.full_name || "Customer"
      }`,
      time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    ...current,
  ]);

  showMessage(`✓ Sold ${sale.description} (£${sale.amount})`);
} else {
  await logAudit({
    action: "Manual Minutes Added",
    customerName: selectedCustomer.full_name || "Unnamed Customer",
    details: `${minutesToAdd} minutes added`,
  });

  setActivities((current) => [
    {
      id: crypto.randomUUID(),
      text: `✓ Added ${minutesToAdd} manual minutes to ${
        selectedCustomer.full_name || "Customer"
      }`,
      time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    ...current,
  ]);

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

  if (!authLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl">
          <p className="text-sm font-bold text-slate-300">
            Loading Reception...
          </p>
        </div>
      </main>
    );
  }

  if (userRole !== "owner" && userRole !== "staff") {
  router.push("/staff-login");
  return null;
}
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <ReceptionHeader
  activeBeds={activeBeds.length}
  userName={userName}
  userRole={userRole === "owner" ? "owner" : "staff"}
/>

      {userRole === "owner" && (
  <OwnerTabs
    isOwnerMode={isOwnerMode}
    ownerView={ownerView}
    onSelectView={(view) => {
      setIsOwnerMode(true);
      setOwnerView(view);
    }}
    onOpenSettings={() => {
      loadPackages();
      setOwnerSettingsOpen(true);
    }}
    onEnterStaffMode={() => {
      setIsOwnerMode(false);
      setOwnerView("staff");
    }}
  />
)}
  
  
  
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        
  {userRole === "owner" && isOwnerMode && (
  <OwnerArea
    ownerView={ownerView}
    revenueToday={revenueToday}
    cardRevenueToday={cardRevenueToday}
    cashRevenueToday={cashRevenueToday}
    complimentaryToday={complimentaryToday}
    minutesSoldToday={minutesSoldToday}
    salesToday={salesToday}
    customersToday={customersToday}
    sessionsToday={sessionsToday}
    bedsRunning={bedsRunning}
    bedsFree={bedsFree}
    occupancy={occupancy}
    cashUpSales={cashUpSales}
    onSaveCashUp={saveCashUp}
  />
)}

{(!isOwnerMode || ownerView === "staff") && (
<div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
  <div className="space-y-5">
    
            <CustomerArea
  search={search}
  setSearch={setSearch}
  customers={customers}
  recentCustomers={recentCustomers}
  selectedCustomer={selectedCustomer}
  loading={loading}
  manualMinutes={manualMinutes}
  packages={packages}
  customerHistory={customerHistory}
  customerNotes={customerNotes}
  onSearchCustomers={searchCustomers}
  onSelectCustomer={selectCustomer}
  onCreateCustomer={createCustomer}
  onSetManualMinutes={setManualMinutes}
  onAddMinutes={addMinutes}
  onAddCustomerNote={addCustomerNote}
  onDeleteCustomerNote={deleteCustomerNote}
   onEditCustomer={() => setEditingCustomer(true)}
/>

            <BedDashboard
              selectedCustomer={selectedCustomer}
              sessions={sessions}
              onStartSession={startBedSession}
              onFinishSession={finishBedSession}
            />
          </div>

          <div className="space-y-5">
            <ActivityFeed activities={activities} />
          </div>
        </div>
      )}
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
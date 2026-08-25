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
import {
  loadCustomerBedSessions,
  loadSessionsToday as loadSessionsTodayService,
  finishBedSession as finishBedSessionService,
  startBedSession as startBedSessionService,
  startPaygBedSession as startPaygBedSessionService,
  loadCustomersToday as loadCustomersTodayService,
  loadActiveSessions as loadActiveSessionsService,
} from "./services/beds";
import OwnerArea from "./components/OwnerArea";
import {
  saveCashUp as saveCashUpService,
  type CashUpData,
} from "./services/cashup";
import { supabase } from "./lib/supabase";
import {
  recordSale as recordSaleService,
  loadCustomerSales,
} from "./services/sales";
import { useDashboard } from "./hooks/useDashboard";
import {
  loadCustomerNotes as loadCustomerNotesService,
  addCustomerNote as addCustomerNoteService,
  deleteCustomerNote as deleteCustomerNoteService,
} from "./services/notes";
import {
  loadPackages as loadPackagesService,
  savePackage as savePackageService,
  createPackageService,
  deletePackageService,
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
  is_unlimited: boolean;
};



type UserRole = "owner" | "staff" | "customer";



const RECENT_CUSTOMERS_KEY_PREFIX = "tansalonos-recent-customers-v3";
const TODAY_ACTIVITY_KEY_PREFIX = "reception-v3-today-activity";
const TODAY_ACTIVITY_DATE_KEY_PREFIX = "reception-v3-today-activity-date";
const TOTAL_BEDS = 4;

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ReceptionV3Page() {
    const router = useRouter();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<CustomerBalance[]>([]);
const [selectedCustomer, setSelectedCustomer] =
  useState<CustomerBalance | null>(null);

const [unlimitedCustomerIds, setUnlimitedCustomerIds] =
  useState<Set<string>>(() => new Set());

const [currentSalonId, setCurrentSalonId] = useState<string | null>(null);
    const recentCustomersKey = currentSalonId
  ? `${RECENT_CUSTOMERS_KEY_PREFIX}:${currentSalonId}`
  : null;
  useEffect(() => {
  async function loadRecentUnlimitedCustomers() {
    if (!currentSalonId || recentCustomers.length === 0) {
      setUnlimitedCustomerIds(new Set());
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("purchases")
      .select("customer_id")
      .eq("salon_id", currentSalonId)
      .eq("payment_status", "paid")
      .eq("is_unlimited", true)
      .gte("expiry_date", today)
      .in(
        "customer_id",
        recentCustomers.map((customer) => customer.customer_id)
      );

    if (error) {
      console.error(
        "Could not load recent Unlimited customers:",
        error.message
      );
      return;
    }

    setUnlimitedCustomerIds(
      new Set((data ?? []).map((purchase) => purchase.customer_id))
    );
  }

  void loadRecentUnlimitedCustomers();
}, [currentSalonId, recentCustomers]);
const todayActivityKey = currentSalonId
  ? `${TODAY_ACTIVITY_KEY_PREFIX}:${currentSalonId}`
  : null;

const todayActivityDateKey = currentSalonId
  ? `${TODAY_ACTIVITY_DATE_KEY_PREFIX}:${currentSalonId}`
  : null;
  const [customerHistory, setCustomerHistory] =
    useState<CustomerHistoryType | null>(null);

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [ownerSettingsOpen, setOwnerSettingsOpen] = useState(false);
const [ownerSettingsMode, setOwnerSettingsMode] =
  useState<"business" | "products">("products");
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
const [sessions, setSessions] = useState<BedSession[]>([]);
const [beds, setBeds] = useState<string[]>([]);
const [manualMinutes, setManualMinutes] = useState("");
  const [loading, setLoading] = useState(false);
 const [message, setMessage] = useState("");
const [activityDate, setActivityDate] = useState(getLocalDateKey);

const [activities, setActivities] = useState<Activity[]>([]);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [ownerView, setOwnerView] = useState<OwnerView>("dashboard");
  const [userRole, setUserRole] = useState<UserRole>("customer");
  const [userName, setUserName] = useState("Staff User");
const [salonName, setSalonName] = useState("Salon");
const [salonTagline, setSalonTagline] = useState(
  "Salon control, customers, minutes and live beds"
  );
  const [salonLogoUrl, setSalonLogoUrl] = useState<string | null>(null);
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    console.error("Audit log skipped: salon could not be determined.", profileError);
    return;
  }

  const { error } = await supabase.from("audit_log").insert({
    staff_id: user.id,
    staff_name: userName || "Staff User",
    action,
    customer_name: customerName || null,
    details: details || null,
    salon_id: profile.salon_id,
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
  setIsOwnerMode((currentMode) =>
    authLoaded ? currentMode : role === "owner"
  );
} else {
      setUserRole("customer");
      setIsOwnerMode(false);
    }

    setAuthLoaded(true);
  }
  async function loadSalonSettings() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Could not load salon settings: no authenticated user.");
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    console.error(
      "Could not load salon settings: salon could not be determined.",
      profileError
    );
    return;
  }
  setCurrentSalonId(profile.salon_id);

const { data: salon, error: salonError } = await supabase
  .from("salons")
  .select("name")
  .eq("id", profile.salon_id)
  .maybeSingle();

if (salonError) {
  console.error("Could not load salon name:", salonError.message);
} else if (salon?.name?.trim()) {
  setSalonName(salon.name.trim());
}

const { data, error } = await supabase
  .from("salon_settings")
    .select("salon_name, tagline, logo_url")
    .eq("salon_id", profile.salon_id)
    .maybeSingle();

  if (error) {
    console.error("Could not load salon settings:", error.message);
    return;
  }

  if (data?.logo_url?.trim()) {
    setSalonLogoUrl(data.logo_url.trim());
  } else {
    setSalonLogoUrl(null);
  }

  if (data?.salon_name?.trim()) {
    setSalonName(data.salon_name.trim());
  }

  if (data?.tagline?.trim()) {
    setSalonTagline(data.tagline.trim());
  }
}

  function saveRecentCustomer(customer: CustomerBalance) {
    const updated = [
      customer,
      ...recentCustomers.filter(
        (item) => item.customer_id !== customer.customer_id
      ),
    ].slice(0, 8);

    setRecentCustomers(updated);
    if (recentCustomersKey) {
  localStorage.setItem(
    recentCustomersKey,
    JSON.stringify(updated)
  );
}
  }
  async function selectCustomer(customer: CustomerBalance) {
  setSelectedCustomer(customer);
  saveRecentCustomer(customer);

  await refreshSelectedCustomer(customer.customer_id);
}
  async function createCustomer(customer: {
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

  if (error?.code === "23505") {
    showMessage(
      "A customer with this email address already exists. Please search for and select their existing account."
    );
    return;
  }

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
  throw new Error(error.message);
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
    const { data: visitData, error: visitError } =
  await loadCustomerBedSessions(customerId);

if (visitError) {
  showMessage(visitError.message);
  return;
}
    const { data: salesData, error: salesError } =
  await loadCustomerSales(customerId);

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
  const { data, error } = await loadActiveSessionsService();

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

async function createPackage(newPackage: {
  name: string;
  minutes: number;
  price: number;
  expiry_days: number;
  active: boolean;
  is_unlimited: boolean;
}) {
  const { error } = await createPackageService(newPackage);

  if (error) {
  showMessage(error.message);
  throw new Error(error.message);
}

  showMessage("Package created.");
  await loadPackages();
}

async function deletePackage(id: number) {
  const { error } = await deletePackageService(id);

  if (error) {
    showMessage(error.message);
    throw new Error(error.message);
  }

  showMessage("Package deleted.");
  await loadPackages();
}

async function loadSessionsToday() {
  const { data, error } = await loadSessionsTodayService(
    getStartOfToday()
  );

  if (error) {
    showMessage(error.message);
    return;
  }

  setSessionsToday(data?.length ?? 0);
}

  async function loadCustomersToday() {
  const { data, error } = await loadCustomersTodayService(
    getStartOfToday()
  );

  if (error) {
    showMessage(error.message);
    return;
  }

  const uniqueCustomers = new Set(
  (data ?? [])
    .map((row) => row.customer_id)
    .filter(
      (customerId): customerId is string =>
        typeof customerId === "string" &&
        customerId.length > 0
    )
);

setCustomersToday(uniqueCustomers.size);
}

  


async function saveCashUp(cashUp: CashUpData) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await saveCashUpService(
    cashUp,
    user?.id ?? null
  );

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
  loadBedDefinitions();
}, []);

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
  if (!recentCustomersKey) {
    setRecentCustomers([]);
    return;
  }

  const stored = localStorage.getItem(recentCustomersKey);

  if (!stored) {
    setRecentCustomers([]);
    return;
  }

  try {
    setRecentCustomers(JSON.parse(stored));
  } catch {
    localStorage.removeItem(recentCustomersKey);
    setRecentCustomers([]);
  }
}, [recentCustomersKey]);

useEffect(() => {
  if (!todayActivityKey || !todayActivityDateKey) {
    setActivities([]);
    return;
  }

  const today = getLocalDateKey();
  const savedDate = localStorage.getItem(todayActivityDateKey);

  if (savedDate !== today) {
    localStorage.removeItem(todayActivityKey);
    localStorage.setItem(todayActivityDateKey, today);
    setActivities([]);
    setActivityDate(today);
    return;
  }

  const stored = localStorage.getItem(todayActivityKey);

  if (!stored) {
    setActivities([]);
    setActivityDate(today);
    return;
  }

  try {
    setActivities(JSON.parse(stored) as Activity[]);
  } catch {
    localStorage.removeItem(todayActivityKey);
    setActivities([]);
  }

  setActivityDate(today);
}, [todayActivityKey, todayActivityDateKey]);

useEffect(() => {
   loadUserRole();
loadSalonSettings();
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
  if (!todayActivityKey || !todayActivityDateKey) return;

  localStorage.setItem(
    todayActivityKey,
    JSON.stringify(activities)
  );

  localStorage.setItem(
    todayActivityDateKey,
    activityDate
  );
}, [
  activities,
  activityDate,
  todayActivityKey,
  todayActivityDateKey,
]);

useEffect(() => {
  function checkForNewDay() {
    const today = getLocalDateKey();

    if (today !== activityDate) {
      setActivities([]);
      setActivityDate(today);
    }
  }

  const interval = window.setInterval(checkForNewDay, 60_000);

  window.addEventListener("focus", checkForNewDay);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", checkForNewDay);
  };
}, [activityDate]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  async function loadBedDefinitions() {
  const { data, error } = await supabase
    .from("beds")
    .select("name")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.log("Bed definition load error:", error.message);
    return;
  }

  setBeds((data ?? []).map((bed) => bed.name));
}

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

    const [
  { data: balanceData, error: balanceError },
  { data: vipData, error: vipError },
] = await Promise.all([
  supabase
    .from("customer_balances")
    .select("*")
    .eq("customer_id", id)
    .single(),

  supabase
  .from("customers")
  .select("vip_expires_at, discount_type, discount_expires_at")
  .eq("customer_id", id)
  .maybeSingle(),
]);

if (balanceError || !balanceData) return;

if (vipError) {
  console.error("Failed to load customer VIP status:", vipError.message);
}

const data = {
  ...balanceData,
  vip_expires_at: vipData?.vip_expires_at ?? null,
  discount_type: vipData?.discount_type ?? null,
  discount_expires_at: vipData?.discount_expires_at ?? null,
};

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

  if (recentCustomersKey) {
  localStorage.setItem(
    recentCustomersKey,
    JSON.stringify(updated)
  );
}
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

async function addMinutes(
  sale?: Sale & {
    is_unlimited?: boolean;
    expiry_days?: number | null;
  }
) {
  if (!selectedCustomer) {
    showMessage("Please select a customer first.");
    return;
  }

  if (sale?.is_unlimited) {
    if (!currentSalonId) {
      showMessage("Could not determine the current salon.");
      return;
    }

    const expiryDays = Number(sale.expiry_days ?? 0);

    if (!expiryDays || expiryDays <= 0) {
      showMessage("Please enter a valid Unlimited package expiry.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data: customerRecord, error: customerError } = await supabase
      .from("customers")
      .select("unlimited_expires_at")
      .eq("customer_id", selectedCustomer.customer_id)
      .eq("salon_id", currentSalonId)
      .maybeSingle();

    if (customerError || !customerRecord) {
      setLoading(false);
      showMessage(
        customerError?.message || "Could not load the customer."
      );
      return;
    }

    const now = new Date();

    const existingExpiry = customerRecord.unlimited_expires_at
      ? new Date(customerRecord.unlimited_expires_at)
      : null;

    const expiryBase =
      existingExpiry && existingExpiry > now
        ? existingExpiry
        : now;

    const unlimitedExpiry = new Date(expiryBase);
    unlimitedExpiry.setDate(
      unlimitedExpiry.getDate() + expiryDays
    );

    const { error: unlimitedError } = await supabase
      .from("customers")
      .update({
        unlimited_expires_at: unlimitedExpiry.toISOString(),
      })
      .eq("customer_id", selectedCustomer.customer_id)
      .eq("salon_id", currentSalonId);

    if (unlimitedError) {
      setLoading(false);
      showMessage(unlimitedError.message);
      return;
    }

    const recorded = await recordSale(sale);

    if (!recorded) {
      await supabase
        .from("customers")
        .update({
          unlimited_expires_at:
            customerRecord.unlimited_expires_at,
        })
        .eq("customer_id", selectedCustomer.customer_id)
        .eq("salon_id", currentSalonId);

      setLoading(false);
      return;
    }

    await logAudit({
      action: "Package Sold",
      customerName:
        selectedCustomer.full_name || "Unnamed Customer",
      details: `${sale.description} (£${Number(
        sale.amount
      ).toFixed(2)})`,
    });

    setActivities((current) => [
      {
        id: crypto.randomUUID(),
        text: `✓ Sold ${sale.description} (£${Number(
          sale.amount
        ).toFixed(2)}) to ${
          selectedCustomer.full_name || "Customer"
        }`,
        time: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...current,
    ]);

    showMessage(
      `✓ Sold ${sale.description} (£${sale.amount})`
    );

    setManualMinutes("");
    setLoading(false);

    await refreshSelectedCustomer(
      selectedCustomer.customer_id
    );
    await searchCustomers();
    await refreshDashboardStats();

    return;
  }

  const minutesToAdd =
    sale?.minutes ?? Number(manualMinutes);

  if (!minutesToAdd || minutesToAdd <= 0) {
    showMessage("Please enter valid minutes.");
    return;
  }

  setLoading(true);
  setMessage("");

  const { error } = await supabase.rpc(
    "add_manual_minutes",
    {
      p_customer_id: selectedCustomer.customer_id,
      p_minutes: minutesToAdd,
    }
  );

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
      customerName:
        selectedCustomer.full_name || "Unnamed Customer",
      details: `${sale.description} (£${Number(
        sale.amount
      ).toFixed(2)})`,
    });

    setActivities((current) => [
      {
        id: crypto.randomUUID(),
        text: `✓ Sold ${sale.description} (£${Number(
          sale.amount
        ).toFixed(2)}) to ${
          selectedCustomer.full_name || "Customer"
        }`,
        time: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      ...current,
    ]);

    showMessage(
      `✓ Sold ${sale.description} (£${sale.amount})`
    );
  } else {
    await logAudit({
      action: "Manual Minutes Added",
      customerName:
        selectedCustomer.full_name || "Unnamed Customer",
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

  await refreshSelectedCustomer(
    selectedCustomer.customer_id
  );
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

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + minutes * 60 * 1000);

  const { error } = await startBedSessionService(
    selectedCustomer.customer_id,
    selectedCustomer.full_name || "Customer",
    bedName,
    minutes,
    startedAt.toISOString(),
    endsAt.toISOString()
  );

  if (error) {
    showMessage(error.message);
    return false;
  }

  showMessage(`${bedName} started for ${minutes} minutes.`);

  await refreshSelectedCustomer();
  await loadActiveSessions();
  await refreshDashboardStats();

  return true;
}

async function startPaygSession(
  bedName: string,
  minutes: number,
  amount: number,
  paymentMethod: "cash" | "card"
) {
  if (!minutes || minutes <= 0) {
    showMessage("Please enter valid PAYG minutes.");
    return false;
  }

  if (!amount || amount <= 0) {
    showMessage("Please enter a valid PAYG price.");
    return false;
  }

  const { error } =
    await startPaygBedSessionService(
      bedName,
      minutes,
      amount,
      paymentMethod
    );

  if (error) {
    showMessage(error.message);
    return false;
  }

  await logAudit({
    action: "PAYG Session Started",
    customerName: "PAYG",
    details: `${bedName} · ${minutes} minutes · £${amount.toFixed(
      2
    )} · ${paymentMethod.toUpperCase()}`,
  });

  setActivities((current) => [
    {
      id: crypto.randomUUID(),
      text: `✓ PAYG ${minutes} mins on ${bedName} (£${amount.toFixed(
        2
      )} ${paymentMethod.toUpperCase()})`,
      time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    ...current,
  ]);

  showMessage(
    `✓ PAYG ${bedName} started for ${minutes} minutes.`
  );

  await loadActiveSessions();
  await refreshDashboardStats();

  return true;
}

  async function finishBedSession(sessionId: string) {
  const { error } = await finishBedSessionService(sessionId);

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

  const activeBeds = sessions.filter(
  (session) => session.status === "occupied"
);

  const bedsRunning = activeBeds.filter(
    (session) => new Date(session.ends_at).getTime() > Date.now()
  ).length;

  const bedsFree = Math.max(0, TOTAL_BEDS - activeBeds.length);
  const occupancy = Math.round((bedsRunning / TOTAL_BEDS) * 100);
  useEffect(() => {
  function handleLaunchNavigation(event: Event) {
    const view = (
      event as CustomEvent<"staff" | "beds" | "payments">
    ).detail;

    setOwnerView(view);
  }

  window.addEventListener(
    "launch-centre-navigate",
    handleLaunchNavigation
  );

  return () => {
    window.removeEventListener(
      "launch-centre-navigate",
      handleLaunchNavigation
    );
  };
}, []);
  useEffect(() => {
  if (!authLoaded) return;

  if (userRole !== "owner" && userRole !== "staff") {
    router.replace("/staff-login");
  }
}, [authLoaded, userRole, router]);

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

  
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <ReceptionHeader
  activeBeds={activeBeds.length}
  userName={userName}
  userRole={userRole === "owner" ? "owner" : "staff"}
  salonName={salonName}
  tagline="Professional tanning salon management platform"
  logoUrl={salonLogoUrl}
/>

{message && (
  <div className="mx-auto mt-4 max-w-7xl rounded-xl border border-amber-500 bg-amber-500/10 px-4 py-3 text-amber-200">
    {message}
  </div>
)}

      {userRole === "owner" && (
  <OwnerTabs
    isOwnerMode={isOwnerMode}
    ownerView={ownerView}
    onSelectView={(view) => {
      setIsOwnerMode(true);
      setOwnerView(view);
    }}
    onOpenSettings={() => {
  setOwnerSettingsMode("products");
  loadPackages();
  setOwnerSettingsOpen(true);
}}
    onEnterStaffMode={() => {
  setOwnerView("dashboard");
  setIsOwnerMode(false);
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
onOpenBusinessSettings={() => {
  setOwnerSettingsMode("business");
  setOwnerSettingsOpen(true);
}}
onOpenProductSettings={() => {
  setOwnerSettingsMode("products");
  loadPackages();
  setOwnerSettingsOpen(true);
}}
/>
)}

{!isOwnerMode && (
<div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
  <div className="min-w-0 space-y-5">
    
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
  beds={beds}
  onStartSession={startBedSession}
  onStartPaygSession={startPaygSession}
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
  mode={ownerSettingsMode}
  packages={packages}
  onClose={() => setOwnerSettingsOpen(false)}
  onSave={savePackage}
  onCreate={createPackage}
  onDelete={deletePackage}
/>
    </main>
  );
}
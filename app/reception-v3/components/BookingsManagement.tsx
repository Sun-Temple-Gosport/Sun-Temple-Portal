"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Booking = {
  id: string;
  customer_id: string;
  bed_id: number;
  starts_at: string;
  ends_at: string;
  session_minutes: number;
  status: string;
  source: string;
};

type BookingCustomer = {
  customer_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};
type BookingBed = {
  id: number;
  name: string;
};
type BookingAvailability = {
  bed_id: number;
  bed_name: string;
  starts_at: string;
};

export default function BookingsManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<
    BookingCustomer[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<BookingCustomer | null>(null);
  const [searchingCustomers, setSearchingCustomers] =
    useState(false);
      const [bookingMinutes, setBookingMinutes] =
    useState(10);
  const [usingCustomMinutes, setUsingCustomMinutes] =
    useState(false);
  const [customMinutes, setCustomMinutes] =
    useState("");
      const [bookingDate, setBookingDate] = useState("");
  const [activeBeds, setActiveBeds] = useState<BookingBed[]>([]);
  const [selectedBedId, setSelectedBedId] =
    useState<number | null>(null);
      const [availableTimes, setAvailableTimes] = useState<
    BookingAvailability[]
  >([]);
  const [loadingAvailability, setLoadingAvailability] =
    useState(false);
  const [availabilityError, setAvailabilityError] =
    useState("");
    const [creatingBooking, setCreatingBooking] =
  useState(false);
const [createBookingError, setCreateBookingError] =
  useState("");
const [bookingSuccess, setBookingSuccess] =
  useState("");
  const [selectedStartAt, setSelectedStartAt] =
    useState<string | null>(null);
  const [customerNames, setCustomerNames] = useState<
    Record<string, string>
  >({});
  const [bedNames, setBedNames] = useState<
    Record<number, string>
  >({});

  const [timezone, setTimezone] =
    useState("Europe/London");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] =
  useState<string | null>(null);
  const [editingBookingId, setEditingBookingId] =
  useState<string | null>(null);
  const [rescheduleMinutes, setRescheduleMinutes] =
  useState(10);
const [rescheduleDate, setRescheduleDate] =
  useState("");
const [rescheduleBedId, setRescheduleBedId] =
  useState<number | null>(null);
  const [
  rescheduleAvailableTimes,
  setRescheduleAvailableTimes,
] = useState<BookingAvailability[]>([]);

const [
  loadingRescheduleAvailability,
  setLoadingRescheduleAvailability,
] = useState(false);

const [
  rescheduleAvailabilityError,
  setRescheduleAvailabilityError,
] = useState("");

const [rescheduleStartAt, setRescheduleStartAt] =
  useState<string | null>(null);
  const [reschedulingId, setReschedulingId] =
  useState<string | null>(null);

const [rescheduleSaveError, setRescheduleSaveError] =
  useState("");

   const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("salon_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile?.salon_id) {
      setError("Could not determine the current salon.");
      setLoading(false);
      return;
    }

        const salonId = profile.salon_id;

    const { data: activeBedData, error: activeBedError } =
      await supabase
        .from("beds")
        .select("id, name")
        .eq("salon_id", salonId)
        .eq("active", true)
        .order("name");

    if (activeBedError) {
      setError(activeBedError.message);
      setLoading(false);
      return;
    }

    setActiveBeds(
      (activeBedData ?? []) as BookingBed[]
    );

    const { data: bookingSettings } = await supabase
      .from("salon_booking_settings")
      .select("timezone")
      .eq("salon_id", salonId)
      .maybeSingle();

    if (bookingSettings?.timezone) {
      setTimezone(bookingSettings.timezone);
    }

    const { data: bookingData, error: bookingError } =
      await supabase
        .from("bookings")
        .select(
          "id, customer_id, bed_id, starts_at, ends_at, session_minutes, status, source"
        )
        .eq("salon_id", salonId)
        .in("status", ["booked", "checked_in"])
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });

    if (bookingError) {
      setError(bookingError.message);
      setLoading(false);
      return;
    }

    const rows = (bookingData ?? []) as Booking[];

    setBookings(rows);

    const customerIds = [
      ...new Set(
        rows.map((booking) => booking.customer_id)
      ),
    ];

    const bedIds = [
      ...new Set(
        rows.map((booking) => booking.bed_id)
      ),
    ];

    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("customer_id, full_name")
        .eq("salon_id", salonId)
        .in("customer_id", customerIds);

      const names: Record<string, string> = {};

      for (const customer of customers ?? []) {
        names[customer.customer_id] =
          customer.full_name || "Customer";
      }

      setCustomerNames(names);
    } else {
      setCustomerNames({});
    }

    if (bedIds.length > 0) {
      const { data: beds } = await supabase
        .from("beds")
        .select("id, name")
        .eq("salon_id", salonId)
        .in("id", bedIds);

      const names: Record<number, string> = {};

      for (const bed of beds ?? []) {
        names[bed.id] = bed.name;
      }

      setBedNames(names);
    } else {
      setBedNames({});
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

    async function searchCustomers() {
    const search = customerSearch.trim();

    if (!search) {
      setCustomerResults([]);
      return;
    }

    setSearchingCustomers(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in.");
      setSearchingCustomers(false);
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("salon_id")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile?.salon_id) {
      setError("Could not determine the current salon.");
      setSearchingCustomers(false);
      return;
    }

    const { data, error: customerError } =
      await supabase
        .from("customers")
        .select("customer_id, full_name, email, phone")
        .eq("salon_id", profile.salon_id)
        .or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        )
        .order("full_name")
        .limit(10);

    if (customerError) {
      setError(customerError.message);
      setSearchingCustomers(false);
      return;
    }

    setCustomerResults(
      (data ?? []) as BookingCustomer[]
    );
    setSearchingCustomers(false);
  }
    async function loadAvailability() {
    if (
      !selectedCustomer ||
      !bookingDate ||
      !selectedBedId ||
      bookingMinutes <= 0
    ) {
      return;
    }

    setLoadingAvailability(true);
    setAvailabilityError("");
    setAvailableTimes([]);
    setSelectedStartAt(null);

    const { data, error: availabilityRpcError } =
      await supabase.rpc(
        "get_salon_booking_availability",
        {
          p_customer_id:
            selectedCustomer.customer_id,
          p_booking_date: bookingDate,
          p_session_minutes: bookingMinutes,
        }
      );

    if (availabilityRpcError) {
      setAvailabilityError(
        availabilityRpcError.message
      );
      setLoadingAvailability(false);
      return;
    }

    const rows =
      (data ?? []) as BookingAvailability[];

    const bedTimes = rows.filter(
      (slot) => slot.bed_id === selectedBedId
    );

    setAvailableTimes(bedTimes);
    setLoadingAvailability(false);
  }
  async function createBooking() {
  if (
    !selectedCustomer ||
    !selectedBedId ||
    !selectedStartAt ||
    bookingMinutes <= 0
  ) {
    return;
  }

  setCreatingBooking(true);
  setCreateBookingError("");
  setBookingSuccess("");

  const { error: createError } = await supabase.rpc(
    "create_salon_booking",
    {
      p_customer_id: selectedCustomer.customer_id,
      p_bed_id: selectedBedId,
      p_starts_at: selectedStartAt,
      p_session_minutes: bookingMinutes,
    }
  );

  if (createError) {
    setCreateBookingError(createError.message);
    setCreatingBooking(false);
    return;
  }

  await loadBookings();

  setBookingSuccess("Booking created successfully.");

  setSelectedCustomer(null);
  setCustomerSearch("");
  setCustomerResults([]);
  setBookingMinutes(10);
  setUsingCustomMinutes(false);
  setCustomMinutes("");
  setBookingDate("");
  setSelectedBedId(null);
  setAvailableTimes([]);
  setSelectedStartAt(null);
  setAvailabilityError("");

  setCreatingBooking(false);
}
async function loadRescheduleAvailability(
  booking: Booking
) {
  if (
    !rescheduleDate ||
    !rescheduleBedId ||
    rescheduleMinutes <= 0
  ) {
    return;
  }

  setLoadingRescheduleAvailability(true);
  setRescheduleAvailabilityError("");
  setRescheduleAvailableTimes([]);
  setRescheduleStartAt(null);

  const { data, error: availabilityRpcError } =
    await supabase.rpc(
      "get_salon_reschedule_availability",
      {
        p_booking_id: booking.id,
        p_booking_date: rescheduleDate,
        p_session_minutes: rescheduleMinutes,
      }
    );

  if (availabilityRpcError) {
    setRescheduleAvailabilityError(
      availabilityRpcError.message
    );
    setLoadingRescheduleAvailability(false);
    return;
  }

  const rows =
    (data ?? []) as BookingAvailability[];

  const bedTimes = rows.filter(
    (slot) => slot.bed_id === rescheduleBedId
  );

  setRescheduleAvailableTimes(bedTimes);
  setLoadingRescheduleAvailability(false);
}
async function saveReschedule(booking: Booking) {
  if (
    !rescheduleBedId ||
    !rescheduleStartAt ||
    rescheduleMinutes <= 0
  ) {
    return;
  }

  setReschedulingId(booking.id);
  setRescheduleSaveError("");
  setBookingSuccess("");

  const { error: rescheduleError } =
    await supabase.rpc(
      "reschedule_salon_booking",
      {
        p_booking_id: booking.id,
        p_bed_id: rescheduleBedId,
        p_starts_at: rescheduleStartAt,
        p_session_minutes: rescheduleMinutes,
      }
    );

  if (rescheduleError) {
    setRescheduleSaveError(
      rescheduleError.message
    );
    setReschedulingId(null);
    return;
  }

  await loadBookings();

  setEditingBookingId(null);
  setRescheduleAvailableTimes([]);
  setRescheduleStartAt(null);
  setRescheduleAvailabilityError("");
  setRescheduleSaveError("");
  setReschedulingId(null);

  setBookingSuccess(
    "Booking rescheduled successfully."
  );
}
function startEditingBooking(booking: Booking) {
  if (editingBookingId === booking.id) {
    setEditingBookingId(null);
    return;
  }

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).formatToParts(new Date(booking.starts_at));

  const year = dateParts.find(
    (part) => part.type === "year"
  )?.value;

  const month = dateParts.find(
    (part) => part.type === "month"
  )?.value;

  const day = dateParts.find(
    (part) => part.type === "day"
  )?.value;

  setEditingBookingId(booking.id);

setRescheduleAvailableTimes([]);
setRescheduleStartAt(null);
setRescheduleAvailabilityError("");

setRescheduleMinutes(booking.session_minutes);
  setRescheduleBedId(booking.bed_id);
  setRescheduleDate(
    year && month && day
      ? `${year}-${month}-${day}`
      : ""
  );
}
  async function cancelBooking(bookingId: string) {
  const confirmed = window.confirm(
    "Are you sure you want to cancel this booking?"
  );

  if (!confirmed) {
    return;
  }

  setCancellingId(bookingId);

  const { error: cancelError } = await supabase.rpc(
    "cancel_salon_booking",
    {
      p_booking_id: bookingId,
    }
  );

  if (cancelError) {
    setError(cancelError.message);
    setCancellingId(null);
    return;
  }

  setBookings((current) =>
    current.filter(
      (booking) => booking.id !== bookingId
    )
  );

  setCancellingId(null);
}

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date(value));
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date(value));
  }

  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-950/60 p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
          Online Bookings
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          Upcoming Bookings
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Customer sunbed reservations for your salon.
        </p>
      </div>

            <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
          Add Booking
        </p>

        <h3 className="mt-2 text-xl font-black text-white">
          Select Customer
        </h3>
        {bookingSuccess && (
  <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
    {bookingSuccess}
  </div>
)}

        {!selectedCustomer && (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={customerSearch}
                onChange={(event) =>
                  setCustomerSearch(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void searchCustomers();
                  }
                }}
                placeholder="Search name, email or phone"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
              />

              <button
                type="button"
                onClick={() => void searchCustomers()}
                disabled={
                  searchingCustomers ||
                  !customerSearch.trim()
                }
                className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black disabled:opacity-50"
              >
                {searchingCustomers
                  ? "Searching..."
                  : "Search"}
              </button>
            </div>

            {customerResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {customerResults.map((customer) => (
                  <button
                    key={customer.customer_id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setCustomerResults([]);
                      setCustomerSearch("");
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left hover:border-amber-400"
                  >
                    <p className="font-bold text-white">
                      {customer.full_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {customer.email ||
                        customer.phone ||
                        "No contact details"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selectedCustomer && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Customer Selected
              </p>

              <p className="mt-1 font-black text-white">
                {selectedCustomer.full_name}
              </p>

              <p className="text-xs text-slate-400">
                {selectedCustomer.email ||
                  selectedCustomer.phone ||
                  "No contact details"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="rounded-full border border-slate-600 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              Change
            </button>
          </div>
        )}
                {selectedCustomer && (
          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Tan Duration
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[8, 10, 12, 16].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setBookingMinutes(minutes);
                    setUsingCustomMinutes(false);
                    setCustomMinutes("");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    !usingCustomMinutes &&
                    bookingMinutes === minutes
                      ? "bg-amber-400 text-black"
                      : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-amber-400"
                  }`}
                >
                  {minutes} mins
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setUsingCustomMinutes(true);
                  setCustomMinutes(
                    customMinutes ||
                      String(bookingMinutes)
                  );
                }}
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  usingCustomMinutes
                    ? "bg-amber-400 text-black"
                    : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-amber-400"
                }`}
              >
                Custom
              </button>
            </div>

            {usingCustomMinutes && (
              <div className="mt-3 max-w-xs">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customMinutes}
                  onChange={(event) => {
                    const value = event.target.value;

                    setCustomMinutes(value);

                    const parsed = Number(value);

                    if (
                      Number.isInteger(parsed) &&
                      parsed > 0
                    ) {
                      setBookingMinutes(parsed);
                    }
                  }}
                  placeholder="Minutes"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-amber-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Enter the required session length in minutes.
                </p>
              </div>
            )}

            <p className="mt-3 text-sm font-bold text-white">
              Selected: {bookingMinutes} minutes
            </p>
          </div>
        )}
                {selectedCustomer && (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="booking-date"
                className="text-xs font-black uppercase tracking-wider text-slate-500"
              >
                Booking Date
              </label>

              <input
                id="booking-date"
                type="date"
                value={bookingDate}
                onChange={(event) =>
                  setBookingDate(event.target.value)
                }
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label
                htmlFor="booking-bed"
                className="text-xs font-black uppercase tracking-wider text-slate-500"
              >
                Sunbed
              </label>

              <select
                id="booking-bed"
                value={selectedBedId ?? ""}
                                onChange={(event) => {
                  const value = event.target.value;

                  setSelectedBedId(
                    value ? Number(value) : null
                  );
                  setAvailableTimes([]);
                  setSelectedStartAt(null);
                  setAvailabilityError("");
                }}
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
              >
                <option value="">
                  Choose a sunbed
                </option>

                {activeBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    {bed.name}
                  </option>
                ))}
              </select>

              {activeBeds.length === 0 && (
                <p className="mt-2 text-xs text-red-300">
                  No active sunbeds are available.
                </p>
              )}
            </div>
          </div>
        )}
                {selectedCustomer &&
          bookingDate &&
          selectedBedId && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() =>
                  void loadAvailability()
                }
                disabled={loadingAvailability}
                className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black disabled:opacity-50"
              >
                {loadingAvailability
                  ? "Checking Times..."
                  : "Check Available Times"}
              </button>

              {availabilityError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
                  {availabilityError}
                </div>
              )}

              {!loadingAvailability &&
                !availabilityError &&
                availableTimes.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Available Times
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableTimes.map((slot) => (
                        <button
                          key={slot.starts_at}
                          type="button"
                          onClick={() =>
                            setSelectedStartAt(
                              slot.starts_at
                            )
                          }
                          className={`rounded-full px-4 py-2 text-sm font-black ${
                            selectedStartAt ===
                            slot.starts_at
                              ? "bg-emerald-400 text-black"
                              : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-400"
                          }`}
                        >
                          {formatTime(
                            slot.starts_at
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {!loadingAvailability &&
                !availabilityError &&
                availableTimes.length === 0 && (
                  <p className="mt-4 text-sm text-slate-400">
                    Check availability to see valid
                    booking times.
                  </p>
                )}

              {selectedStartAt && (
  <div className="mt-5">
    <p className="text-sm font-bold text-emerald-300">
      Selected time:{" "}
      {formatTime(selectedStartAt)}
    </p>

    <button
      type="button"
      onClick={() => void createBooking()}
      disabled={creatingBooking}
      className="mt-4 rounded-xl bg-emerald-400 px-6 py-3 font-black text-black disabled:opacity-50"
    >
      {creatingBooking
        ? "Creating Booking..."
        : "Create Booking"}
    </button>

    {createBookingError && (
      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
        {createBookingError}
      </div>
    )}
  </div>
)}
            </div>
          )}
      </div>

      {loading && (
        <p className="mt-8 text-slate-400">
          Loading bookings...
        </p>
      )}

      {!loading && error && (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-red-300">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        bookings.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/40 p-6">
            <p className="font-bold text-white">
              No upcoming bookings
            </p>

            <p className="mt-1 text-sm text-slate-400">
              New customer bookings will appear here.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        bookings.length > 0 && (
          <div className="mt-8 space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="grid gap-4 rounded-2xl border border-slate-700 bg-slate-900/50 p-5 md:grid-cols-[180px_1fr_1fr_260px]"
              >
                <div>
                  <p className="text-sm font-bold text-amber-400">
                    {formatDate(booking.starts_at)}
                  </p>

                  <p className="mt-1 text-2xl font-black text-white">
                    {formatTime(booking.starts_at)}
                  </p>

                  <p className="text-xs text-slate-500">
                    until {formatTime(booking.ends_at)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Customer
                  </p>

                  <p className="mt-1 font-bold text-white">
                    {customerNames[booking.customer_id] ||
                      "Customer"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Sunbed
                  </p>

                  <p className="mt-1 font-bold text-white">
                    {bedNames[booking.bed_id] ||
                      `Bed ${booking.bed_id}`}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Tan
                  </p>

                  <p className="mt-1 text-xl font-black text-white">
                    {booking.session_minutes} mins
                  </p>

                  <span className="mt-2 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase text-emerald-300">
                    {booking.status}
                  </span>
                  {booking.status === "booked" && (
  <div className="mt-3 space-y-2">
    <button
      type="button"
      onClick={() => startEditingBooking(booking)}
      className={`block w-full rounded-full border px-3 py-2 text-xs font-bold ${
        editingBookingId === booking.id
          ? "border-amber-400 bg-amber-400 text-black"
          : "border-amber-500/50 text-amber-300 hover:bg-amber-950/30"
      }`}
    >
      {editingBookingId === booking.id
        ? "Editing..."
        : "Edit / Reschedule"}
    </button>

    <button
      type="button"
      onClick={() => void cancelBooking(booking.id)}
      disabled={cancellingId === booking.id}
      className="block w-full rounded-full border border-red-500/50 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950/30 disabled:opacity-50"
    >
      {cancellingId === booking.id
        ? "Cancelling..."
        : "Cancel Booking"}
    </button>

    {editingBookingId === booking.id && (
  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
    <p className="text-xs font-black uppercase tracking-wider text-amber-300">
      Reschedule Booking
    </p>

    <div className="mt-3 space-y-3">
      <div>
        <label className="text-xs font-bold text-slate-400">
          Date
        </label>

        <input
          type="date"
          value={rescheduleDate}
          onChange={(event) => {
  setRescheduleDate(event.target.value);
  setRescheduleAvailableTimes([]);
  setRescheduleStartAt(null);
  setRescheduleAvailabilityError("");
}}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-400"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-400">
          Sunbed
        </label>

        <select
          value={rescheduleBedId ?? ""}
          onChange={(event) => {
  setRescheduleBedId(
    event.target.value
      ? Number(event.target.value)
      : null
  );
  setRescheduleAvailableTimes([]);
  setRescheduleStartAt(null);
  setRescheduleAvailabilityError("");
}}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-400"
        >
          <option value="">
            Choose a sunbed
          </option>

          {activeBeds.map((bed) => (
            <option key={bed.id} value={bed.id}>
              {bed.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-400">
          Minutes
        </label>

        <input
          type="number"
          min="1"
          step="1"
          value={rescheduleMinutes}
          onChange={(event) => {
  setRescheduleMinutes(
    Number(event.target.value)
  );
  setRescheduleAvailableTimes([]);
  setRescheduleStartAt(null);
  setRescheduleAvailabilityError("");
}}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-400"
        />
      </div>
      <div>
  <button
    type="button"
    onClick={() =>
      void loadRescheduleAvailability(booking)
    }
    disabled={
      loadingRescheduleAvailability ||
      !rescheduleDate ||
      !rescheduleBedId ||
      rescheduleMinutes <= 0
    }
    className="w-full rounded-lg bg-amber-400 px-3 py-2 font-black text-black disabled:opacity-50"
  >
    {loadingRescheduleAvailability
      ? "Checking Times..."
      : "Check Available Times"}
  </button>

  {rescheduleAvailabilityError && (
    <div className="mt-3 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300">
      {rescheduleAvailabilityError}
    </div>
  )}

  {!loadingRescheduleAvailability &&
    !rescheduleAvailabilityError &&
    rescheduleAvailableTimes.length > 0 && (
      <div className="mt-3">
        <p className="text-xs font-bold text-slate-400">
          Available Times
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {rescheduleAvailableTimes.map(
            (slot) => (
              <button
                key={slot.starts_at}
                type="button"
                onClick={() =>
                  setRescheduleStartAt(
                    slot.starts_at
                  )
                }
                className={`rounded-full px-3 py-2 text-xs font-black ${
                  rescheduleStartAt ===
                  slot.starts_at
                    ? "bg-emerald-400 text-black"
                    : "border border-slate-600 bg-slate-950 text-slate-300 hover:border-emerald-400"
                }`}
              >
                {formatTime(slot.starts_at)}
              </button>
            )
          )}
        </div>
      </div>
    )}

  {!loadingRescheduleAvailability &&
    !rescheduleAvailabilityError &&
    rescheduleAvailableTimes.length === 0 && (
      <p className="mt-3 text-xs text-slate-400">
        Check availability to see valid times.
      </p>
    )}

  {rescheduleStartAt && (
  <div className="mt-3">
    <p className="text-xs font-bold text-emerald-300">
      Selected time:{" "}
      {formatTime(rescheduleStartAt)}
    </p>

    <button
      type="button"
      onClick={() =>
        void saveReschedule(booking)
      }
      disabled={
        reschedulingId === booking.id
      }
      className="mt-3 w-full rounded-lg bg-emerald-400 px-3 py-2 font-black text-black disabled:opacity-50"
    >
      {reschedulingId === booking.id
        ? "Saving..."
        : "Save Reschedule"}
    </button>

    {rescheduleSaveError && (
      <div className="mt-3 rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300">
        {rescheduleSaveError}
      </div>
    )}
  </div>
)}
</div>
    </div>
  </div>
)}
  </div>
)}
                </div>
              </div>
            ))}
          </div>
        )}
    </section>
  );
}
"use client";

import { useEffect, useState } from "react";
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

export default function BookingsManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  useEffect(() => {
    async function loadBookings() {
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
        ...new Set(rows.map((booking) => booking.customer_id)),
      ];

      const bedIds = [
        ...new Set(rows.map((booking) => booking.bed_id)),
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
      }

      setLoading(false);
    }

    void loadBookings();
  }, []);
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
                className="grid gap-4 rounded-2xl border border-slate-700 bg-slate-900/50 p-5 md:grid-cols-[180px_1fr_1fr_120px]"
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
  <button
    type="button"
    onClick={() => void cancelBooking(booking.id)}
    disabled={cancellingId === booking.id}
    className="mt-3 block rounded-full border border-red-500/50 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950/30 disabled:opacity-50"
  >
    {cancellingId === booking.id
      ? "Cancelling..."
      : "Cancel Booking"}
  </button>
)}
                </div>
              </div>
            ))}
          </div>
        )}
    </section>
  );
}
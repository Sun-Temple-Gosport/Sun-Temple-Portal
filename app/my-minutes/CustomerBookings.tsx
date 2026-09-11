"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Booking = {
  id: string;
  bed_id: number;
  starts_at: string;
  ends_at: string;
  session_minutes: number;
  status: string;
};

type Props = {
  salonId: string;
  customerId: string;
};

export default function CustomerBookings({
  salonId,
  customerId,
}: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bedNames, setBedNames] = useState<
    Record<number, string>
  >({});

  const [timezone, setTimezone] =
    useState("Europe/London");

  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadBookings() {
    setLoading(true);
    setError("");

    const { data: bookingSettings } = await supabase
      .from("salon_booking_settings")
      .select("timezone")
      .eq("salon_id", salonId)
      .maybeSingle();

    if (bookingSettings?.timezone) {
      setTimezone(bookingSettings.timezone);
    }

    const { data, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, bed_id, starts_at, ends_at, session_minutes, status"
      )
      .eq("salon_id", salonId)
      .eq("customer_id", customerId)
      .in("status", ["booked", "checked_in"])
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true });

    if (bookingError) {
      setError(bookingError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Booking[];

    setBookings(rows);

    const bedIds = [
      ...new Set(rows.map((booking) => booking.bed_id)),
    ];

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

  useEffect(() => {
    void loadBookings();
  }, [salonId, customerId]);

  async function cancelBooking(bookingId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) {
      return;
    }

    setCancellingId(bookingId);
    setError("");
    setSuccess("");

    const { error: cancelError } = await supabase.rpc(
      "cancel_customer_booking",
      {
        p_booking_id: bookingId,
      }
    );

    if (cancelError) {
      setError(cancelError.message);
      setCancellingId(null);
      return;
    }

    setSuccess(
      "Booking cancelled. Your reserved minutes are available again."
    );

    setCancellingId(null);

    await loadBookings();
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "long",
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
    <div className="mt-8 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
        My Bookings
      </p>

      <h2 className="mt-2 text-3xl font-bold text-white">
        Upcoming Sunbeds
      </h2>

      {success && (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <p className="mt-6 text-zinc-400">
          Loading bookings...
        </p>
      )}

      {!loading && bookings.length === 0 && (
        <p className="mt-6 text-zinc-400">
          You have no upcoming bookings.
        </p>
      )}

      {!loading && bookings.length > 0 && (
        <div className="mt-6 space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-2xl border border-zinc-700 bg-black/30 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[#d6a84f]">
                    {formatDate(booking.starts_at)}
                  </p>

                  <p className="mt-1 text-2xl font-bold text-white">
                    {formatTime(booking.starts_at)}
                  </p>

                  <p className="mt-2 text-zinc-300">
                    {bedNames[booking.bed_id] ||
                      `Bed ${booking.bed_id}`}
                    {" · "}
                    {booking.session_minutes} mins
                  </p>
                </div>

                {booking.status === "booked" && (
                  <button
                    type="button"
                    onClick={() =>
                      void cancelBooking(booking.id)
                    }
                    disabled={cancellingId === booking.id}
                    className="rounded-full border border-red-500/50 px-5 py-3 font-bold text-red-300 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-50"
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
    </div>
  );
}
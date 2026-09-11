"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
type BookingSlot = {
  bed_id: number;
  bed_name: string;
  starts_at: string;
  ends_at: string;
};
export default function BookSunbed() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bookingsAllowed, setBookingsAllowed] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionMinutes, setSessionMinutes] = useState(8);
  const [bookingDate, setBookingDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
const [availabilityLoading, setAvailabilityLoading] = useState(false);
const [availabilityError, setAvailabilityError] = useState("");
const [selectedSlot, setSelectedSlot] =
  useState<BookingSlot | null>(null);
  const [selectedBedId, setSelectedBedId] =
  useState<number | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
const [bookingError, setBookingError] = useState("");
const [bookingSuccess, setBookingSuccess] = useState("");
  const [salonName, setSalonName] = useState("Your Salon");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [salonSlug, setSalonSlug] = useState("");
  const [salonTimezone, setSalonTimezone] = useState("Europe/London");

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const requestedSalonSlug = new URLSearchParams(
          window.location.search
        ).get("salon");

        router.replace(
          requestedSalonSlug
            ? `/login?salon=${encodeURIComponent(
                requestedSalonSlug
              )}`
            : "/login"
        );

        return;
      }

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("salon_id, customer_id, role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "Could not load customer profile:",
          profileError.message
        );
        setMessage("Could not load your customer account.");
        setLoading(false);
        return;
      }

      if (
        !profileData?.salon_id ||
        profileData.role?.toLowerCase() !== "customer"
      ) {
        setMessage("A customer account is required.");
        setLoading(false);
        return;
      }

      const { data: salonData, error: salonError } =
        await supabase
          .from("salons")
          .select("slug")
          .eq("id", profileData.salon_id)
          .eq("active", true)
          .maybeSingle();

      if (salonError) {
        console.error(
          "Could not load customer salon:",
          salonError.message
        );
      } else if (salonData) {
        setSalonSlug(salonData.slug);
      }

      const { data: brandingData, error: brandingError } =
        await supabase
          .from("salon_settings")
          .select("salon_name, tagline, logo_url")
          .eq("salon_id", profileData.salon_id)
          .maybeSingle();

      if (brandingError) {
        console.error(
          "Could not load salon branding:",
          brandingError.message
        );
      } else if (brandingData) {
        setSalonName(
          brandingData.salon_name || "Your Salon"
        );
        setTagline(brandingData.tagline || "");
        setLogoUrl(brandingData.logo_url || null);
      }

      const [
        { data: featureData, error: featureError },
        { data: bookingSettings, error: settingsError },
      ] = await Promise.all([
        supabase
          .from("salon_features")
          .select("enabled")
          .eq("salon_id", profileData.salon_id)
          .eq("feature_key", "bookings")
          .maybeSingle(),

        supabase
          .from("salon_booking_settings")
.select("accept_online_bookings, timezone")
          .eq("salon_id", profileData.salon_id)
          .maybeSingle(),
      ]);

      if (featureError) {
        console.error(
          "Could not load Bookings feature:",
          featureError.message
        );
        setMessage(
          "Online booking is currently unavailable."
        );
        setLoading(false);
        return;
      }

      if (settingsError) {
        console.error(
          "Could not load booking settings:",
          settingsError.message
        );
        setMessage(
          "Online booking is currently unavailable."
        );
        setLoading(false);
        return;
      }

      if (featureData?.enabled !== true) {
        setMessage(
          "Online booking is not available for this salon."
        );
        setLoading(false);
        return;
      }

      if (
        bookingSettings?.accept_online_bookings !== true
      ) {
        setMessage(
          "This salon is not currently accepting online bookings."
        );
        setLoading(false);
        return;
      }
setSalonTimezone(
  bookingSettings?.timezone || "Europe/London"
);
      setBookingsAllowed(true);
      setLoading(false);
    }

    void loadPage();
  }, [router]);
    useEffect(() => {
    async function loadAvailability() {
  setSelectedSlot(null);
  setSelectedBedId(null);

  if (!bookingDate) {
        setAvailableSlots([]);
        setAvailabilityError("");
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError("");

      const { data, error } = await supabase.rpc(
        "get_customer_booking_availability",
        {
          p_booking_date: bookingDate,
          p_session_minutes: sessionMinutes,
        }
      );

      if (error) {
        console.warn(
  "Could not load booking availability:",
  error.message
);

        setAvailableSlots([]);
        setAvailabilityError(error.message);
        setAvailabilityLoading(false);
        return;
      }

      setAvailableSlots((data ?? []) as BookingSlot[]);
      setAvailabilityLoading(false);
    }

    void loadAvailability();
  }, [bookingDate, sessionMinutes]);
  async function submitBooking() {
  if (!selectedSlot) {
    return;
  }

  setBookingSubmitting(true);
  setBookingError("");
  setBookingSuccess("");

  const { error } = await supabase.rpc(
    "create_customer_booking",
    {
      p_bed_id: selectedSlot.bed_id,
      p_starts_at: selectedSlot.starts_at,
      p_session_minutes: sessionMinutes,
    }
  );

  if (error) {
    console.error(
      "Could not create booking:",
      error.message
    );

    setBookingError(error.message);
    setBookingSubmitting(false);
    return;
  }

  const localTime = new Intl.DateTimeFormat(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: salonTimezone,
    }
  ).format(new Date(selectedSlot.starts_at));

  setBookingSuccess(
  `${selectedSlot.bed_name} booked for ${localTime}.`
);


const { data: refreshedSlots, error: refreshError } =
  await supabase.rpc(
    "get_customer_booking_availability",
    {
      p_booking_date: bookingDate,
      p_session_minutes: sessionMinutes,
    }
  );

if (refreshError) {
  console.warn(
    "Could not refresh booking availability:",
    refreshError.message
  );
} else {
  setAvailableSlots((refreshedSlots ?? []) as BookingSlot[]);
}

setBookingSubmitting(false);
}
const availableBeds = Array.from(
  new Map(
    availableSlots.map((slot) => [
      slot.bed_id,
      {
        bed_id: slot.bed_id,
        bed_name: slot.bed_name,
      },
    ])
  ).values()
);

const selectedBedSlots = selectedBedId
  ? availableSlots.filter(
      (slot) => slot.bed_id === selectedBedId
    )
  : [];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <p className="text-zinc-400">
          Loading booking options...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${salonName} logo`}
                className="h-24 w-24 rounded-2xl bg-[#111] object-cover"
              />
            ) : (
              <span className="text-5xl">☀️</span>
            )}

            <div>
              <p className="font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
                {salonName}
              </p>

              <h1 className="mt-2 text-4xl font-bold md:text-5xl">
                Book a Sunbed
              </h1>
            </div>
          </div>

          <Link
            href={
              salonSlug
                ? `/my-minutes?salon=${encodeURIComponent(
                    salonSlug
                  )}`
                : "/my-minutes"
            }
            className="rounded-full border border-[#d6a84f] px-5 py-2 font-bold text-white transition hover:bg-[#d6a84f] hover:text-black"
          >
            My Minutes
          </Link>
        </div>

        {tagline && (
          <p className="mt-4 text-zinc-400">
            {tagline}
          </p>
        )}

        {!bookingsAllowed ? (
          <div className="mt-8 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
            <p className="text-zinc-300">{message}</p>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#d6a84f]">
              Online Booking
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Choose your sunbed and time
            </h2>

            <p className="mt-3 text-zinc-400">
              Select your tanning time and TanSalonOS will
              show the available sunbeds and start times.
            </p>
            <div className="mt-8">
  <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
    How long would you like to tan?
  </p>

  <div className="mt-4 flex flex-wrap items-center gap-3">
    {[8, 10, 12, 16].map((minutes) => (
      <button
        key={minutes}
        type="button"
        onClick={() => setSessionMinutes(minutes)}
        className={`rounded-full border px-6 py-3 font-bold transition ${
          sessionMinutes === minutes
            ? "border-[#d6a84f] bg-[#d6a84f] text-black"
            : "border-zinc-700 text-white hover:border-[#d6a84f]"
        }`}
      >
        {minutes} mins
      </button>
    ))}

    <div className="flex items-center gap-2">
  <input
    type="number"
    min="1"
    placeholder="Custom"
    value={
      [8, 10, 12, 16].includes(sessionMinutes)
        ? ""
        : sessionMinutes
    }
    onChange={(event) => {
      const value = Number(event.target.value);

      if (value > 0) {
        setSessionMinutes(value);
      }
    }}
    className="w-28 rounded-full border border-zinc-700 bg-black px-4 py-3 text-center font-bold text-white outline-none transition placeholder:text-zinc-500 focus:border-[#d6a84f]"
  />

  <span className="text-sm font-semibold text-zinc-400">
    mins
  </span>
</div>
  </div>
</div>
<div className="mt-8">
  <label
    htmlFor="booking-date"
    className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400"
  >
    Choose a date
  </label>

  <div className="mt-4">
    <input
      id="booking-date"
      type="date"
      value={bookingDate}
      onChange={(event) =>
        setBookingDate(event.target.value)
      }
      className="rounded-2xl border border-zinc-700 bg-black px-5 py-3 font-semibold text-white outline-none transition focus:border-[#d6a84f]"
    />
  </div>
</div>
<div className="mt-8">
  {availabilityLoading && (
    <p className="text-zinc-400">
      Checking available sunbeds...
    </p>
  )}

  {!availabilityLoading && availabilityError && (
    <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-red-300">
      {availabilityError}
    </div>
  )}

  {!availabilityLoading &&
    !availabilityError &&
    bookingDate &&
    availableSlots.length === 0 && (
      <div className="rounded-2xl border border-zinc-700 bg-black/30 p-5 text-zinc-300">
        No available sunbeds for this date.
      </div>
    )}

  {!availabilityLoading &&
  !availabilityError &&
  availableSlots.length > 0 && (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
        Choose your sunbed
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {availableBeds.map((bed) => (
          <button
            key={bed.bed_id}
            type="button"
            onClick={() => {
              setSelectedBedId(bed.bed_id);
              setSelectedSlot(null);
            }}
            className={`rounded-2xl border px-6 py-4 font-bold transition ${
              selectedBedId === bed.bed_id
                ? "border-[#d6a84f] bg-[#d6a84f] text-black"
                : "border-zinc-700 bg-black/30 text-white hover:border-[#d6a84f]"
            }`}
          >
            {bed.bed_name}
          </button>
        ))}
      </div>

      {selectedBedId && (
        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
            Available times
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {selectedBedSlots.map((slot) => {
              const localTime =
                new Intl.DateTimeFormat("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: salonTimezone,
                }).format(new Date(slot.starts_at));

              const isSelected =
                selectedSlot?.bed_id === slot.bed_id &&
                selectedSlot?.starts_at === slot.starts_at;

              return (
                <button
                  key={`${slot.bed_id}-${slot.starts_at}`}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-full border px-5 py-3 font-bold transition ${
                    isSelected
                      ? "border-[#d6a84f] bg-[#d6a84f] text-black"
                      : "border-zinc-700 bg-black/30 text-white hover:border-[#d6a84f]"
                  }`}
                >
                  {localTime}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  )}
</div>
{selectedSlot && (
  <div className="mt-8 rounded-2xl border border-[#d6a84f]/30 bg-black/30 p-5">
    <p className="text-zinc-400">
      You selected
    </p>

    <p className="mt-1 text-xl font-bold text-white">
      {selectedSlot.bed_name}
    </p>
    <p className="mt-2 text-zinc-300">
  {new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: salonTimezone,
  }).format(new Date(selectedSlot.starts_at))}
  {" · "}
  {sessionMinutes} mins
</p>

    {!bookingSuccess && (
  <button
    type="button"
    onClick={() => void submitBooking()}
    disabled={bookingSubmitting}
    className="mt-5 rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
  >
    {bookingSubmitting
      ? "Booking..."
      : "Book This Sunbed"}
  </button>
)}

    {bookingError && (
      <p className="mt-4 text-red-300">
        {bookingError}
      </p>
    )}

    {bookingSuccess && (
      <p className="mt-4 font-semibold text-emerald-400">
        {bookingSuccess}
      </p>
    )}
  </div>
)}
          </div>
        )}
      </section>
    </main>
  );
}
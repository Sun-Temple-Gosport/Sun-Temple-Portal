"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
const gallery = [
  ["/reception.jpg", "Luxury reception"],
  ["/megasunbed.jpg", "MegaSun G800"],
  ["/standupbooth.jpg", "Stand-up booth"],
  ["/hero.jpg", "Luxury tanning salon"],
  ["/featurewall.jpg", "Luxury interior"],
];
type SalonImage = {
  id: number;
  image_url: string;
  sort_order: number;
};
export default function Home() {
  const [salonName, setSalonName] = useState("Your Salon");
const [tagline, setTagline] = useState(
  "Your local tanning salon."
);
const [logoUrl, setLogoUrl] = useState<string | null>(null);
const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
const [salonImages, setSalonImages] = useState<SalonImage[]>([]);
const [address, setAddress] = useState("");
const [phone, setPhone] = useState("");
const [openingHours, setOpeningHours] = useState<{
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
} | null>(null);

useEffect(() => {
  async function loadSalonWebsite() {
    const salonSlug = new URLSearchParams(window.location.search).get("salon");
    if (!salonSlug) {
      console.error("Could not load salon website: salon slug missing.");
      return;
    }

    const { data: salon, error: salonError } = await publicSupabase
      .from("salons")
      .select("id")
      .eq("slug", salonSlug)
      .eq("active", true)
      .maybeSingle();

    if (salonError || !salon?.id) {
      console.error(
        "Could not resolve salon:",
        salonError?.message || "Salon not found."
      );
      return;
    }

    const [{ data: brandingData, error: brandingError }, { data: imageData, error: imageError }] =
      await Promise.all([
        publicSupabase
          .from("salon_settings")
          .select(
            "salon_name, tagline, logo_url, hero_image_url, reception_image_url, bed_image_1_url, bed_image_2_url, interior_image_url, address, phone, opening_hours"
          )
          .eq("salon_id", salon.id)
          .maybeSingle(),

        publicSupabase
          .from("salon_images")
          .select("id, image_url, sort_order")
          .eq("salon_id", salon.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

    if (brandingError) {
      console.error(
        "Could not load salon branding:",
        brandingError.message
      );
    } else if (brandingData) {
      setSalonName(brandingData.salon_name || "Your Salon");
      setTagline(
        brandingData.tagline || "Your local tanning salon."
      );
      setLogoUrl(brandingData.logo_url || null);
      setHeroImageUrl(brandingData.hero_image_url || null);
      setAddress(brandingData.address || "");
      setPhone(brandingData.phone || "");
      setOpeningHours(brandingData.opening_hours || null);
    }

    if (imageError) {
      console.error(
        "Could not load salon photos:",
        imageError.message
      );
    } else {
      setSalonImages((imageData ?? []) as SalonImage[]);
    }
  }

  void loadSalonWebsite();
}, []);
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#d6a84f]/20 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
  {logoUrl ? (
    <img
      src={logoUrl}
      alt={`${salonName} logo`}
      className="h-14 w-14 rounded-xl bg-[#111] object-cover"
    />
  ) : (
    <span className="text-3xl">☀️</span>
  )}

  <div>
    <p className="text-lg font-semibold tracking-[0.2em] text-[#d6a84f]">
      {salonName}
    </p>

    {tagline && (
      <p className="max-w-xs text-xs text-zinc-400">
        {tagline}
      </p>
    )}
  </div>
</div>

          <div className="hidden items-center gap-8 text-sm md:flex">
            <a href="#packages" className="hover:text-[#d6a84f]">Packages</a>
            <a href="#gallery" className="hover:text-[#d6a84f]">Gallery</a>
            <a href="#contact" className="hover:text-[#d6a84f]">Contact</a>

           <a
  href="/my-minutes"
  className="rounded-full bg-[#d6a84f] px-6 py-3 font-semibold text-black transition hover:scale-105"
>
  Log in/Create account
</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="flex min-h-screen items-center bg-cover bg-center"
        style={{
  backgroundImage: `url(${heroImageUrl || "/hero.jpg"})`,
}}
      >
        <div className="w-full bg-black/60">
          <div className="mx-auto max-w-7xl px-6 py-40">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#d6a84f]">
  {salonName}
</p>

            <h1 className="mt-6 max-w-3xl text-6xl font-bold leading-tight md:text-8xl">
              Luxury tanning,
              <br />
              minutes made simple.
            </h1>

            <p className="mt-8 max-w-xl text-lg text-zinc-300">
              Create your account, buy tanning minutes and check your balance from your phone..
            </p>

            <div className="mt-10 flex gap-4">
              <a
  href="/my-minutes"
  className="rounded-full border border-[#d6a84f] px-6 py-3 font-semibold text-white transition hover:bg-[#d6a84f] hover:text-black"
>
  Log in/Create account
</a>



              <a
                href="#gallery"
                className="rounded-full border border-[#d6a84f] px-8 py-4 hover:bg-[#d6a84f] hover:text-black"
              >
                View Gallery
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="mb-12 text-4xl font-bold">Our Salon</h2>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
  {salonImages.map((image) => (
    <div
      key={image.id}
      className="overflow-hidden rounded-3xl border border-[#d6a84f]/20 bg-[#111]"
    >
      <img
        src={image.image_url}
        alt="Salon photo"
        className="h-80 w-full object-cover"
      />
    </div>
  ))}
</div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="border-t border-[#d6a84f]/20 px-6 py-20 text-center"
      >
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Visit Us
        </p>

       <h2 className="text-4xl font-bold">
  {salonName}
</h2>

        <p className="mt-6 text-lg text-zinc-400">
  {address || tagline}
</p>
{phone && (
  <a
    href={`tel:${phone.replace(/\s+/g, "")}`}
    className="mt-6 mb-6 inline-block text-xl font-bold text-[#d6a84f] hover:underline"
  >
    {phone}
  </a>
)}
{openingHours && (
  <div className="mt-8 max-w-md mx-auto">
    <h3 className="mb-5 text-center text-xl font-bold text-white">
      Opening Hours
    </h3>

    {[
      ["Monday", openingHours.monday],
      ["Tuesday", openingHours.tuesday],
      ["Wednesday", openingHours.wednesday],
      ["Thursday", openingHours.thursday],
      ["Friday", openingHours.friday],
      ["Saturday", openingHours.saturday],
      ["Sunday", openingHours.sunday],
    ].map(([day, hours]) => (
      <div
        key={day}
        className="flex items-center justify-between border-b border-white/10 py-2 text-zinc-300"
      >
        <span className="font-semibold">{day}</span>
        <span>{hours}</span>
      </div>
    ))}
  </div>
)}
      </section>
    </main>
  );
}
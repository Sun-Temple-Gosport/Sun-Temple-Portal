"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VipCheckoutButton from "./VipCheckoutButton";
import { supabase } from "@/lib/supabase";

type VipSettings = {
  id: number;
  price: number;
  discount_percent: number;
  duration_days: number;
  course_expiry_days: number;
};

export default function VipCheckoutPage() {
  const router = useRouter();

  const [vip, setVip] = useState<VipSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [salonName, setSalonName] = useState("Your Salon");
  const [tagline, setTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadVipCheckout() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("customer_id, salon_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load profile:", profileError.message);
        setLoading(false);
        return;
      }

      if (!profile?.salon_id) {
        console.error("Customer salon could not be determined.");
        setLoading(false);
        return;
      }

      const customerId = profile.customer_id || user.id;

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("customer_id")
        .eq("customer_id", customerId)
        .eq("salon_id", profile.salon_id)
        .maybeSingle();

      if (customerError || !customer) {
        console.error(
          "Customer lookup failed:",
          customerError?.message
        );
        setLoading(false);
        return;
      }

      const [
        { data: vipData, error: vipError },
        { data: brandingData, error: brandingError },
      ] = await Promise.all([
        supabase
          .from("vip_settings")
          .select(
            "id, price, discount_percent, duration_days, course_expiry_days"
          )
          .eq("salon_id", profile.salon_id)
          .maybeSingle(),

        supabase
          .from("salon_settings")
          .select("salon_name, tagline, logo_url")
          .eq("salon_id", profile.salon_id)
          .maybeSingle(),
      ]);

      if (vipError) {
        console.error("Failed to load VIP settings:", vipError.message);
      }

      if (brandingError) {
        console.error(
          "Could not load salon branding:",
          brandingError.message
        );
      }

      if (brandingData) {
        setSalonName(brandingData.salon_name || "Your Salon");
        setTagline(brandingData.tagline || "");
        setLogoUrl(brandingData.logo_url || null);
      }

      setVip(vipData as VipSettings | null);
      setLoading(false);
    }

    void loadVipCheckout();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <p className="text-zinc-400">Loading VIP membership...</p>
      </main>
    );
  }

  if (!vip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-12 text-center">
          <h1 className="text-3xl font-bold">VIP unavailable</h1>

          <p className="mt-4 text-zinc-400">
            VIP membership is currently unavailable.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-12 text-white">
      <div className="w-full max-w-[520px] rounded-3xl border border-[#d6a84f]/40 bg-[#111] p-8 md:p-10">
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
            <p className="font-semibold uppercase tracking-[0.25em] text-[#d6a84f]">
              {salonName} VIP
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              VIP Membership
            </h1>
          </div>
        </div>

        {tagline && (
          <p className="mt-5 text-zinc-400">{tagline}</p>
        )}

        <p className="mt-6 text-zinc-300">
          Save {vip.discount_percent}% on every minute package for the next
          12 months.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-[#d6a84f]/20 bg-black/30 p-5 text-sm text-zinc-300">
          <p>⭐ {vip.discount_percent}% off every minute package</p>
          <p>⏰ Courses remain valid for {vip.course_expiry_days} days</p>
          <p>👑 Membership lasts for 12 months</p>
        </div>

        <p className="mt-7 text-5xl font-bold text-[#d6a84f]">
          £{Number(vip.price).toFixed(2)}
        </p>

        <VipCheckoutButton />
      </div>
    </main>
  );
}
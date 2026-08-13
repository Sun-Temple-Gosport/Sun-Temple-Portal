"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  amount: number;
  durationDays: number;
};

export default function VipCheckoutButton({
  amount,
  durationDays,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    if (loading) return;

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        alert("Please log in first.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("customer_id, salon_id")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("Profile lookup failed:", profileError);
  alert("Unable to find your customer account.");
  return;
}

if (!profile?.salon_id) {
  alert(
    "Your login is not connected to a salon. Please contact reception."
  );
  return;
}

const customerId = profile.customer_id || user.id;

const { data: customer, error: customerError } = await supabase
  .from("customers")
  .select("customer_id")
  .eq("customer_id", customerId)
  .eq("salon_id", profile.salon_id)
  .maybeSingle();

if (customerError) {
  console.error("Customer lookup failed:", customerError);
  alert("Unable to find your customer account.");
  return;
}

if (!customer) {
  alert(
    "Your login is not connected to a customer account. Please contact reception."
  );
  return;
}

      const checkoutReference = `vip-${Date.now()}`;

      const response = await fetch("/api/sumup/vip-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.customer_id,
          amount,
          durationDays,
          checkoutReference,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("VIP checkout failed:", result);
        alert(result.error ?? "Unable to start VIP checkout.");
        return;
      }

      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error("VIP checkout failed:", error);
      alert("Unable to start VIP checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={loading}
      className="mt-8 w-full rounded-full bg-[#d6a84f] py-4 text-lg font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Opening checkout..." : "Become a VIP"}
    </button>
  );
}
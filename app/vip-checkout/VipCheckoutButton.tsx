"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VipCheckoutButton() {
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

      

      const checkoutReference = `vip-${Date.now()}`;

      const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.access_token) {
  alert("Your login session has expired. Please log in again.");
  return;
}

const response = await fetch("/api/sumup/vip-checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
        body: JSON.stringify({
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
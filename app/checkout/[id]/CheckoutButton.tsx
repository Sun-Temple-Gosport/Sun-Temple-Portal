"use client";

import { supabase } from "../../../lib/supabase";

export default function CheckoutButton({
  amount,
  description,
  packageId,
  minutes,
}: {
  amount: number;
  description: string;
  packageId: number;
  minutes: number;
}) {
  async function handleCheckout() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
  alert("Please log in first.");

  const requestedSalonSlug = new URLSearchParams(
    window.location.search
  ).get("salon");

  window.location.href = requestedSalonSlug
    ? `/login?salon=${encodeURIComponent(requestedSalonSlug)}`
    : "/login";

  return;
}

    

    const checkoutReference = `tansalonos-${Date.now()}`;

   const {
  data: { session },
} = await supabase.auth.getSession();

if (!session?.access_token) {
  alert("Your login session has expired. Please log in again.");
  return;
}

const res = await fetch("/api/payments/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
      body: JSON.stringify({
  amount,
  description,
  packageId,
  minutes,
  checkoutReference,
}),
    });

    const data = await res.json();

    if (data.type === "redirect" && data.checkoutUrl) {
  window.location.href = data.checkoutUrl;
} else {
  alert(JSON.stringify(data, null, 2));
}
  }

  return (
    <button
      onClick={handleCheckout}
      className="mt-10 w-full rounded-full bg-[#d6a84f] py-4 font-bold text-black"
    >
      Pay securely
    </button>
  );
}
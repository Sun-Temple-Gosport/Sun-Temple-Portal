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
      window.location.href = "/login";
      return;
    }
    const customerId = user.id;

    const checkoutReference = `suntemple-${Date.now()}`;

    const res = await fetch("/api/sumup/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        description,
        packageId,
        minutes,
        customerId,
        checkoutReference,
      }),
    });

    const data = await res.json();

    if (data.hosted_checkout_url) {
      window.location.href = data.hosted_checkout_url;
    } else {
      alert(JSON.stringify(data, null, 2));
    }
  }

  return (
    <button
      onClick={handleCheckout}
      className="mt-10 w-full rounded-full bg-[#d6a84f] py-4 text-black font-bold"
    >
      Pay with SumUp
    </button>
  );
}
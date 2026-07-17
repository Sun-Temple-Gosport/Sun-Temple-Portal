"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function MyMinutes() {
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const router = useRouter();

async function logout() {
  await supabase.auth.signOut();
  router.push("/login");
}

  useEffect(() => {
    async function loadCustomer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: customerData, error: customerError } = await supabase
  .from("customers")
  .select("customer_id")
  .eq("email", user.email)
  .maybeSingle();

if (customerError || !customerData) {
  console.error(
    "Could not match customer account:",
    customerError?.message || "Customer record not found."
  );
  return;
}

const { data: balanceData, error: balanceError } = await supabase
  .from("customer_balances")
  .select("*")
  .eq("customer_id", customerData.customer_id)
  .maybeSingle();

if (balanceError) {
  console.error("Could not load customer balance:", balanceError);
}

setProfile({
  ...profileData,
  full_name: profileData?.full_name || balanceData?.full_name || user.email,
});

setBalance(balanceData);
    }

    loadCustomer();
  }, []);

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Sun Temple Gosport
        </p>

        <h1 className="mt-4 text-5xl font-bold">My Minutes</h1>

        <div className="mt-10 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
          <p className="text-zinc-400">Welcome back</p>

          <h2 className="mt-2 text-3xl font-bold">
            {profile?.full_name || "Customer"}
          </h2>

          <div className="mt-8">
  <p className="text-zinc-400">Minutes remaining</p>

  <p className="mt-2 text-7xl font-bold text-[#d6a84f]">
    {balance?.total_minutes ?? 0}
  </p>

  <p className="mt-6 text-zinc-400">
    Next expiry
  </p>

  <p className="mt-1 text-2xl font-bold text-white">
    {balance?.next_expiry
      ? new Date(balance.next_expiry).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "No active expiry"}
  </p>
</div>

          <div className="mt-10 flex flex-wrap gap-4">
  <a
    href="/buy-minutes"
    className="rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
  >
    Buy More Minutes
  </a>

  <button
    type="button"
    onClick={logout}
    className="rounded-full border border-zinc-700 px-8 py-4 font-bold text-white hover:border-[#d6a84f]"
  >
    Logout
  </button>
</div>
        </div>
      </section>
    </main>
  );
}
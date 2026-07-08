"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MyMinutes() {
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);

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

      const { data: balanceData } = await supabase
  .from("customer_balances")
  .select("*")
  .eq("email", user.email)
  .single();

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

          <a
            href="/buy-minutes"
            className="mt-10 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
          >
            Buy More Minutes
          </a>
        </div>
      </section>
    </main>
  );
}
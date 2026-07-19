"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PackageOption = {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean | null;
};

type VipSettings = {
  id: number;
  price: number;
  discount_percent: number;
  duration_days: number;
  course_expiry_days: number;
};

type CustomerVip = {
  customer_id: string;
  vip_expires_at: string | null;
};

export default function BuyMinutes() {
  const router = useRouter();

  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [vip, setVip] = useState<VipSettings | null>(null);
  const [customer, setCustomer] = useState<CustomerVip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [
        { data: packageData, error: packagesError },
        { data: vipData, error: vipError },
        { data: customerData, error: customerError },
      ] = await Promise.all([
        supabase
          .from("packages")
          .select("id, name, minutes, price, expiry_days, active")
          .eq("active", true)
          .gte("minutes", 30)
          .order("minutes", { ascending: true }),

        supabase
          .from("vip_settings")
          .select(
            "id, price, discount_percent, duration_days, course_expiry_days"
          )
          .eq("id", 1)
          .maybeSingle(),

        supabase
          .from("customers")
          .select("customer_id, vip_expires_at")
          .eq("email", user.email)
          .maybeSingle(),
      ]);

      if (packagesError) {
        console.error("Failed to load packages:", packagesError.message);
      }

      if (vipError) {
        console.error("Failed to load VIP settings:", vipError.message);
      }

      if (customerError) {
        console.error(
          "Failed to load customer VIP status:",
          customerError.message
        );
      }

      setPackages((packageData ?? []) as PackageOption[]);
      setVip(vipData as VipSettings | null);
      setCustomer(customerData as CustomerVip | null);
      setLoading(false);
    }

    loadPage();
  }, [router]);

  const isVip =
    !!customer?.vip_expires_at &&
    new Date(customer.vip_expires_at) > new Date();

  const visiblePackages = packages.map((pkg) => ({
    ...pkg,
    price:
      isVip && vip
        ? Number(
            (Number(pkg.price) * (1 - vip.discount_percent / 100)).toFixed(2)
          )
        : Number(pkg.price),
  }));

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <p className="text-zinc-400">Loading packages...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Sun Temple Gosport
        </p>

        <h1 className="mt-3 text-4xl font-bold md:text-5xl">
          Buy Minutes
        </h1>

        {isVip && vip && (
          <div className="mt-8 rounded-3xl border border-[#d6a84f]/50 bg-gradient-to-br from-[#1b160d] to-[#111] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#d6a84f]">
              VIP Member
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Your {vip.discount_percent}% discount is active
            </h2>

            <p className="mt-2 text-zinc-300">
              Discounted prices are shown below.
            </p>
          </div>
        )}

        {!isVip && vip && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-[#d6a84f]/50 bg-gradient-to-br from-[#1b160d] to-[#111] p-6 md:p-7">
            <div className="grid gap-6 md:grid-cols-[1fr_190px] md:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#d6a84f]">
                  Sun Temple VIP
                </p>

                <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                  Become a VIP
                </h2>

                <p className="mt-2 text-sm text-zinc-300 md:text-base">
                  Save{" "}
                  <strong className="text-white">
                    {vip.discount_percent}%
                  </strong>{" "}
                  on every minute package and enjoy{" "}
                  <strong className="text-white">
                    {vip.course_expiry_days}-day
                  </strong>{" "}
                  course expiry for a full year.
                </p>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#d6a84f]/20 bg-black/30 p-3">
                    <p className="text-xl font-bold text-[#d6a84f]">
                      {vip.discount_percent}% off
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Every package
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#d6a84f]/20 bg-black/30 p-3">
                    <p className="text-xl font-bold text-[#d6a84f]">
                      {vip.course_expiry_days} days
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Course expiry
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#d6a84f]/20 bg-black/30 p-3">
                    <p className="text-xl font-bold text-[#d6a84f]">
                      12 months
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Membership
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#d6a84f]/30 bg-black/40 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Annual membership
                </p>

                <p className="mt-2 text-4xl font-bold text-[#d6a84f]">
                  £{Number(vip.price).toFixed(2)}
                </p>

                <Link
                  href="/vip-checkout"
                  className="mt-4 block w-full rounded-full bg-[#d6a84f] py-3 text-center font-bold text-black hover:opacity-90"
                >
                  Become a VIP
                </Link>
              </div>
            </div>
          </div>
        )}

        {visiblePackages.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
            <p className="text-zinc-300">
              Packages are currently unavailable. Please try again later.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {visiblePackages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-7"
              >
                <h2 className="text-3xl font-bold">{pkg.minutes}</h2>

                <p className="mt-2 text-zinc-400">Minutes</p>

                <p className="mt-5 text-4xl font-bold text-[#d6a84f]">
                  £{pkg.price.toFixed(2)}
                </p>

                {isVip && (
                  <p className="mt-2 text-sm font-semibold text-emerald-400">
                    VIP price
                  </p>
                )}

                <p className="mt-3 text-sm text-zinc-400">
                  ⏰ Your minutes are valid for{" "}
                  <strong className="text-zinc-200">
                    {isVip && vip
                      ? vip.course_expiry_days
                      : pkg.expiry_days}{" "}
                    days
                  </strong>{" "}
                  from the date of purchase.
                </p>

                <Link
                  href={`/checkout/${pkg.id}`}
                  className="mt-7 inline-block w-full rounded-full bg-[#d6a84f] py-4 text-center font-bold text-black"
                >
                  Buy Now
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
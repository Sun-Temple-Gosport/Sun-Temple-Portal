"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CheckoutButton from "./CheckoutButton";
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
  discount_percent: number;
  course_expiry_days: number;
};

type CustomerVip = {
  vip_expires_at: string | null;
};

export default function Checkout() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [pkg, setPkg] = useState<PackageOption | null>(null);
  const [vip, setVip] = useState<VipSettings | null>(null);
  const [customer, setCustomer] = useState<CustomerVip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCheckout() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const packageId = Number(params.id);

      if (!Number.isFinite(packageId)) {
        setLoading(false);
        return;
      }

      const [
        { data: packageData, error: packageError },
        { data: vipData, error: vipError },
        { data: customerData, error: customerError },
      ] = await Promise.all([
        supabase
          .from("packages")
          .select("id, name, minutes, price, expiry_days, active")
          .eq("id", packageId)
          .eq("active", true)
          .gte("minutes", 30)
          .maybeSingle(),

        supabase
          .from("vip_settings")
          .select("discount_percent, course_expiry_days")
          .eq("id", 1)
          .maybeSingle(),

        supabase
          .from("customers")
          .select("vip_expires_at")
          .eq("email", user.email)
          .maybeSingle(),
      ]);

      if (packageError) {
        console.error("Failed to load package:", packageError.message);
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

      setPkg(packageData as PackageOption | null);
      setVip(vipData as VipSettings | null);
      setCustomer(customerData as CustomerVip | null);
      setLoading(false);
    }

    loadCheckout();
  }, [params.id, router]);

  const isVip =
    !!customer?.vip_expires_at &&
    new Date(customer.vip_expires_at) > new Date();

  const checkoutPrice =
    pkg && isVip && vip
      ? Number(
          (
            Number(pkg.price) *
            (1 - vip.discount_percent / 100)
          ).toFixed(2)
        )
      : Number(pkg?.price ?? 0);

  const expiryDays =
    isVip && vip ? vip.course_expiry_days : pkg?.expiry_days;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <p className="text-zinc-400">Loading checkout...</p>
      </main>
    );
  }

  if (!pkg) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-12 text-center">
          <h1 className="text-3xl font-bold">Package not found</h1>

          <p className="mt-4 text-zinc-400">
            This package is no longer available.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
      <div className="w-full max-w-[500px] rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-12">
        <h1 className="text-4xl font-bold">{pkg.minutes} Minutes</h1>

        <p className="mt-4 text-5xl font-bold text-[#d6a84f]">
          £{checkoutPrice.toFixed(2)}
        </p>

        {isVip && vip && (
          <p className="mt-2 font-semibold text-emerald-400">
            VIP price — {vip.discount_percent}% discount applied
          </p>
        )}

        {expiryDays && (
          <p className="mt-4 text-sm text-zinc-400">
            ⏰ Valid for{" "}
            <strong className="text-zinc-200">
              {expiryDays} days
            </strong>{" "}
            from purchase.
          </p>
        )}

        <CheckoutButton
          amount={checkoutPrice}
          description={`${pkg.minutes} Minute Package`}
          packageId={pkg.id}
          minutes={pkg.minutes}
        />
      </div>
    </main>
  );
} 
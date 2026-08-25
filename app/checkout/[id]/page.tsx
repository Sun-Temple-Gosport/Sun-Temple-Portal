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
  is_unlimited: boolean | null;
};

type VipSettings = {
  discount_percent: number;
  course_expiry_days: number;
};

type CustomerVip = {
  customer_id: string;
  vip_expires_at: string | null;
  salon_id: string;
};

export default function Checkout() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [pkg, setPkg] = useState<PackageOption | null>(null);
  const [vip, setVip] = useState<VipSettings | null>(null);
  const [customer, setCustomer] = useState<CustomerVip | null>(null);
  const [loading, setLoading] = useState(true);
  const [salonName, setSalonName] = useState("Your Salon");
const [tagline, setTagline] = useState("");
const [logoUrl, setLogoUrl] = useState<string | null>(null);
const [paymentProvider, setPaymentProvider] = useState<string | null>(null);

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

      const { data: profileData, error: profileError } = await supabase
  .from("profiles")
  .select("salon_id, customer_id")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  console.error(
    "Failed to load customer profile:",
    profileError.message
  );
  setLoading(false);
  return;
}

if (!profileData?.salon_id) {
  console.error("Customer salon could not be determined.");
  setLoading(false);
  return;
}

let customerQuery = supabase
  .from("customers")
  .select("customer_id, vip_expires_at, salon_id")
  .eq("salon_id", profileData.salon_id);

if (profileData.customer_id) {
  customerQuery = customerQuery.eq(
    "customer_id",
    profileData.customer_id
  );
} else {
  customerQuery = customerQuery.eq("email", user.email);
}

const { data: customerData, error: customerError } =
  await customerQuery.maybeSingle();

if (customerError) {
  console.error(
    "Failed to load customer VIP status:",
    customerError.message
  );
  setLoading(false);
  return;
}

if (!customerData) {
  console.error(
    "Customer record could not be found for this salon."
  );
  setLoading(false);
  return;
}
const { data: brandingData, error: brandingError } = await supabase
  .from("salon_settings")
  .select("salon_name, tagline, logo_url, payment_provider")
  .eq("salon_id", customerData.salon_id)
  .maybeSingle();

if (brandingError) {
  console.error("Could not load salon branding:", brandingError.message);
} else if (brandingData) {
  setSalonName(brandingData.salon_name || "Your Salon");
  setTagline(brandingData.tagline || "");
  setLogoUrl(brandingData.logo_url || null);
  setPaymentProvider(brandingData.payment_provider || null);
}

const [
  { data: packageData, error: packageError },
  { data: vipData, error: vipError },
] = await Promise.all([
  supabase
  .from("packages")
  .select("id, name, minutes, price, expiry_days, active, is_unlimited")
  .eq("id", packageId)
  .eq("salon_id", customerData.salon_id)
  .eq("active", true)
  .maybeSingle(),

  supabase
    .from("vip_settings")
    .select("discount_percent, course_expiry_days")
    .eq("salon_id", customerData.salon_id)
    .maybeSingle(),
]);

      if (packageError) {
        console.error("Failed to load package:", packageError.message);
      }

      if (vipError) {
        console.error("Failed to load VIP settings:", vipError.message);
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
  <div className="mb-8 flex items-center gap-4">
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
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
        {salonName}
      </p>

      <h1 className="mt-2 text-4xl font-bold">
  {pkg.is_unlimited ? "Unlimited" : `${pkg.minutes} Minutes`}
</h1>
    </div>
  </div>

  {tagline && (
    <p className="mb-8 text-zinc-400">
      {tagline}
    </p>
  )}

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

        {[
  "sumup",
  "stripe",
  "square",
  "dojo",
  "worldpay",
  "opayo",
].includes(paymentProvider ?? "") ? (
  <CheckoutButton
  amount={checkoutPrice}
  description={
    pkg.is_unlimited
      ? "Unlimited Package"
      : `${pkg.minutes} Minute Package`
  }
  packageId={pkg.id}
  minutes={pkg.minutes}
/>
) : (
  <div className="mt-10 rounded-2xl border border-[#d6a84f]/30 bg-black/20 p-5 text-center">
    <p className="font-semibold text-white">
      Online payments are not currently available for this salon.
    </p>
  </div>
)}
      </div>
    </main>
  );
} 
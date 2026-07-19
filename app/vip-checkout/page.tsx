import VipCheckoutButton from "./VipCheckoutButton";
import { supabase } from "@/lib/supabase";

type VipSettings = {
  id: number;
  price: number;
  discount_percent: number;
  duration_days: number;
  course_expiry_days: number;
};

export default async function VipCheckoutPage() {
  const { data, error } = await supabase
    .from("vip_settings")
    .select(
      "id, price, discount_percent, duration_days, course_expiry_days"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load VIP settings:", error.message);
  }

  const vip = data as VipSettings | null;

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
        <p className="font-semibold uppercase tracking-[0.25em] text-[#d6a84f]">
          Sun Temple VIP
        </p>

        <h1 className="mt-3 text-4xl font-bold">VIP Membership</h1>

        <p className="mt-4 text-zinc-300">
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

        <VipCheckoutButton
          amount={Number(vip.price)}
          durationDays={vip.duration_days}
        />
      </div>
    </main>
  );
}
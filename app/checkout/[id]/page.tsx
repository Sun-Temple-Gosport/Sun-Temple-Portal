import CheckoutButton from "./CheckoutButton";
import { supabase } from "@/lib/supabase";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

type PackageOption = {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean | null;
};

export default async function Checkout({ params }: Props) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("packages")
    .select("id, name, minutes, price, expiry_days, active")
    .eq("id", Number(id))
    .eq("active", true)
    .gte("minutes", 30)
    .maybeSingle();

  if (error) {
    console.error("Failed to load package:", error.message);
  }

  const pkg = data as PackageOption | null;

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
          £{Number(pkg.price)}
        </p>

        {pkg.expiry_days && (
          <p className="mt-4 text-sm text-zinc-400">
            ⏰ Valid for{" "}
            <strong className="text-zinc-200">{pkg.expiry_days} days</strong>{" "}
            from purchase.
          </p>
        )}

        <CheckoutButton
          amount={Number(pkg.price)}
          description={`${pkg.minutes} Minute Package`}
          packageId={pkg.id}
          minutes={pkg.minutes}
        />
      </div>
    </main>
  );
}
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PackageOption = {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean | null;
};

export default async function BuyMinutes() {
  const { data: packages, error } = await supabase
    .from("packages")
    .select("id, name, minutes, price, expiry_days, active")
    .eq("active", true)
    .gte("minutes", 30)
    .order("minutes", { ascending: true });

  if (error) {
    console.error("Failed to load packages:", error.message);
  }

  const visiblePackages: PackageOption[] = packages || [];

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Sun Temple Gosport
        </p>

        <h1 className="mt-4 text-5xl font-bold">Buy Minutes</h1>

        {visiblePackages.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
            <p className="text-zinc-300">
              Packages are currently unavailable. Please try again later.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {visiblePackages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8"
              >
                <h2 className="text-3xl font-bold">{pkg.minutes}</h2>

                <p className="mt-2 text-zinc-400">Minutes</p>

                <p className="mt-6 text-4xl font-bold text-[#d6a84f]">
                  £{Number(pkg.price)}
                </p>

                <Link
                  href={`/checkout/${pkg.id}`}
                  className="mt-8 inline-block w-full rounded-full bg-[#d6a84f] py-4 text-center font-bold text-black"
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
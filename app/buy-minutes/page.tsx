const packages = [
  { name: "Bronze", minutes: 30, price: "£18" },
  { name: "Silver", minutes: 60, price: "£34", popular: true },
  { name: "Gold", minutes: 90, price: "£47" },
  { name: "Platinum", minutes: 120, price: "£55" },
];

export default function BuyMinutes() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="mx-auto max-w-7xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Sun Temple Gosport
        </p>

        <h1 className="mt-4 text-5xl font-bold md:text-7xl">
          Buy tanning minutes
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-zinc-400">
          Choose your package. Minutes expire one month from the date of purchase.
        </p>

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className="relative rounded-3xl border border-[#d6a84f]/20 bg-[#111] p-8 transition hover:-translate-y-2 hover:border-[#d6a84f]/60"
            >
              {pkg.popular && (
                <span className="absolute right-6 top-6 rounded-full bg-[#d6a84f] px-4 py-2 text-xs font-bold text-black">
                  POPULAR
                </span>
              )}

              <h2 className="text-2xl font-semibold text-[#d6a84f]">
                {pkg.name}
              </h2>

              <p className="mt-8 text-6xl font-bold">{pkg.minutes}</p>
              <p className="mt-2 text-zinc-400">minutes</p>

              <p className="mt-8 text-4xl font-bold text-[#d6a84f]">
                {pkg.price}
              </p>

              <button className="mt-8 w-full rounded-full bg-[#d6a84f] py-4 font-bold text-black transition hover:scale-105">
                Buy with SumUp
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
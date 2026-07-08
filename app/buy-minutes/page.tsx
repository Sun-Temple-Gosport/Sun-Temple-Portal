import Link from "next/link";

const packages = [
  { id: 1, minutes: 30, price: 18 },
  { id: 2, minutes: 60, price: 34 },
  { id: 3, minutes: 90, price: 47 },
  { id: 4, minutes: 120, price: 55 },
  { id: 5, minutes: 240, price: 100 },
  { id: 6, minutes: 1, price: 1 },
];

export default function BuyMinutes() {
  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-16">
      <section className="mx-auto max-w-5xl">
        <p className="uppercase tracking-[0.3em] text-[#d6a84f] font-semibold">
          Sun Temple Gosport
        </p>

        <h1 className="text-5xl font-bold mt-4">
          Buy Minutes
        </h1>

        <div className="grid md:grid-cols-3 gap-8 mt-12">

          {packages.map((pkg) => (

            <div
              key={pkg.id}
              className="rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8"
            >

              <h2 className="text-3xl font-bold">
                {pkg.minutes}
              </h2>

              <p className="text-zinc-400 mt-2">
                Minutes
              </p>

              <p className="mt-6 text-4xl font-bold text-[#d6a84f]">
                £{pkg.price}
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
      </section>
    </main>
  );
}
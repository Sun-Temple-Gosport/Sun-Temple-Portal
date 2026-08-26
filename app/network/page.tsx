export default function NetworkPage() {
  return (
    <main className="min-h-screen bg-[#050505] px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-400">
            TanSalonOS
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Find a Tanning Salon
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-400">
            Find salons using TanSalonOS, view their packages and buy minutes
            before you arrive.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Search salons
            </label>

            <input
              type="text"
              placeholder="Town, city, postcode or salon name"
              className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-base text-white outline-none placeholder:text-slate-600"
            />

            <button
              type="button"
              className="mt-4 w-full rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black uppercase text-black transition hover:bg-amber-300"
            >
              Find Salons
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
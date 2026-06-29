const packages = [
  { name: "Bronze", minutes: "30 minutes", price: "£18" },
  { name: "Silver", minutes: "60 minutes", price: "£34" },
  { name: "Gold", minutes: "90 minutes", price: "£47" },
  { name: "Platinum", minutes: "120 minutes", price: "£55" },
];

const photos = [
  ["/reception.jpg", "Luxury reception"],
  ["/megasunbed.jpg", "MegaSun G800"],
  ["/standupbooth.jpg", "Stand-up booth"],
  ["/hero.jpg", "Sun Temple Gosport"],
  ["/featurewall.jpg", "Luxury interior"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-lg font-semibold tracking-[0.35em] text-[#d6a84f]">
              SUN TEMPLE
            </p>
            <p className="text-xs tracking-[0.25em] text-zinc-400">GOSPORT</p>
          </div>

          <div className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
            <a href="#packages" className="hover:text-[#d6a84f]">Packages</a>
            <a href="#portal" className="hover:text-[#d6a84f]">Portal</a>
            <a href="#gallery" className="hover:text-[#d6a84f]">Gallery</a>
            <a href="#contact" className="hover:text-[#d6a84f]">Contact</a>
          </div>

          <button className="rounded-full bg-[#d6a84f] px-5 py-3 text-sm font-bold text-black transition hover:scale-105">
            Buy Minutes
          </button>
        </div>
      </nav>

      <section
        className="relative flex min-h-screen items-center bg-cover bg-center px-6 pt-28"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,.68), rgba(0,0,0,.88)), url('/hero.jpg')",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-sm font-semibold tracking-[0.35em] text-[#d6a84f]">
            SUN TEMPLE GOSPORT
          </p>

          <h1 className="max-w-5xl text-5xl font-semibold leading-tight md:text-8xl">
            Luxury tanning, minutes made simple.
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-200 md:text-xl">
            Buy tanning minutes online, check your balance, and manage your
            account from your phone.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button className="rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black transition hover:scale-105">
              Buy Minutes
            </button>
            <button className="rounded-full border border-[#d6a84f]/60 px-8 py-4 font-semibold text-[#d6a84f] transition hover:bg-[#d6a84f] hover:text-black">
              Customer Login
            </button>
          </div>
        </div>
      </section>

      <section id="packages" className="bg-[#050505] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.3em] text-[#d6a84f]">
            MINUTE PACKAGES
          </p>

          <h2 className="mb-12 text-4xl font-semibold md:text-6xl">
            Choose your glow.
          </h2>

          <div className="grid gap-6 md:grid-cols-4">
            {packages.map((pack) => (
              <div
                key={pack.name}
                className="rounded-3xl border border-[#d6a84f]/20 bg-[#121212] p-7 transition duration-300 hover:-translate-y-2 hover:border-[#d6a84f]/60 hover:shadow-2xl hover:shadow-[#d6a84f]/10"
              >
                <h3 className="text-2xl font-semibold">{pack.name}</h3>
                <p className="mt-3 text-zinc-400">{pack.minutes}</p>
                <p className="mt-8 text-5xl font-bold text-[#d6a84f]">
                  {pack.price}
                </p>
                <p className="mt-5 text-sm text-zinc-500">
                  Expires after 1 month
                </p>
                <button className="mt-8 w-full rounded-full bg-[#d6a84f] px-5 py-3 font-bold text-black">
                  Buy {pack.minutes}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="portal" className="bg-[#0b0b0b] px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-[0.3em] text-[#d6a84f]">
              CUSTOMER PORTAL
            </p>
            <h2 className="text-4xl font-semibold leading-tight md:text-6xl">
              Your tanning minutes, always in your pocket.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
              Customers can buy minutes, view balances, check expiry dates, and
              top up without calling the salon.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#d6a84f]/20 bg-[#111] p-8 shadow-2xl">
            <p className="text-zinc-400">Welcome back</p>
            <h3 className="mt-2 text-3xl font-semibold">Sarah</h3>

            <div className="mt-8 rounded-3xl bg-black p-6">
              <p className="text-zinc-400">Remaining Minutes</p>
              <p className="mt-3 text-6xl font-bold text-[#d6a84f]">67</p>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-[65%] rounded-full bg-[#d6a84f]" />
              </div>

              <p className="mt-5 text-zinc-400">Expires in 18 days</p>
            </div>

            <button className="mt-6 w-full rounded-full bg-[#d6a84f] px-6 py-4 font-bold text-black">
              Buy More Minutes
            </button>
          </div>
        </div>
      </section>

      <section id="gallery" className="bg-[#050505] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.3em] text-[#d6a84f]">
            THE SALON
          </p>

          <h2 className="mb-12 text-4xl font-semibold md:text-6xl">
            Step inside Sun Temple.
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo[0]}
                className="group overflow-hidden rounded-3xl border border-[#d6a84f]/20 bg-[#111]"
              >
                <img
                  src={photo[0]}
                  alt={photo[1]}
                  className="h-80 w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-[#d6a84f]">
                    {photo[1]}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-[#0b0b0b] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.3em] text-[#d6a84f]">
            VISIT US
          </p>
          <h2 className="text-4xl font-semibold md:text-6xl">
            Sun Temple Gosport
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            Ultimate tanning salon experience in Gosport.
          </p>
        </div>
      </section>
    </main>
  );
}
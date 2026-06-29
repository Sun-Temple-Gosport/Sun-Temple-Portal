const gallery = [
  ["/reception.jpg", "Luxury reception"],
  ["/megasunbed.jpg", "MegaSun G800"],
  ["/standupbooth.jpg", "Stand-up booth"],
  ["/hero.jpg", "Sun Temple Gosport"],
  ["/featurewall.jpg", "Luxury interior"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#d6a84f]/20 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-lg font-semibold tracking-[0.3em] text-[#d6a84f]">
              SUN TEMPLE
            </p>
            <p className="text-xs tracking-[0.25em] text-zinc-400">
              GOSPORT
            </p>
          </div>

          <div className="hidden items-center gap-8 text-sm md:flex">
            <a href="#packages" className="hover:text-[#d6a84f]">Packages</a>
            <a href="#gallery" className="hover:text-[#d6a84f]">Gallery</a>
            <a href="#contact" className="hover:text-[#d6a84f]">Contact</a>

            <a
              href="/buy-minutes"
              className="rounded-full bg-[#d6a84f] px-6 py-3 font-semibold text-black transition hover:scale-105"
            >
              Buy Minutes
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="flex min-h-screen items-center bg-cover bg-center"
        style={{ backgroundImage: "url('/hero.jpg')" }}
      >
        <div className="w-full bg-black/60">
          <div className="mx-auto max-w-7xl px-6 py-40">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#d6a84f]">
              Sun Temple Gosport
            </p>

            <h1 className="mt-6 max-w-3xl text-6xl font-bold leading-tight md:text-8xl">
              Luxury tanning,
              <br />
              minutes made simple.
            </h1>

            <p className="mt-8 max-w-xl text-lg text-zinc-300">
              Buy tanning minutes online, check your balance and manage your account from your phone.
            </p>

            <div className="mt-10 flex gap-4">
              <a
                href="/buy-minutes"
                className="rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black transition hover:scale-105"
              >
                Buy Minutes
              </a>

              <a
                href="#gallery"
                className="rounded-full border border-[#d6a84f] px-8 py-4 hover:bg-[#d6a84f] hover:text-black"
              >
                View Gallery
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="mb-12 text-4xl font-bold">Our Salon</h2>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {gallery.map(([src, title]) => (
            <div
              key={src}
              className="overflow-hidden rounded-3xl border border-[#d6a84f]/20 bg-[#111]"
            >
              <img
                src={src}
                alt={title}
                className="h-80 w-full object-cover"
              />

              <div className="p-6">
                <h3 className="text-2xl font-semibold text-[#d6a84f]">
                  {title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="border-t border-[#d6a84f]/20 px-6 py-20 text-center"
      >
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Visit Us
        </p>

        <h2 className="text-4xl font-bold">
          Sun Temple Gosport
        </h2>

        <p className="mt-6 text-lg text-zinc-400">
          Ultimate tanning salon experience in Gosport.
        </p>
      </section>
    </main>
  );
}
export default function PaymentSuccess() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Payment received
        </p>

        <h1 className="mt-4 text-5xl font-bold">
          Thank you!
        </h1>

        <p className="mt-6 text-lg text-zinc-400">
          Your payment is being confirmed. Your tanning minutes will be added to your account shortly.
        </p>

        <a
          href="/buy-minutes"
          className="mt-10 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
        >
          Back to packages
        </a>
      </div>
    </main>
  );
}
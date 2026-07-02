interface Props {
  searchParams: Promise<{
    checkoutReference?: string;
  }>;
}

export default async function PaymentSuccess({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Payment Received
        </p>

        <h1 className="mt-4 text-5xl font-bold">
          Thank you
        </h1>

        <p className="mt-6 text-xl text-zinc-300">
          Your payment is being confirmed. Your minutes will appear in your account shortly.
        </p>

        <p className="mt-4 text-sm text-zinc-500">
          Reference: {params.checkoutReference || "Not available"}
        </p>

        <a
          href="/my-minutes"
          className="mt-10 inline-block rounded-full bg-[#d6a84f] px-8 py-4 font-bold text-black"
        >
          View My Minutes
        </a>
      </section>
    </main>
  );
}
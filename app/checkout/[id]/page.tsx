import CheckoutButton from "./CheckoutButton";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

const packages = [
  { id: 1, minutes: 30, price: 18 },
  { id: 2, minutes: 60, price: 34 },
  { id: 3, minutes: 90, price: 47 },
  { id: 4, minutes: 120, price: 55 },
  { id: 5, minutes: 240, price: 100 },
  { id: 6, minutes: 1, price: 1 },
];

export default async function Checkout({ params }: Props) {
  const { id } = await params;

  const pkg = packages.find((p) => p.id === Number(id));

  if (!pkg) {
    return <h1>Package not found</h1>;
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
      <div className="rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-12 w-[500px]">
        <h1 className="text-4xl font-bold">{pkg.minutes} Minutes</h1>

        <p className="mt-4 text-5xl font-bold text-[#d6a84f]">
          £{pkg.price}
        </p>

        <CheckoutButton
          amount={pkg.price}
          description={`${pkg.minutes} Minute Package`}
          packageId={pkg.id}
          minutes={pkg.minutes}
        />
        
      </div>
    </main>
  );
}
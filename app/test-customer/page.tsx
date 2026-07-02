import TestButton from "./TestButton";
import { supabase } from "@/lib/supabase";

export default async function TestCustomer() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .limit(5);

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-4xl font-bold text-[#d6a84f]">
        Supabase Test
      </h1>

      {error && <p className="mt-6 text-red-400">{error.message}</p>}

      <pre className="mt-6 rounded-xl bg-[#111] p-6">
        {JSON.stringify(data, null, 2)}
      </pre>
      <TestButton />
    </main>
  );
}
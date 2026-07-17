"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 async function login() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log({ data, error });

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "/my-minutes";


  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
      <section className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6a84f]">
          Sun Temple Gosport
        </p>

        <h1 className="mt-4 text-5xl font-bold">Customer Login</h1>

        <div className="mt-10 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

            <button
              onClick={login}
              className="w-full rounded-full bg-[#d6a84f] py-3 font-bold text-black hover:opacity-90"
            >
              Login
            </button>
            <div className="flex justify-end">
  <Link
    href="/forgot-password"
    className="text-sm font-medium text-[#d6a84f] hover:underline"
  >
    Forgot your password?
  </Link>
</div>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-400">
  New customer?{" "}
  <Link
    href="/register"
    className="font-semibold text-[#d6a84f] hover:underline"
  >
    Create an account
  </Link>
</p>
        </div>
      </section>
    </main>
  );
}
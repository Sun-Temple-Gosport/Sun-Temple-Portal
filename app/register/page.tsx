"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const [isOver18, setIsOver18] = useState(false);
const [loading, setLoading] = useState(false);
  


    async function register() {
  if (!fullName.trim() || !email.trim() || !password) {
    alert("Please enter your name, email address and password.");
    return;
  }

  if (!isOver18) {
    alert("You must confirm that you are aged 18 or over.");
    return;
  }

  setLoading(true);

  const cleanName = fullName.trim();
  const cleanPhone = phone.trim();
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: cleanName,
        phone: cleanPhone,
      },
    },
  });

  setLoading(false);

  if (error) {
    alert(error.message);
    return;
  }

  if (!data.user) {
    alert("Your account could not be created. Please try again.");
    return;
  }

  if (!data.session) {
    alert(
      "Account created. Please check your email to confirm your account before logging in."
    );
    window.location.href = "/login";
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

        <h1 className="mt-4 text-5xl font-bold">Create Account</h1>

        <div className="mt-10 rounded-3xl border border-[#d6a84f]/30 bg-[#111] p-8">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#111] px-4 py-3 text-white"
            />

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

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#2a2a2a] p-4 text-sm text-zinc-300">
  <input
    type="checkbox"
    checked={isOver18}
    onChange={(e) => setIsOver18(e.target.checked)}
    className="mt-1 h-4 w-4 accent-[#d6a84f]"
  />

  <span>I confirm that I am aged 18 or over.</span>
</label>

            <button
              type="button"
              onClick={register}
              disabled={loading}
              className="w-full rounded-full bg-[#d6a84f] py-3 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#d6a84f] hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
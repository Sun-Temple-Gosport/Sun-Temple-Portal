"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StaffLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginStaff() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      setMessage("Could not confirm user.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      setMessage(profileError.message);
      return;
    }

    const role = profile?.role?.toLowerCase();

    if (role !== "owner" && role !== "staff") {
      await supabase.auth.signOut();
      setMessage("This login is for staff only.");
      return;
    }

    router.push("/reception-v3");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-amber-400">
          Sun Temple Gosport
        </p>

        <h1 className="mb-8 text-5xl font-black">Staff Login</h1>

        <div className="rounded-3xl border border-amber-500/30 bg-slate-950 p-8 shadow-xl">
          <div className="space-y-4">
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-amber-400"
              placeholder="Staff email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-4 text-white outline-none focus:border-amber-400"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void loginStaff();
                }
              }}
            />

            <button
              type="button"
              onClick={loginStaff}
              disabled={loading}
              className="w-full rounded-full bg-amber-400 px-5 py-4 font-black text-black hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login to Reception"}
            </button>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-amber-400 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            {message && (
              <p className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
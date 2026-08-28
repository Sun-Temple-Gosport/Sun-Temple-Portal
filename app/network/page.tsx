"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type NetworkSalon = {
  salon_id: string;
  salon_name: string;
  tagline: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
};

export default function NetworkPage() {
  const [salons, setSalons] = useState<NetworkSalon[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSalons() {
      setLoading(true);

      const { data: networkProfiles, error: networkError } =
        await supabase
          .from("salon_network_profiles")
          .select("salon_id, city, postcode")
          .eq("listed", true);

      if (networkError) {
        console.error(
          "Could not load network salons:",
          networkError.message
        );
        setLoading(false);
        return;
      }

      const salonIds =
        networkProfiles?.map((profile) => profile.salon_id) ?? [];

      if (salonIds.length === 0) {
        setSalons([]);
        setLoading(false);
        return;
      }

      const { data: settings, error: settingsError } =
        await supabase
          .from("salon_settings")
          .select(
            "salon_id, salon_name, tagline, logo_url, address"
          )
          .in("salon_id", salonIds);

      if (settingsError) {
        console.error(
          "Could not load salon details:",
          settingsError.message
        );
        setLoading(false);
        return;
      }

      const combined: NetworkSalon[] =
        settings?.map((salon) => {
          const networkProfile = networkProfiles?.find(
            (profile) => profile.salon_id === salon.salon_id
          );

          return {
            salon_id: salon.salon_id,
            salon_name: salon.salon_name,
            tagline: salon.tagline,
            logo_url: salon.logo_url,
            address: salon.address,
            city: networkProfile?.city ?? null,
            postcode: networkProfile?.postcode ?? null,
          };
        }) ?? [];

      setSalons(combined);
      setLoading(false);
    }

    loadSalons();
  }, []);

  const filteredSalons = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return salons;
    }

    return salons.filter((salon) =>
      [
        salon.salon_name,
        salon.tagline,
        salon.address,
        salon.city,
        salon.postcode,
      ]
        .filter(Boolean)
        .some((value) =>
          value!.toLowerCase().includes(query)
        )
    );
  }, [salons, search]);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-slate-800 bg-[#020617]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              TanSalon
              <span className="text-amber-400">OS</span>
            </div>

            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
              Salon Management Software
            </div>
          </div>

          <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-300">
            Salon Network
          </div>
        </div>
      </header>

      <section className="border-b border-slate-800 bg-gradient-to-b from-[#020617] to-[#07111f]">
        <div className="mx-auto max-w-5xl px-6 py-12 text-center sm:py-16">
          <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-amber-400" />

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Find a Tanning Salon
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-slate-400">
            Find TanSalonOS salons, view their services and purchase
            tanning minutes before you arrive.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-black/20">
          <label className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
  Search salons
</label>

          <div className="relative mt-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Town, city, postcode or salon name"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-4 pl-12 pr-4 text-base font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10"
            />
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {loading && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center font-medium text-slate-400 shadow-xl">
              Loading salons...
            </div>
          )}

          {!loading && filteredSalons.length === 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center font-medium text-slate-400 shadow-xl">
              No salons found.
            </div>
          )}

          {!loading &&
            filteredSalons.map((salon) => (
              <article
                key={salon.salon_id}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20"
              >
                <div className="h-1.5 bg-amber-400" />

                <div className="p-6">
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-black">
                      {salon.logo_url ? (
                        <img
                          src={salon.logo_url}
                          alt={`${salon.salon_name} logo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-black text-amber-400">
                          TS
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                        TanSalonOS Salon
                      </div>

                      <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                        {salon.salon_name}
                      </h2>

                      {salon.tagline && (
                        <p className="mt-1 text-sm font-medium text-slate-400">
                          {salon.tagline}
                        </p>
                      )}
                    </div>
                  </div>

                  {(salon.city || salon.postcode) && (
                    <div className="mt-6 flex items-center gap-2 border-t border-slate-800 pt-5 text-sm font-bold text-slate-300">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-5 w-5 text-amber-400"
                        aria-hidden="true"
                      >
                        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                        <circle cx="12" cy="10" r="2" />
                      </svg>

                      <span>
                        {[salon.city, salon.postcode]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}
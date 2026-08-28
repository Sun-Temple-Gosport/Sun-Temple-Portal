"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type SalonDetails = {
  salon_id: string;
  salon_name: string;
  tagline: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
};

type SalonPackage = {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
};

export default function NetworkSalonPage() {
  const params = useParams();

  const salonId =
    typeof params.salonid === "string" ? params.salonid : "";

  const [salon, setSalon] = useState<SalonDetails | null>(null);
  const [packages, setPackages] = useState<SalonPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSalon() {
      if (!salonId) {
        setLoading(false);
        setError("Salon not found.");
        return;
      }

      setLoading(true);
      setError(null);

      const { data: networkProfile, error: networkError } =
        await supabase
          .from("salon_network_profiles")
          .select("salon_id, city, postcode")
          .eq("salon_id", salonId)
          .eq("listed", true)
          .maybeSingle();

      if (networkError) {
        console.error(
          "Could not load salon network profile:",
          networkError.message
        );
        setError("Could not load this salon.");
        setLoading(false);
        return;
      }

      if (!networkProfile) {
        setError("Salon not found.");
        setLoading(false);
        return;
      }

      const { data: settings, error: settingsError } =
        await supabase
          .from("salon_settings")
          .select(
            "salon_id, salon_name, tagline, logo_url, address"
          )
          .eq("salon_id", salonId)
          .maybeSingle();

      if (settingsError) {
        console.error(
          "Could not load salon settings:",
          settingsError.message
        );
        setError("Could not load this salon.");
        setLoading(false);
        return;
      }

      if (!settings) {
        setError("Salon not found.");
        setLoading(false);
        return;
      }

      const { data: packageData, error: packageError } =
        await supabase
          .from("packages")
          .select("id, name, minutes, price, expiry_days")
          .eq("salon_id", salonId)
          .eq("active", true)
          .order("minutes", { ascending: true });

      if (packageError) {
        console.error(
          "Could not load salon packages:",
          packageError.message
        );
      }

      setSalon({
        salon_id: settings.salon_id,
        salon_name: settings.salon_name,
        tagline: settings.tagline,
        logo_url: settings.logo_url,
        address: settings.address,
        city: networkProfile.city,
        postcode: networkProfile.postcode,
      });

      setPackages(packageData ?? []);
      setLoading(false);
    }

    loadSalon();
  }, [salonId]);

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
              Salon Network
            </div>
          </div>

          <a
            href="/network"
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:border-amber-400 hover:text-amber-300"
          >
            Back to salons
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        {loading && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center font-medium text-slate-400 shadow-2xl shadow-black/20">
            Loading salon...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl shadow-black/20">
            <div className="text-xl font-black text-white">
              {error}
            </div>

            <a
              href="/network"
              className="mt-6 inline-flex rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300"
            >
              Find a salon
            </a>
          </div>
        )}

        {!loading && salon && (
          <div className="space-y-6">
            <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
              <div className="h-1.5 bg-amber-400" />

              <div className="p-7 sm:p-9">
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-black">
                    {salon.logo_url ? (
                      <img
                        src={salon.logo_url}
                        alt={`${salon.salon_name} logo`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-amber-400">
                        TS
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                      TanSalonOS Salon
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-white">
                      {salon.salon_name}
                    </h1>

                    {salon.tagline && (
                      <p className="mt-2 font-medium text-slate-400">
                        {salon.tagline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-800 pt-7">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
                    Salon Details
                  </div>

                  <div className="mt-5 space-y-5">
                    {salon.address && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Address
                        </div>

                        <div className="mt-1 font-semibold text-slate-200">
                          {salon.address}
                        </div>
                      </div>
                    )}

                    {(salon.city || salon.postcode) && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Location
                        </div>

                        <div className="mt-1 font-semibold text-slate-200">
                          {[salon.city, salon.postcode]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-black/20 sm:p-9">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
                Tanning Packages
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                Buy tanning minutes
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
                Available tanning packages at {salon.salon_name}.
              </p>

              {packages.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5 text-sm font-medium text-slate-400">
                  No tanning packages are currently available.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {packages.map((salonPackage) => (
                    <div
                      key={salonPackage.id}
                      className="flex items-center justify-between gap-5 rounded-2xl border border-slate-700 bg-slate-950 p-5"
                    >
                      <div>
                        <div className="text-lg font-black text-white">
                          {salonPackage.name ||
                            `${salonPackage.minutes} Minutes`}
                        </div>

                        <div className="mt-1 text-sm font-medium text-slate-400">
                          {salonPackage.minutes} tanning minutes
                        </div>
                      </div>

                      <div className="shrink-0 text-xl font-black text-amber-400">
                        £{Number(salonPackage.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
                <div className="font-black text-white">
                  Online purchasing coming next
                </div>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
                  For now, this page shows the tanning packages
                  available at this salon.
                </p>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
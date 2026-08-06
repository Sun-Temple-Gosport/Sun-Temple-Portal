"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type SalonSettingsData = {
  id: number;
  salon_name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  address: string | null;
};

export default function SalonSettings() {
  const [settings, setSettings] = useState<SalonSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("salon_settings")
        .select(
          "id, salon_name, tagline, phone, email, website, facebook, instagram, address"
        )
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setSettings(data);
      setLoading(false);
    }

    void loadSettings();
  }, []);

  function updateSetting(
    field: keyof Omit<SalonSettingsData, "id">,
    value: string
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
  }

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("salon_settings")
      .update({
        salon_name: settings.salon_name.trim(),
        tagline: settings.tagline?.trim() || null,
        phone: settings.phone?.trim() || null,
        email: settings.email?.trim() || null,
        website: settings.website?.trim() || null,
        facebook: settings.facebook?.trim() || null,
        instagram: settings.instagram?.trim() || null,
        address: settings.address?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Salon settings saved.");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-300">
        Loading salon settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-red-900 bg-red-950/30 p-5 text-red-200">
        Salon settings could not be loaded.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
          Business Settings
        </p>

        <h3 className="mt-1 text-2xl font-black text-white">
          Salon Details
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Salon Name
          </span>

          <input
            value={settings.salon_name}
            onChange={(event) =>
              updateSetting("salon_name", event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Tagline
          </span>

          <input
            value={settings.tagline ?? ""}
            onChange={(event) =>
              updateSetting("tagline", event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Phone
          </span>

          <input
            value={settings.phone ?? ""}
            onChange={(event) =>
              updateSetting("phone", event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Email
          </span>

          <input
            type="email"
            value={settings.email ?? ""}
            onChange={(event) =>
              updateSetting("email", event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Website
          </span>

          <input
            value={settings.website ?? ""}
            onChange={(event) =>
              updateSetting("website", event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Facebook
          </span>

          <input
            value={settings.facebook ?? ""}
            onChange={(event) =>
              updateSetting("facebook", event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Instagram
          </span>

          <input
            value={settings.instagram ?? ""}
            onChange={(event) =>
              updateSetting("instagram", event.target.value)
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Address
          </span>

          <textarea
            value={settings.address ?? ""}
            onChange={(event) =>
              updateSetting("address", event.target.value)
            }
            rows={3}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-black hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Salon Details"}
        </button>

        {message && (
          <p className="text-sm font-semibold text-slate-300">{message}</p>
        )}
      </div>
    </div>
  );
}
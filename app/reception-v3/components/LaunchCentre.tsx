"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type OpeningHours = {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
};

type SalonSettings = {
  salon_name: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: OpeningHours | null;
};

type SetupItem = {
  label: string;
  complete: boolean;
};

type SetupSection = {
  title: string;
  description: string;
  items: SetupItem[];
};

const remainingSections: SetupSection[] = [
  
  {
    title: "Products",
    description: "Set up the packages and memberships you sell.",
    items: [
      { label: "Minute packages", complete: false },
      { label: "VIP membership", complete: false },
    ],
  },
  {
    title: "Staff & Equipment",
    description: "Prepare Reception for day-to-day trading.",
    items: [
      { label: "Invite staff", complete: false },
      { label: "Configure sunbeds", complete: false },
    ],
  },
  {
    title: "Payments",
    description: "Choose how your salon accepts online payments.",
    items: [
      { label: "Choose payment provider", complete: false },
      { label: "Connect payment provider", complete: false },
    ],
  },
  {
    title: "Website",
    description: "Review the customer website before sharing it.",
    items: [
      { label: "Review website", complete: false },
      { label: "Test customer registration", complete: false },
    ],
  },
  {
    title: "Launch",
    description: "Publish and share your salon website.",
    items: [
      { label: "Publish website", complete: false },
      { label: "Copy and share website link", complete: false },
    ],
  },
];

type Props = {
  onOpenBusinessSettings: () => void;
  onNavigate: (view: "staff" | "beds") => void;
};
export default function LaunchCentre({
  onOpenBusinessSettings,
  onNavigate,
}: Props) {
    const [salonSettings, setSalonSettings] =
  useState<SalonSettings | null>(null);
  

useEffect(() => {
  async function loadSalonSettings() {
    const { data, error } = await supabase
      .from("salon_settings")
      .select("salon_name, logo_url, address, phone, opening_hours")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "Could not load Launch Centre salon settings:",
        error.message
      );
      return;
    }

    setSalonSettings(data as SalonSettings | null);
  }

  void loadSalonSettings();
}, []);
  const openingHoursComplete =
  !!salonSettings?.opening_hours &&
  Object.values(salonSettings.opening_hours).every(
    (hours) => hours.trim().length > 0
  );

const businessDetailsSection: SetupSection = {
  title: "Business Details",
  description: "Add the essential information customers need.",
  items: [
    {
      label: "Salon name",
      complete: !!salonSettings?.salon_name?.trim(),
    },
    {
      label: "Logo",
      complete: !!salonSettings?.logo_url?.trim(),
    },
    {
      label: "Address",
      complete: !!salonSettings?.address?.trim(),
    },
    {
      label: "Phone number",
      complete: !!salonSettings?.phone?.trim(),
    },
    {
      label: "Opening hours",
      complete: openingHoursComplete,
    },
  ],
};

const sections: SetupSection[] = [
  businessDetailsSection,
  ...remainingSections,
];

const allItems = sections.flatMap((section) => section.items);
const completedItems = allItems.filter((item) => item.complete).length;
const progress = Math.round((completedItems / allItems.length) * 100);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">
          Launch Centre
        </p>

        <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">
          Let&apos;s get your salon ready.
        </h1>

        <p className="mt-4 max-w-2xl text-slate-300">
          Complete each section below, review your customer website, and share
          it when you are ready to start receiving registrations and online
          sales.
        </p>

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="font-bold text-white">Setup progress</p>
            <p className="font-black text-amber-400">{progress}% complete</p>
          </div>

          <div className="h-4 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-slate-400">
            {completedItems} of {allItems.length} setup items completed
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => {
          const sectionComplete = section.items.every((item) => item.complete);
          const completedCount = section.items.filter(
            (item) => item.complete
          ).length;

          return (
            <div
              key={section.title}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    {section.title}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    {section.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                    sectionComplete
                      ? "bg-emerald-400 text-black"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {sectionComplete
                    ? "Complete"
                    : `${completedCount}/${section.items.length}`}
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-200">
                      {item.label}
                    </span>

                    <span
                      className={
                        item.complete
                          ? "font-black text-emerald-400"
                          : "font-black text-slate-500"
                      }
                    >
                      {item.complete ? "✓" : "○"}
                    </span>
                  </div>
                ))}
              </div>

              <button
  type="button"
  onClick={() => {
    switch (section.title) {
      case "Business Details":
        onOpenBusinessSettings();
        break;
        case "Staff & Equipment":
  onNavigate("staff");
  break;

      case "Products":
        onOpenBusinessSettings();
        break;

      default:
        break;
    }
  }}
  className="mt-6 w-full rounded-xl border border-amber-400 px-5 py-3 font-black text-amber-400 transition hover:bg-amber-400 hover:text-black"
>
  {section.title === "Business Details"
  ? "Open Business Settings"
  : section.title === "Products"
  ? "Open Product Settings"
  : section.title === "Staff & Equipment"
  ? "Open Staff Management"
  : sectionComplete
  ? "Review"
  : "Continue Setup"}
</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
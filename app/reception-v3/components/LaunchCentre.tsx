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
  payment_provider: string | null;
  website: string | null;
  website_reviewed: boolean;
  registration_test_complete: boolean;
  website_published: boolean;
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
  description: "Take your salon live and start accepting customers online.",
  items: [
    { label: "Launch your salon", complete: false },
  ],
},
];

type Props = {
  onOpenBusinessSettings: () => void;
  onNavigate: (view: "staff" | "beds" | "payments") => void;
};
export default function LaunchCentre({
  onOpenBusinessSettings,
  onNavigate,
}: Props) {
    const [salonSettings, setSalonSettings] =
  useState<SalonSettings | null>(null);
  const [hasStaff, setHasStaff] = useState(false);
  const [bedsConfigured, setBedsConfigured] = useState(false);
  const [hasMinutePackages, setHasMinutePackages] = useState(false);
const [hasVipMembership, setHasVipMembership] = useState(false);
  

useEffect(() => {
  async function loadSalonSettings() {
    const { data, error } = await supabase
      .from("salon_settings")
      .select(
  "salon_name, logo_url, address, phone, opening_hours, payment_provider, website, website_reviewed, registration_test_complete, website_published"
)
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
useEffect(() => {
  async function loadStaffStatus() {
    const { data, error } = await supabase.rpc("list_staff_members");

    if (error) {
      console.error(
        "Could not load Launch Centre staff status:",
        error.message
      );
      return;
    }

    setHasStaff((data ?? []).length > 0);
  }

  void loadStaffStatus();
}, []);
useEffect(() => {
  async function loadBedStatus() {
    const { data, error } = await supabase
      .from("beds")
      .select("id");

    if (error) {
      console.error(
        "Could not load Launch Centre bed status:",
        error.message
      );
      return;
    }

    setBedsConfigured((data ?? []).length >= 4);
  }

  void loadBedStatus();
}, []);
useEffect(() => {
  async function loadProductStatus() {
    const { data: packageData, error: packageError } = await supabase
      .from("packages")
      .select("id, minutes, active")
      .eq("active", true);

    if (packageError) {
      console.error(
        "Could not load Launch Centre package status:",
        packageError.message
      );
      return;
    }

    setHasMinutePackages(
      (packageData ?? []).some((pkg) => Number(pkg.minutes) > 0)
    );

   const { data: vipData, error: vipError } = await supabase
  .from("vip_settings")
  .select("id")
  .limit(1);

    if (vipError) {
      console.error(
        "Could not load Launch Centre VIP status:",
        vipError.message
      );
      return;
    }

    setHasVipMembership((vipData ?? []).length > 0);
  }

  void loadProductStatus();
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

async function markRegistrationTestComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      registration_test_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error(
      "Could not save registration test:",
      error.message
    );
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          registration_test_complete: true,
        }
      : current
  );
}
const dynamicRemainingSections = remainingSections.map((section) => {
    if (section.title === "Products") {
  return {
    ...section,
    items: [
      {
        label: "Minute packages",
        complete: hasMinutePackages,
      },
      {
        label: "VIP membership",
        complete: hasVipMembership,
      },
    ],
  };
}
  if (section.title === "Staff & Equipment") {
  return {
    ...section,
    items: [
      {
        label: "Invite staff",
        complete: hasStaff,
      },
      {
  label: "Configure sunbeds",
  complete: bedsConfigured,
},
    ],
  };
}
    if (section.title === "Payments") {
    return {
      ...section,
      items: [
        {
          label: "Choose payment provider",
          complete: !!salonSettings?.payment_provider,
        },
        {
  label: "Connect payment provider",
  complete: salonSettings?.payment_provider === "manual",
},
      ],
    };
  }
  if (section.title === "Website") {
  return {
    ...section,
    items: [
      {
        label: "Review website",
        complete:
          !!salonSettings?.website?.trim() &&
          salonSettings.website_reviewed,
      },
      {
        label: "Test customer registration",
        complete: salonSettings?.registration_test_complete ?? false,
      },
    ],
  };
}

  return section;
});

const sections: SetupSection[] = [
  businessDetailsSection,
  ...dynamicRemainingSections,
];

const allItems = sections.flatMap((section) => section.items);
const completedItems = allItems.filter((item) => item.complete).length;
const progress = Math.round((completedItems / allItems.length) * 100);

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-400">
          Salon Setup
        </p>

        <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">
          Let's get your tanning salon ready for launch.
        </h1>

        <p className="mt-4 max-w-2xl text-slate-300">
          Complete each section below, review your customer website, and share
          it when you are ready to start receiving registrations and online
          sales.
        </p>
        <div className="mt-6">
  <a
    href="/"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center rounded-xl border border-amber-400 px-5 py-3 font-black text-amber-400 transition hover:bg-amber-400 hover:text-black"
  >
    View Website ↗
  </a>
</div>

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

              {section.title === "Staff & Equipment" ? (
  <div className="mt-6 space-y-3">
    <button
      type="button"
      onClick={() => onNavigate("staff")}
      className="w-full rounded-xl border border-amber-400 px-5 py-3 font-black text-amber-400 transition hover:bg-amber-400 hover:text-black"
    >
      Open Staff Management
    </button>

    <button
      type="button"
      onClick={() => onNavigate("beds")}
      className="w-full rounded-xl border border-amber-400 px-5 py-3 font-black text-amber-400 transition hover:bg-amber-400 hover:text-black"
    >
      Open Bed Management
    </button>
  </div>
) : section.title === "Website" ? (
  <div className="mt-6 space-y-3">
    <button
      type="button"
      onClick={() => window.open("/register", "_blank")}
      className="w-full rounded-xl border border-amber-400 px-5 py-3 font-black text-amber-400 transition hover:bg-amber-400 hover:text-black"
    >
      Open Registration Page
    </button>

    <button
      type="button"
      onClick={() => {
  void markRegistrationTestComplete();
}}
      className="w-full rounded-xl border border-emerald-400 px-5 py-3 font-black text-emerald-400 transition hover:bg-emerald-400 hover:text-black"
    >
      {salonSettings?.registration_test_complete
  ? "✓ Registration Test Complete"
  : "Mark Registration Test Complete"}
    </button>
  </div>
) : (
  <button
    type="button"
    onClick={() => {
      switch (section.title) {
        case "Business Details":
          onOpenBusinessSettings();
          break;

        case "Products":
          onOpenBusinessSettings();
          break;

        case "Payments":
          onNavigate("payments");
          return;

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
        : sectionComplete
          ? "Review"
          : "Continue Setup"}
  </button>
)}

            </div>
          );
        })}
      </div>
    </section>
  );
}
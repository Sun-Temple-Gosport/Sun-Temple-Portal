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
  opening_hours_review_complete: boolean;
  payment_provider: string | null;
  website: string | null;
  website_reviewed: boolean;
  website_review_complete: boolean;
  registration_test_complete: boolean;
  buy_minutes_test_complete: boolean;
  salon_photos_review_complete: boolean;
  login_test_complete: boolean;
  website_published: boolean;
  my_minutes_test_complete: boolean;
  contact_details_review_complete: boolean;
  hero_image_url: string | null;
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
  title: "Customer Portal",
  description: "Test the customer account experience before launch.",
  items: [
    {
  label: "Test customer registration",
  complete: false, },
    { label: "Test customer login", complete: false },
    { label: "Test buying minutes", complete: false },
    { label: "Test My Minutes", complete: false },
  ],
},
  
 {
  title: "Website",
  description: "Review your public website before launch.",
  items: [
    { label: "Review website", complete: false },
    { label: "Check contact details", complete: false },
    { label: "Check opening hours", complete: false },
    { label: "Check salon photos", complete: false },
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
const [hasSalonPhotos, setHasSalonPhotos] = useState(false);
  

useEffect(() => {
  async function loadSalonSettings() {
    const { data, error } = await supabase
      .from("salon_settings")
      .select(
  "salon_name, logo_url, hero_image_url, address, phone, opening_hours, payment_provider, website, website_reviewed, registration_test_complete, login_test_complete, website_published, buy_minutes_test_complete, my_minutes_test_complete, website_review_complete, contact_details_review_complete, contact_details_review_complete, opening_hours_review_complete, salon_photos_review_complete"
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
  async function loadSalonPhotos() {
    const { count, error } = await supabase
      .from("salon_images")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Could not load salon photos:", error.message);
      return;
    }

    setHasSalonPhotos((count ?? 0) > 0);
  }

  void loadSalonPhotos();
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
  label: "Cover photo",
  complete: !!salonSettings?.hero_image_url?.trim(),
},
{
  label: "Salon photos",
  complete: hasSalonPhotos,
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
async function markLoginTestComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      login_test_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error("Could not mark login test complete:", error.message);
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          login_test_complete: true,
        }
      : current
  );
}
async function markBuyMinutesTestComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      buy_minutes_test_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error("Could not mark buy minutes test complete:", error.message);
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          buy_minutes_test_complete: true,
        }
      : current
  );
}
async function markMyMinutesTestComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      my_minutes_test_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error("Could not mark My Minutes test complete:", error.message);
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          my_minutes_test_complete: true,
        }
      : current
  );
}
async function markWebsiteReviewComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      website_review_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error("Could not mark website review complete:", error.message);
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          website_review_complete: true,
        }
      : current
  );
}
async function markContactDetailsReviewComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      contact_details_review_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error(
      "Could not mark contact details review complete:",
      error.message
    );
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          contact_details_review_complete: true,
        }
      : current
  );
}
async function markOpeningHoursReviewComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      opening_hours_review_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error(
      "Could not mark opening hours review complete:",
      error.message
    );
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          opening_hours_review_complete: true,
        }
      : current
  );
}
async function markSalonPhotosReviewComplete() {
  const { error } = await supabase
    .from("salon_settings")
    .update({
      salon_photos_review_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error(
      "Could not mark salon photos review complete:",
      error.message
    );
    return;
  }

  setSalonSettings((current) =>
    current
      ? {
          ...current,
          salon_photos_review_complete: true,
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
  if (section.title === "Customer Portal") {
    return {
      ...section,
      items: [
        {
          label: "Test customer registration",
          complete: !!salonSettings?.registration_test_complete,
        },
        {
  label: "Test customer login",
  complete: !!salonSettings?.login_test_complete,
},
        {
  label: "Test buying minutes",
  complete: salonSettings?.buy_minutes_test_complete ?? false,
},
        {
  label: "Test My Minutes",
  complete: salonSettings?.my_minutes_test_complete ?? false,
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
        complete: salonSettings?.website_review_complete ?? false,
      },
      {
  label: "Check contact details",
  complete: salonSettings?.contact_details_review_complete ?? false,
},

      {
  label: "Check opening hours",
  complete: salonSettings?.opening_hours_review_complete ?? false,
},
      {
  label: "Check salon photos",
  complete: salonSettings?.salon_photos_review_complete ?? false,
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
    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"
  >
    <span className="font-semibold text-slate-200">
      {item.label}
    </span>

    <div className="flex items-center gap-2">
      {section.title === "Customer Portal" &&
        item.label === "Test customer registration" && (
          <button
            type="button"
            onClick={() => window.open("/register", "_blank")}
            className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-black text-amber-400 hover:bg-amber-400 hover:text-black"
          >
            Open
          </button>
        )}
        {section.title === "Customer Portal" &&
  item.label === "Test buying minutes" &&
  !item.complete && (
    <button
      type="button"
      onClick={() => void markBuyMinutesTestComplete()}
      className="rounded-lg border border-emerald-400 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-400/10"
    >
      Complete
    </button>
  )}
  {section.title === "Customer Portal" &&
  item.label === "Test My Minutes" && (
    <button
      type="button"
      onClick={() => window.open("/my-minutes", "_blank")}
      className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-black text-amber-400 hover:bg-amber-400 hover:text-black"
    >
      Open
    </button>
  )}

{section.title === "Customer Portal" &&
  item.label === "Test My Minutes" &&
  !item.complete && (
    <button
      type="button"
      onClick={() => void markMyMinutesTestComplete()}
      className="rounded-lg border border-emerald-400 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-400/10"
    >
      Complete
    </button>
  )}

      {section.title === "Customer Portal" &&
        item.label === "Test customer login" && (
            
          <button
            type="button"
            onClick={() => window.open("/login", "_blank")}
            className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-black text-amber-400 hover:bg-amber-400 hover:text-black"
          >
            Open
          </button>
        )}
        {section.title === "Website" &&
  item.label === "Review website" && (
    <button
      type="button"
      onClick={() => window.open("/", "_blank")}
      className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-black text-amber-400 hover:bg-amber-400 hover:text-black"
    >
      Open
    </button>
  )}

{section.title === "Website" &&
  item.label === "Review website" &&
  !item.complete && (
    <button
      type="button"
      onClick={() => void markWebsiteReviewComplete()}
      className="rounded-lg border border-emerald-400 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-400/10"
    >
      Complete
    </button>
  )}
  


  

{section.title === "Website" &&
  item.label === "Check opening hours" &&
  !item.complete && (
    <button
      type="button"
      onClick={() => void markOpeningHoursReviewComplete()}
      className="rounded-lg border border-emerald-400 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-400/10"
    >
      Complete
    </button>
  )}
  {section.title === "Website" &&
  item.label === "Check salon photos" &&
  !item.complete && (
    <button
      type="button"
      onClick={() => void markSalonPhotosReviewComplete()}
      className="rounded-lg border border-emerald-400 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-400/10"
    >
      Complete
    </button>
  )}

      {section.title === "Customer Portal" &&
        item.label === "Test customer login" &&
        !item.complete && (
          <button
            type="button"
            onClick={() => void markLoginTestComplete()}
            className="rounded-lg border border-emerald-400 px-3 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-400/10"
          >
            Complete
          </button>
        )}
{section.title === "Customer Portal" &&
  item.label === "Test buying minutes" && (
    <button
      type="button"
      onClick={() => window.open("/buy-minutes", "_blank")}
      className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-black text-amber-400 hover:bg-amber-400 hover:text-black"
    >
      Open
    </button>
  )}
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
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
  logo_url: string | null;
  hero_image_url: string | null;
  opening_hours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  } | null;
  
};

type SalonImage = {
  id: number;
  image_url: string;
  sort_order: number;
};

export default function SalonSettings() {
  const [settings, setSettings] = useState<SalonSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [salonImages, setSalonImages] = useState<SalonImage[]>([]);
  const [draggedImageId, setDraggedImageId] = useState<number | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("salon_settings")
        .select(
          "id, salon_name, tagline, phone, email, website, facebook, instagram, address, logo_url, hero_image_url, opening_hours"
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

  useEffect(() => {
    async function loadSalonImages() {
      const { data, error } = await supabase
        .from("salon_images")
        .select("id, image_url, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Could not load salon photos:", error.message);
        return;
      }

      setSalonImages((data ?? []) as SalonImage[]);
    }

    void loadSalonImages();
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

  async function uploadLogo(file: File) {
    if (!settings) return;

    setUploadingLogo(true);
    setMessage("");

    const extension = file.name.split(".").pop();
    const fileName = `salon-logo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      setUploadingLogo(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(fileName);

    setSettings({
      ...settings,
      logo_url: publicUrl,
    });

    setUploadingLogo(false);
  }

  async function uploadCoverPhoto(file: File) {
    if (!settings) return;

    setMessage("");

    const extension = file.name.split(".").pop();
    const fileName = `cover-photo-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(fileName);

    setSettings({
      ...settings,
      hero_image_url: publicUrl,
    });
  }

  async function uploadSalonPhotos(files: FileList) {
    if (!files.length) return;

    setMessage("");

    const newImages: SalonImage[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const extension = file.name.split(".").pop();
      const fileName = `salon-photo-${Date.now()}-${index}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          upsert: true,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("logos").getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("salon_images")
        .insert({
          image_url: publicUrl,
          sort_order: salonImages.length + newImages.length,
        })
        .select("id, image_url, sort_order")
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      newImages.push(data as SalonImage);
    }

    setSalonImages((current) => [...current, ...newImages]);
    setMessage("Salon photos added.");
  }

  async function replaceSalonPhoto(image: SalonImage, file: File) {
  setMessage("");

  const extension = file.name.split(".").pop();
  const fileName = `salon-photo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(fileName, file, {
      upsert: true,
    });

  if (uploadError) {
    setMessage(uploadError.message);
    return;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(fileName);

  const { error } = await supabase
    .from("salon_images")
    .update({
      image_url: publicUrl,
    })
    .eq("id", image.id);

  if (error) {
    setMessage(error.message);
    return;
  }

  setSalonImages((current) =>
    current.map((item) =>
      item.id === image.id
        ? {
            ...item,
            image_url: publicUrl,
          }
        : item
    )
  );

  setMessage("Photo replaced.");
}

async function deleteSalonPhoto(imageId: number) {
  setMessage("");

  const { error } = await supabase
    .from("salon_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    setMessage(error.message);
    return;
  }

  setSalonImages((current) =>
    current.filter((image) => image.id !== imageId)
  );

  setMessage("Photo deleted.");
}
async function reorderSalonPhotos(
  draggedId: number,
  targetId: number
) {
  if (draggedId === targetId) return;

  const currentImages = [...salonImages];

  const draggedIndex = currentImages.findIndex(
    (image) => image.id === draggedId
  );

  const targetIndex = currentImages.findIndex(
    (image) => image.id === targetId
  );

  if (draggedIndex === -1 || targetIndex === -1) return;

  const [draggedImage] = currentImages.splice(draggedIndex, 1);

  currentImages.splice(targetIndex, 0, draggedImage);

  const reorderedImages = currentImages.map((image, index) => ({
    ...image,
    sort_order: index,
  }));

  setSalonImages(reorderedImages);

  const updates = reorderedImages.map((image) =>
    supabase
      .from("salon_images")
      .update({
        sort_order: image.sort_order,
      })
      .eq("id", image.id)
  );

  const results = await Promise.all(updates);

  const failedUpdate = results.find((result) => result.error);

  if (failedUpdate?.error) {
    setMessage(failedUpdate.error.message);
    return;
  }

  setMessage("Photo order updated.");
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
        logo_url: settings.logo_url?.trim() || null,
        hero_image_url: settings.hero_image_url?.trim() || null,
        opening_hours: settings.opening_hours,
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
      <div className="mb-6">
        
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
          SALON SETUP
        </p>

        <h3 className="mt-1 text-2xl font-black text-white">
          Business Details
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Tell your customers who you are and how they can contact you.
        </p>
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
            onChange={(event) => updateSetting("tagline", event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Phone
          </span>
          <input
            value={settings.phone ?? ""}
            onChange={(event) => updateSetting("phone", event.target.value)}
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
            onChange={(event) => updateSetting("email", event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Address
          </span>
          <textarea
            value={settings.address ?? ""}
            onChange={(event) => updateSetting("address", event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <div className="mt-5 md:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            WEBSITE & SOCIALS
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            Online Presence
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Add your website and social media links.
          </p>
        </div>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Website
          </span>
          <input
            value={settings.website ?? ""}
            onChange={(event) => updateSetting("website", event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Facebook
          </span>
          <input
            value={settings.facebook ?? ""}
            onChange={(event) => updateSetting("facebook", event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            Instagram
          </span>
          <input
            value={settings.instagram ?? ""}
            onChange={(event) => updateSetting("instagram", event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
          />
        </label>

        <div className="mt-5 space-y-4 md:col-span-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
              OPENING HOURS
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Set the opening hours shown on your customer website.
            </p>
          </div>

          {[
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ].map((day) => (
            <div
              key={day}
              className="grid grid-cols-[120px_1fr] items-center gap-3"
            >
              <label className="font-semibold capitalize text-slate-300">
                {day}
              </label>

              <input
                value={
                  settings.opening_hours?.[
                    day as keyof NonNullable<
                      SalonSettingsData["opening_hours"]
                    >
                  ] ?? ""
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    opening_hours: {
                      ...(settings.opening_hours ?? {
                        monday: "",
                        tuesday: "",
                        wednesday: "",
                        thursday: "",
                        friday: "",
                        saturday: "",
                        sunday: "",
                      }),
                      [day]: event.target.value,
                    },
                  })
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 md:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">
            WEBSITE IMAGES
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            Branding & Photos
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Upload your logo and photos to personalise your customer website.
          </p>
        </div>

        <div className="space-y-3 md:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            LOGO
          </span>

          {settings.logo_url?.trim() && (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 p-6">
              <img
                src={settings.logo_url}
                alt={`${settings.salon_name} logo preview`}
                className="max-h-48 w-auto rounded-xl object-contain"
              />
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center rounded-xl bg-amber-400 px-5 py-3 font-black text-black hover:bg-amber-300">
            {uploadingLogo
              ? "Uploading..."
              : settings.logo_url?.trim()
                ? "Change Logo"
                : "Choose Logo"}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploadingLogo}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void uploadLogo(file);
                }

                event.target.value = "";
              }}
              className="hidden"
            />
          </label>

          <p className="text-sm text-slate-400">PNG, JPG or WebP.</p>
        </div>

        <div className="space-y-3 md:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">
            COVER PHOTO
          </span>

          {settings.hero_image_url?.trim() && (
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              <img
                src={settings.hero_image_url}
                alt={`${settings.salon_name} cover`}
                className="h-64 w-full object-cover"
              />
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center rounded-xl bg-amber-400 px-5 py-3 font-black text-black hover:bg-amber-300">
            {settings.hero_image_url?.trim()
              ? "Change Cover Photo"
              : "Choose Cover Photo"}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void uploadCoverPhoto(file);
                }

                event.target.value = "";
              }}
              className="hidden"
            />
          </label>

          <p className="text-sm text-slate-400">
            This is the large photo shown at the top of your customer website.
          </p>
        </div>

        <div className="space-y-4 md:col-span-2">
          <div>
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">
              SALON PHOTOS
            </span>
            <p className="mt-2 text-sm text-slate-400">
              Add photos of your salon. These will automatically appear
              throughout your customer website.
            </p>
          </div>

          {salonImages.length > 0 && (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {salonImages.map((image) => (
  <div
    key={image.id}
    draggable
    onDragStart={() => setDraggedImageId(image.id)}
    onDragOver={(event) => event.preventDefault()}
    onDrop={() => {
      if (draggedImageId !== null) {
        void reorderSalonPhotos(draggedImageId, image.id);
      }

      setDraggedImageId(null);
    }}
    onDragEnd={() => setDraggedImageId(null)}
    className={`cursor-move overflow-hidden rounded-2xl border bg-slate-900 transition ${
      draggedImageId === image.id
        ? "border-amber-400 opacity-50"
        : "border-slate-700"
    }`}
  >
        <img
          src={image.image_url}
          alt="Salon photo"
          className="h-52 w-full object-cover"
        />

        <div className="flex gap-2 p-3">
          <label className="flex-1 cursor-pointer rounded-lg bg-amber-400 px-3 py-2 text-center text-sm font-black text-black hover:bg-amber-300">
            Replace
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void replaceSalonPhoto(image, file);
                }

                event.target.value = "";
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => void deleteSalonPhoto(image.id)}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
)}

          <label className="inline-flex cursor-pointer items-center rounded-xl bg-amber-400 px-5 py-3 font-black text-black hover:bg-amber-300">
            + Add Photos

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => {
                const files = event.target.files;

                if (files?.length) {
                  void uploadSalonPhotos(files);
                }

                event.target.value = "";
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
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
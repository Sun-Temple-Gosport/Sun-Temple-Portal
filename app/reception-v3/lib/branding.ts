import { supabase } from "./supabase";

export type SalonBranding = {
  salonName: string;
  tagline: string;
  logoUrl: string | null;
  phone: string;
  email: string;
  website: string;
  address: string;
};

const defaultBranding: SalonBranding = {
  salonName: "Your Salon",
  tagline: "",
  logoUrl: null,
  phone: "",
  email: "",
  website: "",
  address: "",
};

export async function getSalonBranding(): Promise<SalonBranding> {
  const { data, error } = await supabase
    .from("salon_settings")
    .select(
      "salon_name, tagline, logo_url, phone, email, website, address"
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Could not load salon branding:", error.message);
    return defaultBranding;
  }

  if (!data) {
    return defaultBranding;
  }

  return {
    salonName: data.salon_name?.trim() || defaultBranding.salonName,
    tagline: data.tagline?.trim() || "",
    logoUrl: data.logo_url?.trim() || null,
    phone: data.phone?.trim() || "",
    email: data.email?.trim() || "",
    website: data.website?.trim() || "",
    address: data.address?.trim() || "",
  };
}
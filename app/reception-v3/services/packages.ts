import { supabase } from "../lib/supabase";

export async function loadPackages() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: userError ?? new Error("User is not logged in."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    return {
      data: null,
      error:
        profileError ??
        new Error("Could not determine the current salon."),
    };
  }

  return await supabase
    .from("packages")
    .select("id, name, minutes, price, expiry_days, active")
    .eq("salon_id", profile.salon_id)
    .order("minutes", { ascending: true });
}

export async function savePackage(updatedPackage: {
  id: number;
  name: string | null;
  minutes: number;
  price: number;
  expiry_days: number | null;
  active: boolean;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: userError ?? new Error("User is not logged in."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    return {
      data: null,
      error:
        profileError ??
        new Error("Could not determine the current salon."),
    };
  }

  return await supabase
    .from("packages")
    .update({
      name: updatedPackage.name,
      minutes: updatedPackage.minutes,
      price: updatedPackage.price,
      expiry_days: updatedPackage.expiry_days,
      active: updatedPackage.active,
    })
    .eq("id", updatedPackage.id)
    .eq("salon_id", profile.salon_id);
}
export async function createPackageService(newPackage: {
  name: string;
  minutes: number;
  price: number;
  expiry_days: number;
  active: boolean;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: userError ?? new Error("User is not logged in."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    return {
      data: null,
      error: profileError ?? new Error("Could not determine the current salon."),
    };
  }

  return await supabase
    .from("packages")
    .insert({
      salon_id: profile.salon_id,
      name: newPackage.name,
      minutes: newPackage.minutes,
      price: newPackage.price,
      expiry_days: newPackage.expiry_days,
      active: newPackage.active,
    });
}
export async function deletePackageService(id: number) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: userError ?? new Error("User is not logged in."),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("salon_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.salon_id) {
    return {
      data: null,
      error:
        profileError ??
        new Error("Could not determine the current salon."),
    };
  }

  return await supabase
    .from("packages")
    .delete()
    .eq("id", id)
    .eq("salon_id", profile.salon_id);
}
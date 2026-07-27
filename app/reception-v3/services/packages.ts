import { supabase } from "../lib/supabase";

export async function loadPackages() {
  return await supabase
    .from("packages")
    .select("id, name, minutes, price, expiry_days, active")
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
  return await supabase
    .from("packages")
    .update({
      name: updatedPackage.name,
      minutes: updatedPackage.minutes,
      price: updatedPackage.price,
      expiry_days: updatedPackage.expiry_days,
      active: updatedPackage.active,
    })
    .eq("id", updatedPackage.id);
}
export async function createPackageService(newPackage: {
  name: string;
  minutes: number;
  price: number;
  expiry_days: number;
  active: boolean;
}) {
  return await supabase
    .from("packages")
    .insert({
      name: newPackage.name,
      minutes: newPackage.minutes,
      price: newPackage.price,
      expiry_days: newPackage.expiry_days,
      active: newPackage.active,
    });
}
export async function deletePackageService(id: number) {
  return await supabase
    .from("packages")
    .delete()
    .eq("id", id);
}
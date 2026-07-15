import { supabase } from "../lib/supabase";

export async function loadPackages() {
  return await supabase
    .from("packages")
    .select("id, name, minutes, price, expiry_days, active")
    .order("minutes", { ascending: true });
}

export async function savePackage(updatedPackage: {
  id: number;
  price: number;
  expiry_days: number | null;
  active: boolean;
}) {
  return await supabase
    .from("packages")
    .update({
      price: updatedPackage.price,
      expiry_days: updatedPackage.expiry_days,
      active: updatedPackage.active,
    })
    .eq("id", updatedPackage.id);
}
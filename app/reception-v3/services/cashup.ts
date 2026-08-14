import { supabase } from "../lib/supabase";

export type CashUpData = {
  businessDate: string;
  revenue: number;
  cardRevenue: number;
  cashRevenue: number;
  complimentaryRevenue: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  packagesSold: number;
  minutesSold: number;
  customersToday: number;
  sessionsToday: number;
};

export async function saveCashUp(
  cashUp: CashUpData,
  userId: string | null
) {
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
        profileError ?? new Error("Could not determine the current salon."),
    };
  }

  return await supabase.from("cash_ups").upsert(
    {
      salon_id: profile.salon_id,
      business_date: cashUp.businessDate,
      revenue: cashUp.revenue,
      card_revenue: cashUp.cardRevenue,
      cash_revenue: cashUp.cashRevenue,
      complimentary_revenue: cashUp.complimentaryRevenue,
      expected_cash: cashUp.expectedCash,
      counted_cash: cashUp.countedCash,
      difference: cashUp.difference,
      packages_sold: cashUp.packagesSold,
      minutes_sold: cashUp.minutesSold,
      customers_today: cashUp.customersToday,
      sessions_today: cashUp.sessionsToday,
      closed_by: userId,
      closed_at: new Date().toISOString(),
    },
    {
      onConflict: "salon_id,business_date",
    }
  );
}
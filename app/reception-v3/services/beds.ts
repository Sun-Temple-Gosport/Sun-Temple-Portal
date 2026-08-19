import { supabase } from "../lib/supabase";

export async function loadCustomerBedSessions(customerId: string) {
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
    .from("bed_sessions")
    .select("*")
    .eq("salon_id", profile.salon_id)
    .eq("customer_id", customerId)
    .order("started_at", { ascending: false });
}
export async function loadSessionsToday(startOfToday: string) {
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
    .from("bed_sessions")
    .select("id")
    .eq("salon_id", profile.salon_id)
    .gte("started_at", startOfToday);
}
export async function finishBedSession(sessionId: string) {
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
    .from("bed_sessions")
    .update({ status: "finished" })
    .eq("id", sessionId)
    .eq("salon_id", profile.salon_id);
}
export async function startBedSession(
  customerId: string,
  customerName: string,
  bedName: string,
  minutes: number,
  startedAt: string,
  endsAt: string
) {
  return await supabase.rpc("start_bed_session", {
    p_customer_id: customerId,
    p_bed_name: bedName,
    p_minutes: minutes,
  });
}

export async function startPaygBedSession(
  bedName: string,
  minutes: number,
  amount: number,
  paymentMethod: "cash" | "card"
) {
  return await supabase.rpc(
    "start_payg_bed_session",
    {
      p_bed_name: bedName,
      p_minutes: minutes,
      p_amount: amount,
      p_payment_method: paymentMethod,
    }
  );
}

export async function loadCustomersToday(startOfToday: string) {
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
    .from("bed_sessions")
    .select("customer_id")
    .eq("salon_id", profile.salon_id)
    .gte("started_at", startOfToday);
}
export async function loadActiveSessions() {
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
    .from("bed_sessions")
    .select("*")
    .eq("salon_id", profile.salon_id)
    .eq("status", "occupied")
    .order("started_at", { ascending: false });
}
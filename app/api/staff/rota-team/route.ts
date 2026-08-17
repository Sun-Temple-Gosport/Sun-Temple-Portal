import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
const requestedWeekStart = url.searchParams.get("weekStart");
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "");

    const authenticatedClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authenticatedClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Your login session is invalid." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, salon_id")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role?.toLowerCase();

    if (
      profileError ||
      !profile?.salon_id ||
      (role !== "owner" && role !== "staff")
    ) {
      return NextResponse.json(
        { error: "Staff access required." },
        { status: 403 }
      );
    }
const { data: team, error: teamError } = await admin
  .from("profiles")
  .select("id, full_name, email, role")
  .eq("salon_id", profile.salon_id)
  .in("role", ["owner", "staff"])
  .order("full_name");

if (teamError) {
  return NextResponse.json(
    { error: teamError.message },
    { status: 500 }
  );
}

const weekStart = requestedWeekStart
  ? new Date(`${requestedWeekStart}T12:00:00`)
  : (() => {
      const today = new Date();
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;

      const start = new Date(today);
      start.setDate(today.getDate() + diff);
      start.setHours(12, 0, 0, 0);

      return start;
    })();

const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);

const startDate = `${weekStart.getFullYear()}-${String(
  weekStart.getMonth() + 1
).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;

const endDate = `${weekEnd.getFullYear()}-${String(
  weekEnd.getMonth() + 1
).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;

const { data: rotaEntries, error: rotaError } = await admin
  .from("staff_rota_entries")
  .select(
    "id, staff_id, rota_date, entry_type, start_time, end_time"
  )
  .eq("salon_id", profile.salon_id)
  .gte("rota_date", startDate)
  .lte("rota_date", endDate)
  .order("rota_date", { ascending: true });

if (rotaError) {
  return NextResponse.json(
    { error: rotaError.message },
    { status: 500 }
  );
}

const { data: rotaPatterns, error: patternError } = await admin
  .from("staff_rota_patterns")
  .select(
    "id, staff_id, day_of_week, entry_type, start_time, end_time, starts_on, ends_on, active"
  )
  .eq("salon_id", profile.salon_id)
  .eq("active", true)
  .lte("starts_on", endDate)
  .or(`ends_on.is.null,ends_on.gte.${startDate}`)
  .order("day_of_week", { ascending: true });

if (patternError) {
  return NextResponse.json(
    { error: patternError.message },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  staff: team ?? [],
  rotaEntries: rotaEntries ?? [],
  rotaPatterns: rotaPatterns ?? [],
  weekStart: startDate,
  weekEnd: endDate,
});
  } catch (error) {
    console.error("Rota team error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
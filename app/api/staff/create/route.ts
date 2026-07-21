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

export async function POST(request: Request) {
  try {
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

    const { data: ownerProfile, error: ownerError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (
      ownerError ||
      ownerProfile?.role?.toLowerCase() !== "owner"
    ) {
      return NextResponse.json(
        { error: "Owner access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!fullName || !email) {
      return NextResponse.json(
        { error: "Full name and email are required." },
        { status: 400 }
      );
    }

   const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3001");

const { data, error } =
  await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      role: "staff",
    },
    redirectTo: `${siteUrl}/staff-setup`,
  });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Could not create staff member." },
        { status: 400 }
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role: "staff",
      })
      .eq("id", data.user.id);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { error: customerError } = await admin
      .from("customers")
      .update({
        full_name: fullName,
        email,
      })
      .eq("customer_id", data.user.id);

    if (customerError) {
      return NextResponse.json(
        { error: customerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Staff invitation sent successfully.",
    });
  } catch (error) {
    console.error("Create staff error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
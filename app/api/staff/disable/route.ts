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

    const staffId =
      typeof body.staffId === "string"
        ? body.staffId.trim()
        : "";

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff member ID is required." },
        { status: 400 }
      );
    }

    if (staffId === user.id) {
      return NextResponse.json(
        { error: "You cannot disable your own account." },
        { status: 400 }
      );
    }

    const { data: staffProfile, error: staffProfileError } =
      await admin
        .from("profiles")
        .select("role")
        .eq("id", staffId)
        .maybeSingle();

    if (staffProfileError || !staffProfile) {
      return NextResponse.json(
        { error: "Staff member could not be found." },
        { status: 404 }
      );
    }

    if (staffProfile.role?.toLowerCase() !== "staff") {
      return NextResponse.json(
        { error: "Only staff accounts can be disabled." },
        { status: 400 }
      );
    }

    const { error: disableError } =
      await admin.auth.admin.updateUserById(staffId, {
        ban_duration: "876600h",
      });

    if (disableError) {
      return NextResponse.json(
        { error: disableError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Staff account disabled successfully.",
    });
  } catch (error) {
    console.error("Disable staff error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
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

    const { data: staffProfiles, error: staffError } = await admin
  .from("profiles")
  .select("id, full_name, email, role")
  .ilike("role", "staff")
  .order("full_name");

    if (staffError) {
      return NextResponse.json(
        { error: staffError.message },
        { status: 500 }
      );
    }

    const authUsers = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      authUsers.push(...data.users);

      if (data.users.length < perPage) {
        break;
      }

      page += 1;
    }

    const authUserMap = new Map(
      authUsers.map((authUser) => [authUser.id, authUser])
    );

    const staff = (staffProfiles ?? []).map((profile) => {
      const authUser = authUserMap.get(profile.id);

      const bannedUntil = authUser?.banned_until
        ? new Date(authUser.banned_until)
        : null;

      const disabled =
        bannedUntil !== null && bannedUntil.getTime() > Date.now();

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        disabled,
      };
    });

    return NextResponse.json({
      success: true,
      staff,
    });
  } catch (error) {
    console.error("List staff error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
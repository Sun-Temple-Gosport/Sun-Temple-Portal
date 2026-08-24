import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function createSalonSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization?.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "");

    const authenticatedClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
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
    } =
      await authenticatedClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Your login session is invalid.",
        },
        { status: 401 }
      );
    }

    const {
      data: platformAdmin,
      error: platformAdminError,
    } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      platformAdminError ||
      !platformAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "Platform administrator access required.",
        },
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
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const salonName =
      typeof body.salonName === "string"
        ? body.salonName.trim()
        : "";

    const requestedSalonSlug =
      typeof body.salonSlug === "string"
        ? body.salonSlug
            .trim()
            .toLowerCase()
        : "";

    const salonSlug =
      requestedSalonSlug ||
      createSalonSlug(salonName);

    if (
      !fullName ||
      !email ||
      !salonSlug
    ) {
      return NextResponse.json(
        {
          error:
            "Owner name, email and salon details are required.",
        },
        { status: 400 }
      );
    }

    const {
      data: existingSalon,
      error: salonLookupError,
    } = await admin
      .from("salons")
      .select(
        "id, name, slug, active"
      )
      .eq("slug", salonSlug)
      .maybeSingle();

    if (salonLookupError) {
      return NextResponse.json(
        {
          error:
            salonLookupError.message,
        },
        { status: 500 }
      );
    }

    let salon = existingSalon;

    if (salon) {
      if (!salon.active) {
        return NextResponse.json(
          {
            error:
              "This salon is inactive.",
          },
          { status: 400 }
        );
      }
    } else {
      if (!salonName) {
        return NextResponse.json(
          {
            error:
              "Salon name is required to create a new salon.",
          },
          { status: 400 }
        );
      }

      const {
        data: createdSalon,
        error: createSalonError,
      } = await admin
        .from("salons")
        .insert({
          name: salonName,
          slug: salonSlug,
        })
        .select(
          "id, name, slug, active"
        )
        .single();

      if (
        createSalonError ||
        !createdSalon
      ) {
        return NextResponse.json(
          {
            error:
              createSalonError?.message ||
              "Could not create the salon.",
          },
          { status: 500 }
        );
      }

      salon = createdSalon;
    }

    const {
      data: existingOwner,
      error: existingOwnerError,
    } = await admin
      .from("profiles")
      .select("id")
      .eq("salon_id", salon.id)
      .ilike("role", "owner")
      .limit(1)
      .maybeSingle();

    if (existingOwnerError) {
      return NextResponse.json(
        {
          error:
            existingOwnerError.message,
        },
        { status: 500 }
      );
    }

    if (existingOwner) {
      return NextResponse.json(
        {
          error:
            "This salon already has an owner.",
        },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3001");

    const {
      data,
      error,
    } =
      await admin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name: fullName,
            role: "owner",
            salon_slug:
              salon.slug,
          },
          redirectTo:
            `${siteUrl}/owner-setup`,
        }
      );

    if (
      error ||
      !data.user
    ) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Could not create salon owner.",
        },
        { status: 400 }
      );
    }

    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role: "owner",
        salon_id: salon.id,
      })
      .eq("id", data.user.id);

    if (profileError) {
      return NextResponse.json(
        {
          error:
            profileError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        `Owner invitation sent for ${salon.name}.`,
    });
  } catch (error) {
    console.error(
      "Invite salon owner error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CredentialsRequest = {
  credentials?: Record<string, string>;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const accessToken = authHeader.slice("Bearer ".length);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired login session." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("salon_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Payment credentials profile lookup failed:",
        profileError
      );

      return NextResponse.json(
        { error: "Could not load owner profile." },
        { status: 500 }
      );
    }

    if (
      !profile?.salon_id ||
      String(profile.role).toLowerCase() !== "owner"
    ) {
      return NextResponse.json(
        { error: "Owner access is required." },
        { status: 403 }
      );
    }

    const { data: paymentConnection, error: connectionError } =
      await supabaseAdmin
        .from("salon_payment_connections")
        .select("provider")
        .eq("salon_id", profile.salon_id)
        .maybeSingle();

    if (connectionError) {
      console.error(
        "Payment connection lookup failed:",
        connectionError
      );

      return NextResponse.json(
        { error: "Could not load payment connection." },
        { status: 500 }
      );
    }

    if (!paymentConnection) {
      return NextResponse.json(
        { error: "Choose a payment provider first." },
        { status: 400 }
      );
    }

    if (
      paymentConnection.provider === "manual" ||
      paymentConnection.provider === "other"
    ) {
      return NextResponse.json(
        {
          error:
            "This payment option does not require online payment credentials.",
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CredentialsRequest;

    if (
      !body.credentials ||
      Object.keys(body.credentials).length === 0
    ) {
      return NextResponse.json(
        { error: "Payment details are required." },
        { status: 400 }
      );
    }

    const cleanedCredentials = Object.fromEntries(
      Object.entries(body.credentials)
        .map(([key, value]) => [key.trim(), String(value).trim()])
        .filter(([key, value]) => key.length > 0 && value.length > 0)
    );

    if (Object.keys(cleanedCredentials).length === 0) {
      return NextResponse.json(
        { error: "Payment details are required." },
        { status: 400 }
      );
    }

    const { error: saveError } = await supabaseAdmin.rpc(
      "save_salon_payment_credentials",
      {
        p_salon_id: profile.salon_id,
        p_credentials: cleanedCredentials,
      }
    );

    if (saveError) {
      console.error(
        "Payment credentials save failed:",
        saveError
      );

      return NextResponse.json(
        { error: "Could not save payment details securely." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: paymentConnection.provider,
    });
  } catch (error) {
    console.error("Payment credentials route failed:", error);

    return NextResponse.json(
      { error: "Unexpected payment setup error." },
      { status: 500 }
    );
  }
}
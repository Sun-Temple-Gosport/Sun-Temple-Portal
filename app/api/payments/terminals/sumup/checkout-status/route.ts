import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const authHeader =
      request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const accessToken =
      authHeader.slice("Bearer ".length);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired login session." },
        { status: 401 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("salon_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.salon_id) {
      return NextResponse.json(
        { error: "Could not determine the current salon." },
        { status: 400 }
      );
    }

    const role =
      String(profile.role ?? "").toLowerCase();

    if (
      role !== "owner" &&
      role !== "staff"
    ) {
      return NextResponse.json(
        { error: "Staff access is required." },
        { status: 403 }
      );
    }

    const url = new URL(request.url);

    const readerId =
      url.searchParams.get("readerId")?.trim();

    const checkoutId =
      url.searchParams.get("checkoutId")?.trim();

    if (!readerId || !checkoutId) {
      return NextResponse.json(
        {
          error:
            "Reader ID and checkout ID are required.",
        },
        { status: 400 }
      );
    }

    const {
      data: terminal,
      error: terminalError,
    } = await supabaseAdmin
      .from("salon_payment_terminals")
      .select("provider_terminal_id")
      .eq("salon_id", profile.salon_id)
      .eq("provider", "sumup")
      .eq("provider_terminal_id", readerId)
      .maybeSingle();

    if (
      terminalError ||
      !terminal?.provider_terminal_id
    ) {
      return NextResponse.json(
        {
          error:
            "That SumUp terminal does not belong to this salon.",
        },
        { status: 404 }
      );
    }

    const {
      data: connection,
      error: connectionError,
    } = await supabaseAdmin
      .from("salon_payment_connections")
      .select(
        "provider, merchant_reference, credentials_secret_id"
      )
      .eq("salon_id", profile.salon_id)
      .maybeSingle();

    if (
      connectionError ||
      !connection ||
      connection.provider !== "sumup"
    ) {
      return NextResponse.json(
        {
          error:
            "SumUp is not configured for this salon.",
        },
        { status: 400 }
      );
    }

    let apiKey: string | null = null;
    let merchantCode: string | null = null;

    if (
      connection.merchant_reference ===
      "legacy_env"
    ) {
      apiKey =
        process.env.SUMUP_API_KEY ?? null;

      merchantCode =
        process.env.SUMUP_MERCHANT_CODE ?? null;
    } else {
      if (!connection.credentials_secret_id) {
        return NextResponse.json(
          {
            error:
              "SumUp credentials are missing.",
          },
          { status: 500 }
        );
      }

      const {
        data: credentials,
        error: credentialsError,
      } = await supabaseAdmin.rpc(
        "get_salon_payment_credentials",
        {
          p_salon_id: profile.salon_id,
        }
      );

      if (
        credentialsError ||
        !credentials ||
        typeof credentials !== "object"
      ) {
        return NextResponse.json(
          {
            error:
              "Could not load SumUp credentials.",
          },
          { status: 500 }
        );
      }

      const typedCredentials =
        credentials as Record<string, unknown>;

      apiKey =
        typeof typedCredentials.api_key === "string"
          ? typedCredentials.api_key
          : null;

      merchantCode =
        typeof typedCredentials.merchant_code ===
        "string"
          ? typedCredentials.merchant_code
          : null;
    }

    if (!apiKey || !merchantCode) {
      return NextResponse.json(
        {
          error:
            "SumUp credentials are incomplete.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.sumup.com/v0.1/merchants/${merchantCode}/readers/${readerId}/checkout/${checkoutId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "SumUp Solo checkout status failed:",
        data
      );

      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.title ||
            "Could not check SumUp payment status.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      status:
        data?.data?.status ?? "pending",
      paymentStatus:
        data?.data?.payment_status ?? null,
    });
  } catch (error) {
    console.error(
      "SumUp Solo checkout status route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected SumUp checkout status error.",
      },
      { status: 500 }
    );
  }
}
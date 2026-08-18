import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StoredCredentials = {
  api_key?: string;
  merchant_code?: string;
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

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("salon_id, role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Payment verification profile lookup failed:",
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

    const {
      data: paymentConnection,
      error: connectionError,
    } = await supabaseAdmin
      .from("salon_payment_connections")
      .select(
        "provider, connection_status, credentials_secret_id"
      )
      .eq("salon_id", profile.salon_id)
      .maybeSingle();

    if (connectionError) {
      console.error(
        "Payment verification connection lookup failed:",
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

    if (paymentConnection.provider !== "sumup") {
      return NextResponse.json(
        {
          error:
            "Automatic verification is not yet available for this payment provider.",
        },
        { status: 400 }
      );
    }

    if (!paymentConnection.credentials_secret_id) {
      return NextResponse.json(
        { error: "Save your payment details first." },
        { status: 400 }
      );
    }

    const {
      data: credentialsData,
      error: credentialsError,
    } = await supabaseAdmin.rpc(
      "get_salon_payment_credentials",
      {
        p_salon_id: profile.salon_id,
      }
    );

    if (credentialsError) {
      console.error(
        "Payment credential retrieval failed:",
        credentialsError
      );

      return NextResponse.json(
        { error: "Could not load payment details securely." },
        { status: 500 }
      );
    }

    const credentials =
      credentialsData as StoredCredentials | null;

    const apiKey = credentials?.api_key?.trim();
    const merchantCode =
      credentials?.merchant_code?.trim();

    if (!apiKey || !merchantCode) {
      return NextResponse.json(
        {
          error:
            "Your saved payment details are incomplete. Please enter them again.",
        },
        { status: 400 }
      );
    }

    const sumupResponse = await fetch(
      `https://api.sumup.com/v1/merchants/${encodeURIComponent(
        merchantCode
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!sumupResponse.ok) {
      console.error(
        "SumUp payment verification failed with status:",
        sumupResponse.status
      );

      const { error: statusError } = await supabaseAdmin
        .from("salon_payment_connections")
        .update({
          connection_status: "error",
          merchant_reference: null,
          updated_at: new Date().toISOString(),
        })
        .eq("salon_id", profile.salon_id);

      if (statusError) {
        console.error(
          "Could not record payment verification failure:",
          statusError
        );
      }

      return NextResponse.json(
        {
          error:
            "SumUp could not verify those payment details. Please check your API key and merchant code.",
        },
        { status: 400 }
      );
    }

    const merchantData = await sumupResponse.json();

    const verifiedMerchantCode =
      typeof merchantData?.merchant_code === "string"
        ? merchantData.merchant_code
        : null;

    if (
      !verifiedMerchantCode ||
      verifiedMerchantCode !== merchantCode
    ) {
      return NextResponse.json(
        {
          error:
            "The payment provider returned unexpected merchant details.",
        },
        { status: 400 }
      );
    }

    const { error: activateError } =
      await supabaseAdmin
        .from("salon_payment_connections")
        .update({
          connection_status: "connected",
          merchant_reference: verifiedMerchantCode,
          updated_at: new Date().toISOString(),
        })
        .eq("salon_id", profile.salon_id);

    if (activateError) {
      console.error(
        "Payment connection activation failed:",
        activateError
      );

      return NextResponse.json(
        {
          error:
            "Payment details were verified but could not be activated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: "sumup",
      merchantReference: verifiedMerchantCode,
      connectionStatus: "connected",
    });
  } catch (error) {
    console.error("Payment verification route failed:", error);

    return NextResponse.json(
      { error: "Unexpected payment verification error." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const allowedProviders = [
  "sumup",
  "stripe",
  "square",
  "dojo",
  "worldpay",
  "opayo",
  "manual",
  "other",
] as const;

type ProviderId = (typeof allowedProviders)[number];

type ProviderRequest = {
  provider?: ProviderId;
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
        "Payment provider profile lookup failed:",
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

    const body = (await request.json()) as ProviderRequest;

    if (
      !body.provider ||
      !allowedProviders.includes(body.provider)
    ) {
      return NextResponse.json(
        { error: "Invalid payment provider." },
        { status: 400 }
      );
    }

    const { data: existingConnection, error: existingError } =
      await supabaseAdmin
        .from("salon_payment_connections")
        .select(
          "provider, connection_status, merchant_reference, credentials_secret_id"
        )
        .eq("salon_id", profile.salon_id)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Existing payment connection lookup failed:",
        existingError
      );

      return NextResponse.json(
        { error: "Could not load payment connection." },
        { status: 500 }
      );
    }

    const providerChanged =
  existingConnection?.provider !== body.provider;

if (
  providerChanged &&
  existingConnection?.credentials_secret_id
) {
  const { error: deleteCredentialsError } =
    await supabaseAdmin.rpc(
      "delete_salon_payment_credentials",
      {
        p_salon_id: profile.salon_id,
      }
    );

  if (deleteCredentialsError) {
    console.error(
      "Old payment credentials cleanup failed:",
      deleteCredentialsError
    );

    return NextResponse.json(
      { error: "Could not change payment provider safely." },
      { status: 500 }
    );
  }
}

const connectionStatus =
      providerChanged || !existingConnection
        ? "not_configured"
        : existingConnection.connection_status;

    const merchantReference =
      providerChanged
        ? null
        : existingConnection?.merchant_reference ?? null;

    const credentialsSecretId =
      providerChanged
        ? null
        : existingConnection?.credentials_secret_id ?? null;

    const { error: connectionError } = await supabaseAdmin
      .from("salon_payment_connections")
      .upsert(
        {
          salon_id: profile.salon_id,
          provider: body.provider,
          connection_status: connectionStatus,
          merchant_reference: merchantReference,
          credentials_secret_id: credentialsSecretId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "salon_id",
        }
      );

    if (connectionError) {
      console.error(
        "Payment connection update failed:",
        connectionError
      );

      return NextResponse.json(
        { error: "Could not save payment provider." },
        { status: 500 }
      );
    }

    const { error: settingsError } = await supabaseAdmin
      .from("salon_settings")
      .update({
        payment_provider: body.provider,
        updated_at: new Date().toISOString(),
      })
      .eq("salon_id", profile.salon_id);

    if (settingsError) {
      console.error(
        "Salon payment provider update failed:",
        settingsError
      );

      return NextResponse.json(
        { error: "Could not update salon payment settings." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: body.provider,
      connectionStatus,
    });
  } catch (error) {
    console.error("Payment provider route failed:", error);

    return NextResponse.json(
      { error: "Unexpected payment provider error." },
      { status: 500 }
    );
  }
}
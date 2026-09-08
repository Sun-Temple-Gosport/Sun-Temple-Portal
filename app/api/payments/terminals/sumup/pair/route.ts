import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PairReaderRequest = {
  pairingCode?: string;
  terminalName?: string;
};

type StoredCredentials = {
  api_key?: string;
  merchant_code?: string;
};

type SumUpReader = {
  id?: string;
  name?: string;
  status?: "unknown" | "processing" | "paired" | "expired";
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
        "SumUp terminal profile lookup failed:",
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

    const body = (await request.json()) as PairReaderRequest;

    const pairingCode = String(body.pairingCode ?? "")
      .replace(/\s+/g, "")
      .toUpperCase();

    const terminalName =
      String(body.terminalName ?? "").trim() || "Front Desk";

    if (!/^[A-Z0-9]{8,9}$/.test(pairingCode)) {
      return NextResponse.json(
        {
          error:
            "Enter the 8 or 9 character pairing code shown on the SumUp Solo.",
        },
        { status: 400 }
      );
    }

    const {
      data: paymentConnection,
      error: connectionError,
    } = await supabaseAdmin
      .from("salon_payment_connections")
      .select(
        "provider, connection_status, merchant_reference, credentials_secret_id"
      )
      .eq("salon_id", profile.salon_id)
      .maybeSingle();

    if (connectionError) {
      console.error(
        "SumUp terminal connection lookup failed:",
        connectionError
      );

      return NextResponse.json(
        { error: "Could not load the salon payment connection." },
        { status: 500 }
      );
    }

    if (
      !paymentConnection ||
      paymentConnection.provider !== "sumup"
    ) {
      return NextResponse.json(
        {
          error:
            "SumUp must be selected as this salon's payment provider.",
        },
        { status: 400 }
      );
    }

    if (paymentConnection.connection_status !== "connected") {
      return NextResponse.json(
        {
          error:
            "Verify and activate the salon's SumUp connection before pairing a terminal.",
        },
        { status: 400 }
      );
    }

    let credentials: StoredCredentials | null = null;

    if (paymentConnection.merchant_reference === "legacy_env") {
      const apiKey = process.env.SUMUP_API_KEY;
      const merchantCode = process.env.SUMUP_MERCHANT_CODE;

      if (!apiKey || !merchantCode) {
        return NextResponse.json(
          {
            error:
              "The existing SumUp connection is missing its API credentials.",
          },
          { status: 500 }
        );
      }

      credentials = {
        api_key: apiKey,
        merchant_code: merchantCode,
      };
    } else {
      if (!paymentConnection.credentials_secret_id) {
        return NextResponse.json(
          {
            error:
              "The salon's SumUp payment credentials have not been saved.",
          },
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
          "SumUp terminal credential retrieval failed:",
          credentialsError
        );

        return NextResponse.json(
          {
            error:
              "Could not load the salon's SumUp credentials securely.",
          },
          { status: 500 }
        );
      }

      credentials =
        credentialsData as StoredCredentials | null;
    }

    const apiKey = credentials?.api_key?.trim();
    const merchantCode =
      credentials?.merchant_code?.trim();

    if (!apiKey || !merchantCode) {
      return NextResponse.json(
        {
          error:
            "The salon's SumUp API Key or Merchant Code is missing.",
        },
        { status: 400 }
      );
    }

    const sumUpResponse = await fetch(
      `https://api.sumup.com/v0.1/merchants/${encodeURIComponent(
        merchantCode
      )}/readers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          pairing_code: pairingCode,
          name: terminalName,
        }),
        cache: "no-store",
      }
    );

    if (!sumUpResponse.ok) {
      const errorText = await sumUpResponse.text();

      console.error(
        "SumUp reader pairing failed:",
        sumUpResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          error:
            "SumUp could not pair that terminal. Check the pairing code and try again.",
        },
        { status: 502 }
      );
    }

    const reader =
      (await sumUpResponse.json()) as SumUpReader;

    if (!reader.id) {
      console.error(
        "SumUp reader pairing returned no reader ID:",
        reader
      );

      return NextResponse.json(
        {
          error:
            "SumUp accepted the pairing request but did not return a reader ID.",
        },
        { status: 502 }
      );
    }

    const { data: existingDefault } =
      await supabaseAdmin
        .from("salon_payment_terminals")
        .select("provider_terminal_id")
        .eq("salon_id", profile.salon_id)
        .eq("provider", "sumup")
        .eq("is_default", true)
        .maybeSingle();

    const shouldBeDefault =
      !existingDefault ||
      existingDefault.provider_terminal_id === reader.id;

    const { error: terminalSaveError } =
      await supabaseAdmin
        .from("salon_payment_terminals")
        .upsert(
          {
            salon_id: profile.salon_id,
            provider: "sumup",
            terminal_name:
              reader.name?.trim() || terminalName,
            provider_terminal_id: reader.id,
            status: reader.status ?? "processing",
            is_default: shouldBeDefault,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              "salon_id,provider,provider_terminal_id",
          }
        );

    if (terminalSaveError) {
      console.error(
        "SumUp reader database save failed:",
        terminalSaveError
      );

      return NextResponse.json(
        {
          error:
            "The terminal was paired with SumUp but could not be saved in TanSalonOS.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      readerId: reader.id,
      terminalName:
        reader.name?.trim() || terminalName,
      status: reader.status ?? "processing",
      isDefault: shouldBeDefault,
    });
  } catch (error) {
    console.error(
      "SumUp terminal pairing route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected SumUp terminal pairing error.",
      },
      { status: 500 }
    );
  }
}
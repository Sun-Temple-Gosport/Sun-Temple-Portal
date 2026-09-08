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

type SumUpReader = {
  id?: string;
  name?: string;
  status?: "unknown" | "processing" | "paired" | "expired";
  device?: {
    identifier?: string;
    model?: string;
  };
};

export async function GET(request: Request) {
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
        "SumUp terminal status profile lookup failed:",
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
        "provider, connection_status, merchant_reference, credentials_secret_id"
      )
      .eq("salon_id", profile.salon_id)
      .maybeSingle();

    if (connectionError) {
      console.error(
        "SumUp terminal status connection lookup failed:",
        connectionError
      );

      return NextResponse.json(
        {
          error:
            "Could not load the salon payment connection.",
        },
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
          "SumUp terminal status credential retrieval failed:",
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

    const {
      data: terminals,
      error: terminalsError,
    } = await supabaseAdmin
      .from("salon_payment_terminals")
      .select(
        "id, terminal_name, provider_terminal_id, status, is_default, created_at"
      )
      .eq("salon_id", profile.salon_id)
      .eq("provider", "sumup")
      .order("created_at", { ascending: true });

    if (terminalsError) {
      console.error(
        "SumUp terminal database lookup failed:",
        terminalsError
      );

      return NextResponse.json(
        {
          error:
            "Could not load this salon's SumUp terminals.",
        },
        { status: 500 }
      );
    }

    const syncedTerminals = await Promise.all(
      (terminals ?? []).map(async (terminal) => {
        const sumUpResponse = await fetch(
          `https://api.sumup.com/v0.1/merchants/${encodeURIComponent(
            merchantCode
          )}/readers/${encodeURIComponent(
            terminal.provider_terminal_id
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

        if (!sumUpResponse.ok) {
          const errorText = await sumUpResponse.text();

          console.error(
            "SumUp reader status lookup failed:",
            terminal.provider_terminal_id,
            sumUpResponse.status,
            errorText
          );

          return {
            id: terminal.id,
            terminalName: terminal.terminal_name,
            readerId: terminal.provider_terminal_id,
            status: terminal.status,
            isDefault: terminal.is_default,
            syncError: true,
          };
        }

        const reader =
          (await sumUpResponse.json()) as SumUpReader;

        const readerStatus =
          reader.status ?? terminal.status;

        const terminalName =
          reader.name?.trim() ||
          terminal.terminal_name;

        const { error: updateError } =
          await supabaseAdmin
            .from("salon_payment_terminals")
            .update({
              terminal_name: terminalName,
              status: readerStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", terminal.id)
            .eq("salon_id", profile.salon_id);

        if (updateError) {
          console.error(
            "SumUp terminal status database update failed:",
            updateError
          );
        }

        return {
          id: terminal.id,
          terminalName,
          readerId: terminal.provider_terminal_id,
          status: readerStatus,
          isDefault: terminal.is_default,
          deviceModel: reader.device?.model ?? null,
          deviceIdentifier:
            reader.device?.identifier ?? null,
          syncError: false,
        };
      })
    );

    return NextResponse.json({
      success: true,
      terminals: syncedTerminals,
    });
  } catch (error) {
    console.error(
      "SumUp terminal status route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected SumUp terminal status error.",
      },
      { status: 500 }
    );
  }
}
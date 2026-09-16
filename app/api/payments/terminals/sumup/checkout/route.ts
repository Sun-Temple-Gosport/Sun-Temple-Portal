import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CheckoutRequest = {
  amount?: number;
  description?: string;
};

export async function POST(request: Request) {
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

    const body =
      (await request.json()) as CheckoutRequest;

    const amount = Number(body.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { error: "Enter a valid payment amount." },
        { status: 400 }
      );
    }

    const amountPence =
      Math.round(amount * 100);

    const {
      data: connection,
      error: connectionError,
    } = await supabaseAdmin
      .from("salon_payment_connections")
      .select(
        "provider, connection_status, merchant_reference, credentials_secret_id"
      )
      .eq("salon_id", profile.salon_id)
      .maybeSingle();

    if (
      connectionError ||
      !connection ||
      connection.provider !== "sumup" ||
      connection.connection_status !== "connected"
    ) {
      return NextResponse.json(
        {
          error:
            "SumUp is not connected for this salon.",
        },
        { status: 400 }
      );
    }

    const {
      data: terminal,
      error: terminalError,
    } = await supabaseAdmin
      .from("salon_payment_terminals")
      .select(
        "provider_terminal_id, terminal_name, status"
      )
      .eq("salon_id", profile.salon_id)
      .eq("provider", "sumup")
      .eq("is_default", true)
      .maybeSingle();

    if (
      terminalError ||
      !terminal?.provider_terminal_id
    ) {
      return NextResponse.json(
        {
          error:
            "No default SumUp terminal is configured.",
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

    const affiliateKey =
      process.env.SUMUP_AFFILIATE_KEY;

    const appId =
      process.env.SUMUP_APP_ID;

    if (!affiliateKey || !appId) {
      return NextResponse.json(
        {
          error:
            "SumUp Solo affiliate settings are missing.",
        },
        { status: 500 }
      );
    }

    const transactionId = randomUUID();

    const response = await fetch(
      `https://api.sumup.com/v0.1/merchants/${merchantCode}/readers/${terminal.provider_terminal_id}/checkout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          affiliate: {
            app_id: appId,
            key: affiliateKey,
            foreign_transaction_id:
              transactionId,
          },
          description:
            body.description?.trim() ||
            "TanSalonOS payment",
          total_amount: {
            currency: "GBP",
            minor_unit: 2,
            value: amountPence,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "SumUp Solo checkout failed:",
        data
      );

      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.title ||
            "SumUp Solo checkout failed.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      terminalName:
        terminal.terminal_name,
      readerId:
        terminal.provider_terminal_id,
      checkoutId:
        data?.data?.checkout_id ?? null,
      clientTransactionId:
        data?.data?.client_transaction_id ??
        transactionId,
    });
  } catch (error) {
    console.error(
      "SumUp Solo checkout route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected SumUp Solo checkout error.",
      },
      { status: 500 }
    );
  }
}
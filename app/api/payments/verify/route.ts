import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProviderId =
  | "sumup"
  | "stripe"
  | "square"
  | "dojo"
  | "worldpay"
  | "opayo"
  

type StoredCredentials = {
  environment?: string;
  api_key?: string;
  merchant_code?: string;

  secret_key?: string;
  webhook_signing_secret?: string;

  access_token?: string;
  location_id?: string;

    api_username?: string;
  api_password?: string;
  merchant_entity?: string;

  integration_key?: string;
  integration_password?: string;
  vendor_name?: string;

  merchant_account?: string;
  client_key?: string;
  live_url_prefix?: string;

  client_id?: string;
};

type VerificationResult = {
  ok: boolean;
  merchantReference?: string;
  error?: string;
};

function credential(
  credentials: StoredCredentials,
  key: keyof StoredCredentials
) {
  const value = credentials[key];

  return typeof value === "string"
    ? value.trim()
    : "";
}

async function verifySumUp(
  credentials: StoredCredentials
): Promise<VerificationResult> {
  const apiKey = credential(credentials, "api_key");
  const merchantCode = credential(
    credentials,
    "merchant_code"
  );

  if (!apiKey || !merchantCode) {
    return {
      ok: false,
      error:
        "Your saved SumUp payment details are incomplete.",
    };
  }

  const response = await fetch(
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

  if (!response.ok) {
    return {
      ok: false,
      error:
        "SumUp could not verify those payment details. Please check your API key and merchant code.",
    };
  }

  const data = await response.json();

  if (
    typeof data?.merchant_code !== "string" ||
    data.merchant_code !== merchantCode
  ) {
    return {
      ok: false,
      error:
        "SumUp returned unexpected merchant details.",
    };
  }

  return {
    ok: true,
    merchantReference: merchantCode,
  };
}

async function verifyStripe(
  credentials: StoredCredentials
): Promise<VerificationResult> {
  const secretKey = credential(
    credentials,
    "secret_key"
  );

  if (!secretKey) {
  return {
    ok: false,
    error:
      "Your saved Stripe payment details are incomplete.",
  };
}

  const authorization = Buffer.from(
    `${secretKey}:`
  ).toString("base64");

  const response = await fetch(
    "https://api.stripe.com/v1/balance",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${authorization}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      error:
        "Stripe could not verify your Secret Key.",
    };
  }

  const data = await response.json();

  if (data?.object !== "balance") {
    return {
      ok: false,
      error:
        "Stripe returned an unexpected verification response.",
    };
  }

  return {
    ok: true,
    merchantReference:
      data?.livemode === true
        ? "stripe_live"
        : "stripe_test",
  };
}

async function verifySquare(
  credentials: StoredCredentials
): Promise<VerificationResult> {
  const accessToken = credential(
    credentials,
    "access_token"
  );
  const environment = credential(
  credentials,
  "environment"
).toLowerCase();

const squareBaseUrl =
  environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

  const locationId = credential(
    credentials,
    "location_id"
  );

  if (!accessToken || !locationId) {
    return {
      ok: false,
      error:
        "Your saved Square payment details are incomplete.",
    };
  }

  const response = await fetch(
  `${squareBaseUrl}/v2/locations/${encodeURIComponent(
      locationId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2026-07-15",
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    
    return {
      ok: false,
      error:
        "Square could not verify your Access Token and Location ID.",
    };
  }

  const data = await response.json();

  if (
    typeof data?.location?.id !== "string" ||
    data.location.id !== locationId
  ) {
    return {
      ok: false,
      error:
        "Square returned an unexpected location.",
    };
  }

  return {
    ok: true,
    merchantReference: locationId,
  };
}



async function verifyDojo(
  credentials: StoredCredentials
): Promise<VerificationResult> {
  const apiKey = credential(credentials, "api_key");

  if (!apiKey) {
    return {
      ok: false,
      error:
        "Your saved Dojo payment details are incomplete.",
    };
  }

  const createResponse = await fetch(
    "https://api.dojo.tech/payment-intents",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        Version: "2026-02-27",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: {
          value: 1,
          currencyCode: "GBP",
        },
        reference: `TanSalonOS-verify-${Date.now()}`,
        description:
          "TanSalonOS payment connection verification",
        paymentMethods: ["Card"],
      }),
      cache: "no-store",
    }
  );

  if (!createResponse.ok) {
    return {
      ok: false,
      error:
        "Dojo could not verify your API Key.",
    };
  }

  const data = await createResponse.json();

  const paymentIntentId =
    typeof data?.id === "string"
      ? data.id
      : null;

  if (!paymentIntentId) {
    return {
      ok: false,
      error:
        "Dojo returned an unexpected verification response.",
    };
  }

  const cancelResponse = await fetch(
    `https://api.dojo.tech/payment-intents/${encodeURIComponent(
      paymentIntentId
    )}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${apiKey}`,
        Version: "2026-02-27",
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!cancelResponse.ok) {
    console.error(
      "Dojo verification payment intent could not be cancelled:",
      cancelResponse.status
    );
  }

  return {
    ok: true,
    merchantReference: "dojo_verified",
  };
}

async function verifyWorldpay(
  credentials: StoredCredentials
): Promise<VerificationResult> {
  const username = credential(
    credentials,
    "api_username"
  );

  const password = credential(
    credentials,
    "api_password"
  );

  const merchantEntity = credential(
    credentials,
    "merchant_entity"
  );

  const environment = credential(
  credentials,
  "environment"
).toLowerCase();

const worldpayBaseUrl =
  environment === "try"
    ? "https://try.access.worldpay.com"
    : "https://access.worldpay.com";

  if (
    !username ||
    !password ||
    !merchantEntity
  ) {
    return {
      ok: false,
      error:
        "Your saved Worldpay payment details are incomplete.",
    };
  }

  const authorization = Buffer.from(
    `${username}:${password}`
  ).toString("base64");

  const response = await fetch(
  `${worldpayBaseUrl}/payment_pages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type":
          "application/vnd.worldpay.payment_pages-v1.hal+json",
        Accept:
          "application/vnd.worldpay.payment_pages-v1.hal+json",
      },
      body: JSON.stringify({
        transactionReference:
          `TanSalonOS-verify-${Date.now()}`,

        merchant: {
          entity: merchantEntity,
        },

        narrative: {
          line1: "TanSalonOS Verify",
        },

        value: {
          currency: "GBP",
          amount: 1,
        },

        expiry: "300",
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      error:
        "Worldpay could not verify your API credentials and Merchant Entity.",
    };
  }

  const data = await response.json();

  if (typeof data?.url !== "string") {
    return {
      ok: false,
      error:
        "Worldpay returned an unexpected verification response.",
    };
  }

  return {
    ok: true,
    merchantReference: merchantEntity,
  };
}

async function verifyOpayo(
  credentials: StoredCredentials
): Promise<VerificationResult> {
  const integrationKey = credential(
    credentials,
    "integration_key"
  );

  const integrationPassword = credential(
    credentials,
    "integration_password"
  );

  const vendorName = credential(
    credentials,
    "vendor_name"
  );

  const environment = credential(
  credentials,
  "environment"
).toLowerCase();

const opayoBaseUrl =
  environment === "sandbox"
    ? "https://sandbox.opayo.eu.elavon.com"
    : "https://live.opayo.eu.elavon.com";
  if (
    !integrationKey ||
    !integrationPassword ||
    !vendorName
  ) {
    return {
      ok: false,
      error:
        "Your saved Opayo payment details are incomplete.",
    };
  }

  const authorization = Buffer.from(
    `${integrationKey}:${integrationPassword}`
  ).toString("base64");

  const response = await fetch(
  `${opayoBaseUrl}/api/v1/merchant-session-keys`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        vendorName,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
  const errorText = await response.text();

  console.error(
    "Opayo verification failed:",
    response.status,
    errorText
  );

  return {
    ok: false,
    error:
      "Opayo could not verify your Integration Key, Integration Password and Vendor Name.",
  };
}

  const data = await response.json();

  if (
    typeof data?.merchantSessionKey !== "string" ||
    !data.merchantSessionKey
  ) {
    return {
      ok: false,
      error:
        "Opayo returned an unexpected verification response.",
    };
  }

  return {
    ok: true,
    merchantReference: vendorName,
  };
}


async function verifyProvider(
  provider: ProviderId,
  credentials: StoredCredentials
): Promise<VerificationResult> {
  switch (provider) {
    case "sumup":
      return verifySumUp(credentials);

    case "stripe":
      return verifyStripe(credentials);

    case "square":
      return verifySquare(credentials);

    case "dojo":
      return verifyDojo(credentials);

    case "worldpay":
      return verifyWorldpay(credentials);

    case "opayo":
      return verifyOpayo(credentials);

  }
}

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
        {
          error:
            "Invalid or expired login session.",
        },
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

    if (profileError) {
      console.error(
        "Payment verification profile lookup failed:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Could not load owner profile.",
        },
        { status: 500 }
      );
    }

    if (
      !profile?.salon_id ||
      String(profile.role).toLowerCase() !==
        "owner"
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
        {
          error:
            "Could not load payment connection.",
        },
        { status: 500 }
      );
    }

    if (!paymentConnection) {
      return NextResponse.json(
        {
          error:
            "Choose a payment provider first.",
        },
        { status: 400 }
      );
    }

    const provider =
      paymentConnection.provider as ProviderId;

    const supportedProviders: ProviderId[] = [
      "sumup",
      "stripe",
      "square",
      "dojo",
      "worldpay",
      "opayo",
    ];

    if (
      !supportedProviders.includes(provider)
    ) {
      return NextResponse.json(
        {
          error:
            "This payment option does not require online verification.",
        },
        { status: 400 }
      );
    }

    if (
      !paymentConnection.credentials_secret_id
    ) {
      return NextResponse.json(
        {
          error:
            "Save your payment details first.",
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
        "Payment credential retrieval failed:",
        credentialsError
      );

      return NextResponse.json(
        {
          error:
            "Could not load payment details securely.",
        },
        { status: 500 }
      );
    }

    const credentials =
      credentialsData as StoredCredentials | null;

    if (!credentials) {
      return NextResponse.json(
        {
          error:
            "No saved payment details were found.",
        },
        { status: 400 }
      );
    }

    const verification =
      await verifyProvider(
        provider,
        credentials
      );

    if (!verification.ok) {
      const { error: statusError } =
        await supabaseAdmin
          .from(
            "salon_payment_connections"
          )
          .update({
            connection_status: "error",
            merchant_reference: null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "salon_id",
            profile.salon_id
          );

      if (statusError) {
        console.error(
          "Could not record payment verification failure:",
          statusError
        );
      }

      return NextResponse.json(
        {
          error:
            verification.error ||
            "The payment provider could not verify those details.",
        },
        { status: 400 }
      );
    }

    const merchantReference =
      verification.merchantReference ??
      `${provider}_verified`;

    const { error: activateError } =
      await supabaseAdmin
        .from("salon_payment_connections")
        .update({
          connection_status: "connected",
          merchant_reference:
            merchantReference,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "salon_id",
          profile.salon_id
        );

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
      provider,
      merchantReference,
      connectionStatus: "connected",
    });
  } catch (error) {
    console.error(
      "Payment verification route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected payment verification error.",
      },
      { status: 500 }
    );
  }
}
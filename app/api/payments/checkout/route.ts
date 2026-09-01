import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createProviderCheckout } from "./providerDispatcher";

import type {
  OnlinePaymentProvider,
  StoredPaymentCredentials,
} from "./providerTypes";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CheckoutRequest = {
  packageId?: number;
  checkoutReference?: string;
};

type VipSettings = {
  discount_percent: number;
  course_expiry_days: number;
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
        {
          error:
            "Invalid or expired login session.",
        },
        { status: 401 }
      );
    }

    const body =
      (await request.json()) as CheckoutRequest;

    if (
      !body.packageId ||
      !body.checkoutReference
    ) {
      return NextResponse.json(
        { error: "Missing checkout information." },
        { status: 400 }
      );
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("customer_id, salon_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Payment checkout profile lookup failed:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Could not load customer profile.",
        },
        { status: 500 }
      );
    }

    if (!profile?.salon_id) {
      return NextResponse.json(
        {
          error:
            "Customer salon could not be determined.",
        },
        { status: 400 }
      );
    }

    let customerQuery = supabaseAdmin
      .from("customers")
      .select(
  "customer_id, vip_expires_at, salon_id, discount_type, discount_expires_at"
)
      .eq("salon_id", profile.salon_id);

    if (profile.customer_id) {
      customerQuery = customerQuery.eq(
        "customer_id",
        profile.customer_id
      );
    } else {
      customerQuery = customerQuery.eq(
        "email",
        user.email
      );
    }

    const {
      data: customer,
      error: customerError,
    } = await customerQuery.maybeSingle();

    if (customerError) {
      console.error(
        "Payment checkout customer lookup failed:",
        customerError
      );

      return NextResponse.json(
        {
          error:
            "Could not load customer account.",
        },
        { status: 500 }
      );
    }

    if (!customer?.salon_id) {
      return NextResponse.json(
        {
          error:
            "Customer account was not found for this salon.",
        },
        { status: 404 }
      );
    }

    const [
      {
        data: paymentConnection,
        error: connectionError,
      },
      {
        data: pkg,
        error: packageError,
      },
      {
        data: vipSettings,
        error: vipError,
      },
    ] = await Promise.all([
      supabaseAdmin
        .from("salon_payment_connections")
        .select(
          "provider, connection_status, merchant_reference, credentials_secret_id"
        )
        .eq("salon_id", customer.salon_id)
        .maybeSingle(),

      supabaseAdmin
  .from("packages")
  .select(
    "id, name, minutes, price, expiry_days, active, is_unlimited"
  )
  .eq("id", body.packageId)
  .eq("salon_id", customer.salon_id)
  .eq("active", true)
  .or("minutes.gte.30,is_unlimited.eq.true")
  .maybeSingle(),

      supabaseAdmin
        .from("vip_settings")
        .select(
          "discount_percent, course_expiry_days"
        )
        .eq("salon_id", customer.salon_id)
        .maybeSingle(),
    ]);

    if (connectionError) {
      console.error(
        "Payment checkout connection lookup failed:",
        connectionError
      );

      return NextResponse.json(
        {
          error:
            "Could not load salon payment connection.",
        },
        { status: 500 }
      );
    }

    if (packageError) {
      console.error(
        "Payment checkout package lookup failed:",
        packageError
      );

      return NextResponse.json(
        {
          error: "Could not load package.",
        },
        { status: 500 }
      );
    }

    if (vipError) {
      console.error(
        "Payment checkout VIP lookup failed:",
        vipError
      );

      return NextResponse.json(
        {
          error:
            "Could not load VIP settings.",
        },
        { status: 500 }
      );
    }

    if (!pkg) {
      return NextResponse.json(
        {
          error: "Package is unavailable.",
        },
        { status: 404 }
      );
    }

    if (
      !paymentConnection ||
      paymentConnection.connection_status !==
        "connected"
    ) {
      return NextResponse.json(
        {
          error:
            "Online payments are not currently configured for this salon.",
        },
        { status: 400 }
      );
    }

    const provider =
      paymentConnection.provider as OnlinePaymentProvider;

    const supportedProviders: OnlinePaymentProvider[] = [
      "sumup",
      "stripe",
      "square",
      "dojo",
      "worldpay",
      "opayo",
      ];

    if (!supportedProviders.includes(provider)) {
      return NextResponse.json(
        {
          error:
            "This salon does not have a supported online payment provider.",
        },
        { status: 400 }
      );
    }

    let credentials: StoredPaymentCredentials = {};

    if (
      provider === "sumup" &&
      paymentConnection.merchant_reference ===
        "legacy_env"
    ) {
      const apiKey =
        process.env.SUMUP_API_KEY;

      const merchantCode =
        process.env.SUMUP_MERCHANT_CODE;

      if (!apiKey || !merchantCode) {
        console.error(
          "Legacy SumUp credentials are missing."
        );

        return NextResponse.json(
          {
            error:
              "Salon payment connection is unavailable.",
          },
          { status: 500 }
        );
      }

      credentials = {
        api_key: apiKey,
        merchant_code: merchantCode,
      };
    } else {
      if (
        !paymentConnection.credentials_secret_id
      ) {
        return NextResponse.json(
          {
            error:
              "Salon payment credentials are missing.",
          },
          { status: 500 }
        );
      }

      const {
        data: credentialsData,
        error: credentialsError,
      } = await supabaseAdmin.rpc(
        "get_salon_payment_credentials",
        {
          p_salon_id: customer.salon_id,
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
              "Could not load salon payment credentials.",
          },
          { status: 500 }
        );
      }

      if (
        !credentialsData ||
        typeof credentialsData !== "object"
      ) {
        return NextResponse.json(
          {
            error:
              "Salon payment credentials are incomplete.",
          },
          { status: 500 }
        );
      }

      credentials =
        credentialsData as StoredPaymentCredentials;
    }

    const isVip =
      !!customer.vip_expires_at &&
      new Date(customer.vip_expires_at) >
        new Date();

    const typedVipSettings =
      vipSettings as VipSettings | null;

    const customerDiscountIsActive =
  !!customer.discount_expires_at &&
  new Date(customer.discount_expires_at) >= new Date() &&
  (customer.discount_type === "blue_light" ||
    customer.discount_type === "military");

const customerDiscountPercent =
  customerDiscountIsActive && Number(pkg.minutes) >= 60
    ? 10
    : 0;

const vipDiscountPercent =
  isVip && typedVipSettings
    ? Number(typedVipSettings.discount_percent)
    : 0;

const appliedDiscountPercent = Math.max(
  vipDiscountPercent,
  customerDiscountPercent
);

const amount = Number(
  (
    Number(pkg.price) *
    (1 - appliedDiscountPercent / 100)
  ).toFixed(2)
);

    const expiryDays =
  pkg.is_unlimited
    ? Number(pkg.expiry_days ?? 30)
    : isVip && typedVipSettings
    ? Number(
        typedVipSettings.course_expiry_days
      )
    : Number(pkg.expiry_days ?? 30);

    const expiry = new Date();

    expiry.setDate(
      expiry.getDate() + expiryDays
    );

    const description = pkg.is_unlimited
  ? `Unlimited Package${isVip ? " - VIP" : ""}`
  : `${pkg.minutes} Minute Package${
      isVip ? " - VIP" : ""
    }`;

    const {
  data: createdPurchase,
  error: purchaseError,
} = await supabaseAdmin
  .from("purchases")
  .insert({
    salon_id: customer.salon_id,
    customer_id:
      customer.customer_id,
    package_id: pkg.id,
    minutes_added: pkg.minutes,
is_unlimited: pkg.is_unlimited === true,
amount_paid: amount,
expiry_date: expiry
  .toISOString()
  .split("T")[0],
payment_provider: provider,
    checkout_reference:
      body.checkoutReference,
    payment_status: "pending",
  })
  .select("id")
  .single();

    if (purchaseError) {
      console.error(
        "Generic purchase insert failed:",
        purchaseError
      );

      return NextResponse.json(
        {
          error:
            "Could not create purchase record.",
        },
        { status: 500 }
      );
    }

    try {
      const result =
        await createProviderCheckout({
          provider,
          credentials,
          merchantReference:
            paymentConnection.merchant_reference ??
            null,
          input: {
            salonId: customer.salon_id,
            customerId:
              customer.customer_id,
            packageId: pkg.id,
            checkoutReference:
              body.checkoutReference,
            amount,
            currency: "GBP",
            description,
          },
        });

      if (result.providerCheckoutId) {
        const { error: updateError } =
          await supabaseAdmin
            .from("purchases")
            .update({
              sumup_checkout_id:
                result.providerCheckoutId,
            })
            .eq(
              "checkout_reference",
              body.checkoutReference
            )
            .eq(
              "salon_id",
              customer.salon_id
            );

        if (updateError) {
          console.error(
            "Could not save provider checkout ID:",
            updateError
          );
        }
      }

      if ("secureData" in result && result.secureData) {
  if (!createdPurchase?.id) {
    throw new Error(
      "Could not link secure payment verification data to the purchase."
    );
  }

  const secureData = result.secureData as {
  provider: "opayo";
  registrationId: string;
  hmacKey: string;
  hmacAlgorithm: string;
  expiry: string;
};

  const { error: secretError } = await supabaseAdmin
    .from("payment_checkout_secrets")
    .insert({
      purchase_id: createdPurchase.id,
      salon_id: customer.salon_id,
      provider: secureData.provider,
      registration_id: secureData.registrationId,
      hmac_key: secureData.hmacKey,
      hmac_algorithm: secureData.hmacAlgorithm,
      expires_at: secureData.expiry,
    });

  if (secretError) {
    console.error(
      "Could not save secure checkout verification data:",
      secretError
    );

    throw new Error(
      "Could not secure the payment checkout."
    );
  }

  return NextResponse.json({
    provider,
    type: result.type,
    checkoutUrl: result.checkoutUrl,
    providerCheckoutId: result.providerCheckoutId,
  });
}

return NextResponse.json({
  provider,
  ...result,
});
    } catch (providerError) {
      console.error(
        `${provider} checkout connector failed:`,
        providerError
      );

      await supabaseAdmin
        .from("purchases")
        .update({
          payment_status: "failed",
        })
        .eq(
          "checkout_reference",
          body.checkoutReference
        )
        .eq(
          "salon_id",
          customer.salon_id
        );

      return NextResponse.json(
        {
          error:
            providerError instanceof Error
              ? providerError.message
              : "Payment provider checkout failed.",
          provider,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error(
      "Generic payment checkout route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected payment checkout error.",
      },
      { status: 500 }
    );
  }
}
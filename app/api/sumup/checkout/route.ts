import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CheckoutRequest = {
  packageId?: number;
  checkoutReference?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequest;
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

    if (!body.packageId || !body.checkoutReference) {
      return NextResponse.json(
        { error: "Missing checkout information." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("customer_id, salon_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed:", profileError);

      return NextResponse.json(
        { error: "Could not load customer profile." },
        { status: 500 }
      );
    }

    if (!profile?.salon_id) {
      return NextResponse.json(
        { error: "Customer salon could not be determined." },
        { status: 400 }
      );
    }

    let customerQuery = supabaseAdmin
      .from("customers")
      .select("customer_id, vip_expires_at, salon_id")
      .eq("salon_id", profile.salon_id);

    if (profile.customer_id) {
      customerQuery = customerQuery.eq(
        "customer_id",
        profile.customer_id
      );
    } else {
      customerQuery = customerQuery.eq("email", user.email);
    }

    const { data: customer, error: customerError } =
      await customerQuery.maybeSingle();

    if (customerError) {
      console.error("Customer lookup failed:", customerError);

      return NextResponse.json(
        { error: "Could not load customer." },
        { status: 500 }
      );
    }

    if (!customer?.salon_id) {
      console.error("Customer salon could not be determined.");

      return NextResponse.json(
        { error: "Could not determine customer salon." },
        { status: 500 }
      );
    }

    const [
      { data: pkg, error: packageError },
      { data: vipSettings, error: vipError },
      { data: salonSettings, error: salonSettingsError },
      {
        data: paymentConnection,
        error: paymentConnectionError,
      },
    ] = await Promise.all([
      supabaseAdmin
        .from("packages")
        .select("id, name, minutes, price, expiry_days, active")
        .eq("id", body.packageId)
        .eq("salon_id", customer.salon_id)
        .eq("active", true)
        .gte("minutes", 30)
        .maybeSingle(),

      supabaseAdmin
        .from("vip_settings")
        .select("discount_percent, course_expiry_days")
        .eq("salon_id", customer.salon_id)
        .maybeSingle(),

      supabaseAdmin
        .from("salon_settings")
        .select("salon_id")
        .eq("salon_id", customer.salon_id)
        .maybeSingle(),

      supabaseAdmin
        .from("salon_payment_connections")
        .select(
          "provider, connection_status, merchant_reference, credentials_secret_id"
        )
        .eq("salon_id", customer.salon_id)
        .maybeSingle(),
    ]);

    if (packageError) {
      console.error("Package lookup failed:", packageError);

      return NextResponse.json(
        { error: "Could not load package." },
        { status: 500 }
      );
    }

    if (vipError) {
      console.error("VIP settings lookup failed:", vipError);

      return NextResponse.json(
        { error: "Could not load VIP settings." },
        { status: 500 }
      );
    }

    if (salonSettingsError) {
      console.error(
        "Salon settings lookup failed:",
        salonSettingsError
      );

      return NextResponse.json(
        { error: "Could not load salon settings." },
        { status: 500 }
      );
    }

    if (paymentConnectionError) {
      console.error(
        "Payment connection lookup failed:",
        paymentConnectionError
      );

      return NextResponse.json(
        { error: "Could not load salon payment connection." },
        { status: 500 }
      );
    }

    if (!pkg) {
      return NextResponse.json(
        { error: "Package is unavailable." },
        { status: 404 }
      );
    }

    if (!salonSettings?.salon_id) {
      return NextResponse.json(
        { error: "Salon configuration is missing." },
        { status: 500 }
      );
    }

    if (
      !paymentConnection ||
      paymentConnection.connection_status !== "connected"
    ) {
      return NextResponse.json(
        {
          error:
            "Online payments are not currently configured for this salon.",
        },
        { status: 400 }
      );
    }

    if (paymentConnection.provider !== "sumup") {
      return NextResponse.json(
        {
          error:
            "This salon is configured to use a different payment provider.",
        },
        { status: 400 }
      );
    }

    if (paymentConnection.merchant_reference !== "legacy_env") {
      return NextResponse.json(
        {
          error:
            "This salon's SumUp connection is not yet fully configured.",
        },
        { status: 400 }
      );
    }

    const sumupApiKey = process.env.SUMUP_API_KEY;
    const sumupMerchantCode = process.env.SUMUP_MERCHANT_CODE;

    if (!sumupApiKey || !sumupMerchantCode) {
      console.error("Legacy SumUp environment credentials are missing.");

      return NextResponse.json(
        { error: "Salon payment connection is unavailable." },
        { status: 500 }
      );
    }

    const isVip =
      !!customer.vip_expires_at &&
      new Date(customer.vip_expires_at) > new Date();

    const amount =
      isVip && vipSettings
        ? Number(
            (
              Number(pkg.price) *
              (1 - Number(vipSettings.discount_percent) / 100)
            ).toFixed(2)
          )
        : Number(pkg.price);

    const expiryDays =
      isVip && vipSettings
        ? Number(vipSettings.course_expiry_days)
        : Number(pkg.expiry_days ?? 30);

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiryDays);

    const description = `${pkg.minutes} Minute Package${
      isVip ? " - VIP" : ""
    }`;

    const { error: purchaseError } = await supabaseAdmin
      .from("purchases")
      .insert({
        salon_id: customer.salon_id,
        customer_id: customer.customer_id,
        package_id: pkg.id,
        minutes_added: pkg.minutes,
        amount_paid: amount,
        expiry_date: expiry.toISOString().split("T")[0],
        payment_provider: paymentConnection.provider,
        checkout_reference: body.checkoutReference,
        payment_status: "pending",
      });

    if (purchaseError) {
      console.error("Purchase insert failed:", purchaseError);

      return NextResponse.json(
        {
          error: "Could not create purchase record.",
          details: purchaseError.message,
        },
        { status: 500 }
      );
    }

    const sumupResponse = await fetch(
      "https://api.sumup.com/v0.1/checkouts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sumupApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkout_reference: body.checkoutReference,
          amount,
          currency: "GBP",
          merchant_code: sumupMerchantCode,
          description,

          hosted_checkout: {
            enabled: true,
          },

          return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/sumup/webhook`,

          redirect_url:
            `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success` +
            `?checkoutReference=${body.checkoutReference}`,
        }),
      }
    );

    const data = await sumupResponse.json();

    if (!sumupResponse.ok) {
      console.error("SumUp checkout failed:", data);

      await supabaseAdmin
        .from("purchases")
        .update({
          payment_status: "failed",
        })
        .eq("checkout_reference", body.checkoutReference)
        .eq("salon_id", customer.salon_id);

      return NextResponse.json(
        {
          error: "Could not create SumUp checkout.",
          details: data,
        },
        { status: sumupResponse.status }
      );
    }

    if (data.id) {
      const { error: checkoutUpdateError } = await supabaseAdmin
        .from("purchases")
        .update({
          sumup_checkout_id: data.id,
        })
        .eq("checkout_reference", body.checkoutReference)
        .eq("salon_id", customer.salon_id);

      if (checkoutUpdateError) {
        console.error(
          "Could not save SumUp checkout ID:",
          checkoutUpdateError
        );
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Checkout route failed:", error);

    return NextResponse.json(
      { error: "Unexpected checkout error." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    if (!body.checkoutReference) {
  return NextResponse.json(
    { error: "Missing VIP checkout information." },
    { status: 400 }
  );
}

   const { data: profile, error: profileError } = await supabaseAdmin
  .from("profiles")
  .select("customer_id, salon_id")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("VIP checkout profile lookup failed:", profileError);

  return NextResponse.json(
    { error: "Could not load customer profile." },
    { status: 500 }
  );
}

if (!profile?.salon_id) {
  return NextResponse.json(
    { error: "Could not determine customer salon." },
    { status: 400 }
  );
}

let customerQuery = supabaseAdmin
  .from("customers")
  .select("customer_id, salon_id")
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
  console.error("VIP checkout customer lookup failed:", customerError);

  return NextResponse.json(
    { error: "Could not load customer account." },
    { status: 500 }
  );
}

if (!customer) {
  return NextResponse.json(
    { error: "Customer account was not found for this salon." },
    { status: 404 }
  );
}

const { data: vipSettings, error: settingsError } = await supabaseAdmin
  .from("vip_settings")
  .select("price, duration_days")
  .eq("salon_id", customer.salon_id)
  .maybeSingle();

if (settingsError || !vipSettings) {
  console.error("VIP settings load failed:", settingsError);

  return NextResponse.json(
    { error: "Could not load VIP membership settings." },
    { status: 500 }
  );
}
const {
  data: salonSettings,
  error: salonSettingsError,
} = await supabaseAdmin
  .from("salon_settings")
  .select("payment_provider")
  .eq("salon_id", customer.salon_id)
  .maybeSingle();

if (salonSettingsError) {
  console.error(
    "VIP checkout salon settings lookup failed:",
    salonSettingsError
  );

  return NextResponse.json(
    { error: "Could not load salon payment settings." },
    { status: 500 }
  );
}

if (salonSettings?.payment_provider !== "sumup") {
  return NextResponse.json(
    {
      error:
        "Online VIP payments are not currently available for this salon.",
    },
    { status: 400 }
  );
}

    const normalPrice = Number(vipSettings.price);

    
      const checkoutAmount = normalPrice;

    const startedAt = new Date();

    const expiresAt = new Date(startedAt);
    expiresAt.setDate(
      expiresAt.getDate() + Number(vipSettings.duration_days)
    );

    const { error: membershipError } = await supabaseAdmin
  .from("vip_memberships")
  .insert({
    customer_id: customer.customer_id,
    amount_paid: checkoutAmount,
    checkout_reference: body.checkoutReference,
    payment_status: "pending",
    expires_at: expiresAt.toISOString(),
    salon_id: customer.salon_id,
  });

    if (membershipError) {
      console.error("VIP membership insert failed:", membershipError);

      return NextResponse.json(
        {
          error: "Could not create VIP membership record.",
          details: membershipError.message,
        },
        { status: 500 }
      );
    }

    const sumupResponse = await fetch(
      "https://api.sumup.com/v0.1/checkouts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkout_reference: body.checkoutReference,
          amount: checkoutAmount,
          currency: "GBP",
          merchant_code: process.env.SUMUP_MERCHANT_CODE,
          description: "VIP Membership",

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
  console.error("SumUp VIP checkout failed:", data);

  return NextResponse.json(
    {
      error: "SumUp could not create the VIP checkout.",
      details: data,
    },
    { status: sumupResponse.status }
  );
}

if (!data.hosted_checkout_url || !data.id) {
  console.error("SumUp returned incomplete checkout data:", data);

  return NextResponse.json(
    { error: "SumUp did not return a complete checkout." },
    { status: 500 }
  );
}

const { error: checkoutUpdateError } = await supabaseAdmin
  .from("vip_memberships")
  .update({
    sumup_checkout_id: data.id,
  })
  .eq("checkout_reference", body.checkoutReference)
  .eq("salon_id", customer.salon_id);

if (checkoutUpdateError) {
  console.error(
    "VIP checkout ID update failed:",
    checkoutUpdateError
  );

  return NextResponse.json(
    { error: "Could not save the VIP checkout ID." },
    { status: 500 }
  );
}

return NextResponse.json({
  checkoutUrl: data.hosted_checkout_url,
});
  } catch (error) {
    console.error("VIP checkout route failed:", error);

    return NextResponse.json(
      { error: "Unable to start VIP checkout." },
      { status: 500 }
    );
  }
}
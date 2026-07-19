import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CheckoutRequest = {
  customerId?: string;
  packageId?: number;
  checkoutReference?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequest;

    if (!body.customerId || !body.packageId || !body.checkoutReference) {
      return NextResponse.json(
        { error: "Missing checkout information." },
        { status: 400 }
      );
    }

    const [
      { data: pkg, error: packageError },
      { data: customer, error: customerError },
      { data: vipSettings, error: vipError },
    ] = await Promise.all([
      supabaseAdmin
        .from("packages")
        .select("id, name, minutes, price, expiry_days, active")
        .eq("id", body.packageId)
        .eq("active", true)
        .gte("minutes", 30)
        .maybeSingle(),

      supabaseAdmin
        .from("customers")
        .select("customer_id, vip_expires_at")
        .eq("customer_id", body.customerId)
        .maybeSingle(),

      supabaseAdmin
        .from("vip_settings")
        .select("discount_percent, course_expiry_days")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (packageError) {
      console.error("Package lookup failed:", packageError);

      return NextResponse.json(
        { error: "Could not load package." },
        { status: 500 }
      );
    }

    if (customerError) {
      console.error("Customer lookup failed:", customerError);

      return NextResponse.json(
        { error: "Could not load customer." },
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

    if (!pkg) {
      return NextResponse.json(
        { error: "Package is unavailable." },
        { status: 404 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Customer account was not found." },
        { status: 404 }
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
        customer_id: customer.customer_id,
        package_id: pkg.id,
        minutes_added: pkg.minutes,
        amount_paid: amount,
        expiry_date: expiry.toISOString().split("T")[0],
        payment_provider: "sumup",
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
          Authorization: `Bearer ${process.env.SUMUP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkout_reference: body.checkoutReference,
          amount,
          currency: "GBP",
          merchant_code: process.env.SUMUP_MERCHANT_CODE,
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
        .eq("checkout_reference", body.checkoutReference);

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
        .eq("checkout_reference", body.checkoutReference);

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
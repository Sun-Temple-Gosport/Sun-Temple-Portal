import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type DefaultTerminalRequest = {
  readerId?: string;
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
        "SumUp default terminal profile lookup failed:",
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

    const body =
      (await request.json()) as DefaultTerminalRequest;

    const readerId = String(
  body.readerId ?? ""
).trim();

if (!readerId) {
  return NextResponse.json(
    { error: "A SumUp reader ID is required." },
    { status: 400 }
  );
}

    const { data: terminal, error: terminalError } =
      await supabaseAdmin
        .from("salon_payment_terminals")
        .select("id, provider")
        .eq("provider_terminal_id", readerId)
        .eq("salon_id", profile.salon_id)
        .eq("provider", "sumup")
        .maybeSingle();

    if (terminalError) {
      console.error(
        "SumUp default terminal lookup failed:",
        terminalError
      );

      return NextResponse.json(
        { error: "Could not load that terminal." },
        { status: 500 }
      );
    }

    if (!terminal) {
      return NextResponse.json(
        {
          error:
            "That SumUp terminal does not belong to this salon.",
        },
        { status: 404 }
      );
    }

    const { error: clearDefaultError } =
      await supabaseAdmin
        .from("salon_payment_terminals")
        .update({
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        .eq("salon_id", profile.salon_id)
        .eq("provider", "sumup")
        .eq("is_default", true);

    if (clearDefaultError) {
      console.error(
        "SumUp default terminal clear failed:",
        clearDefaultError
      );

      return NextResponse.json(
        {
          error:
            "Could not update the salon's default terminal.",
        },
        { status: 500 }
      );
    }

    const { error: setDefaultError } =
      await supabaseAdmin
        .from("salon_payment_terminals")
        .update({
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", terminal.id)
        .eq("salon_id", profile.salon_id);

    if (setDefaultError) {
      console.error(
        "SumUp default terminal update failed:",
        setDefaultError
      );

      return NextResponse.json(
        {
          error:
            "Could not make that terminal the default.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      terminalId: terminal.id,
    });
  } catch (error) {
    console.error(
      "SumUp default terminal route failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected SumUp default terminal error.",
      },
      { status: 500 }
    );
  }
}
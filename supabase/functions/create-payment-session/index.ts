import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function cleanPhone(phone: string) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function cleanVendorId(userId: string) {
  return `qb_${String(userId || "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 40)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const cashfreeClientId = Deno.env.get("CASHFREE_CLIENT_ID");
    const cashfreeClientSecret = Deno.env.get("CASHFREE_CLIENT_SECRET");
    const cashfreeEnv = Deno.env.get("CASHFREE_ENV") || "sandbox";

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !cashfreeClientId ||
      !cashfreeClientSecret
    ) {
      return jsonResponse(
        {
          error: "Missing required environment variables",
        },
        500
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Missing Authorization header",
        },
        401
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: "Unauthorized user",
        },
        401
      );
    }

    const { data: sellerProfile, error: profileError } = await supabase
      .from("seller_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse(
        {
          error: profileError.message,
        },
        400
      );
    }

    if (!sellerProfile) {
      return jsonResponse(
        {
          error: "Seller payment profile not found",
        },
        404
      );
    }

    if (sellerProfile.cashfree_vendor_id) {
      return jsonResponse({
        success: true,
        message: "Vendor already exists",
        vendor_id: sellerProfile.cashfree_vendor_id,
      });
    }

    const phone = cleanPhone(sellerProfile.phone);
    const vendorId = cleanVendorId(user.id);

    if (
      !sellerProfile.seller_name ||
      !phone ||
      !sellerProfile.bank_account_holder ||
      !sellerProfile.bank_account_number ||
      !sellerProfile.ifsc_code ||
      !sellerProfile.pan_number
    ) {
      return jsonResponse(
        {
          error: "Seller profile is incomplete",
        },
        400
      );
    }

    const cashfreeBaseUrl =
      cashfreeEnv === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const vendorPayload = {
      vendor_id: vendorId,
      status: "ACTIVE",
      name: sellerProfile.seller_name,
      email: user.email,
      phone,
      verify_account: true,
      dashboard_access: false,
      kyc_details: {
        account_type: "BUSINESS",
        business_type: "INDIVIDUAL",
        pan: String(sellerProfile.pan_number || "").toUpperCase(),
      },
      bank: {
        account_number: sellerProfile.bank_account_number,
        account_holder: sellerProfile.bank_account_holder,
        ifsc: String(sellerProfile.ifsc_code || "").toUpperCase(),
      },
      upi: sellerProfile.upi_id || undefined,
    };

    const cashfreeResponse = await fetch(`${cashfreeBaseUrl}/easy-split/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2025-01-01",
        "x-client-id": cashfreeClientId,
        "x-client-secret": cashfreeClientSecret,
      },
      body: JSON.stringify(vendorPayload),
    });

    const cashfreeResult = await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      return jsonResponse(
        {
          error: "Cashfree vendor creation failed",
          details: cashfreeResult,
        },
        cashfreeResponse.status
      );
    }

    const returnedVendorId = cashfreeResult.vendor_id || vendorId;

    const { error: updateError } = await supabase
      .from("seller_profiles")
      .update({
        cashfree_vendor_id: returnedVendorId,
        cashfree_vendor_status: cashfreeResult.status || "created",
        kyc_status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      return jsonResponse(
        {
          error: updateError.message,
        },
        400
      );
    }

    return jsonResponse({
      success: true,
      vendor_id: returnedVendorId,
      cashfree: cashfreeResult,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      500
    );
  }
});
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const GENERIC_LOGIN_ERROR =
  "Invalid mobile number or password.";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}

function normalizePhone(value: unknown) {
  let digits = String(
    value || ""
  ).replace(/\D/g, "");

  if (
    digits.length === 12 &&
    digits.startsWith("91")
  ) {
    digits = digits.slice(2);
  }

  if (
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    digits = digits.slice(1);
  }

  return digits;
}

function buildPhoneCandidates(
  phone: string
) {
  const localPhone =
    normalizePhone(phone);

  return Array.from(
    new Set([
      localPhone,
      `91${localPhone}`,
      `+91${localPhone}`,
      `0${localPhone}`,
    ])
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        error:
          "Method not allowed.",
      },
      405
    );
  }

  try {
    const requestBody =
      await request.json();

    const phone =
      normalizePhone(
        requestBody?.phone
      );

    const password = String(
      requestBody?.password || ""
    );

    if (
      phone.length !== 10 ||
      !password
    ) {
      return jsonResponse(
        {
          error:
            GENERIC_LOGIN_ERROR,
        },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      console.error(
        "Required Supabase environment variables are missing."
      );

      return jsonResponse(
        {
          error:
            "Login service is not configured.",
        },
        500
      );
    }

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

    const authClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

    const phoneCandidates =
      buildPhoneCandidates(phone);

    const {
      data: profiles,
      error: profileError,
    } = await adminClient
      .from("profiles")
      .select("id, email, phone")
      .in(
        "phone",
        phoneCandidates
      )
      .limit(2);

    if (profileError) {
      console.error(
        "Phone profile lookup failed:",
        profileError.message
      );

      return jsonResponse(
        {
          error:
            "Login service could not check this account.",
        },
        500
      );
    }

    const matchingProfiles =
      (profiles || []).filter(
        (profile) =>
          Boolean(
            String(
              profile?.email || ""
            ).trim()
          )
      );

    /*
     * Reject both missing and duplicate
     * phone records without revealing
     * whether an account exists.
     */
    if (
      matchingProfiles.length !== 1
    ) {
      return jsonResponse(
        {
          error:
            GENERIC_LOGIN_ERROR,
        },
        401
      );
    }

    const accountEmail =
      String(
        matchingProfiles[0].email
      )
        .trim()
        .toLowerCase();

    const {
      data: loginData,
      error: loginError,
    } =
      await authClient.auth.signInWithPassword(
        {
          email: accountEmail,
          password,
        }
      );

    if (
      loginError ||
      !loginData?.session
    ) {
      return jsonResponse(
        {
          error:
            GENERIC_LOGIN_ERROR,
        },
        401
      );
    }

    return jsonResponse({
      access_token:
        loginData.session
          .access_token,

      refresh_token:
        loginData.session
          .refresh_token,
    });
  } catch (error) {
    console.error(
      "Phone login function error:",
      error
    );

    return jsonResponse(
      {
        error:
          "Login service temporarily failed.",
      },
      500
    );
  }
});
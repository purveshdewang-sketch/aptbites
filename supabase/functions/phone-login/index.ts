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

type JsonBody = Record<
  string,
  unknown
>;

type PhoneLookupRow = {
  id: string | null;
};

function jsonResponse(
  body: JsonBody,
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

function normalizePhone(
  value: unknown
) {
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

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits;
}

function getUniqueProfileIds(
  rows: PhoneLookupRow[] | null
) {
  return Array.from(
    new Set(
      (rows || [])
        .map((row) =>
          String(row?.id || "").trim()
        )
        .filter(Boolean)
    )
  );
}

Deno.serve(
  async (request: Request) => {
    if (
      request.method === "OPTIONS"
    ) {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    if (
      request.method !== "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed.",
        },
        405
      );
    }

    try {
      let requestBody: JsonBody;

      try {
        requestBody =
          await request.json();
      } catch {
        return jsonResponse(
          {
            error:
              GENERIC_LOGIN_ERROR,
          },
          401
        );
      }

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

              autoRefreshToken:
                false,

              detectSessionInUrl:
                false,
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

              autoRefreshToken:
                false,

              detectSessionInUrl:
                false,
            },
          }
        );

      /*
       * The database function removes
       * spaces, +91, leading zero,
       * hyphens and other formatting
       * before comparing the last
       * 10 digits.
       */
      const {
        data: phoneMatches,
        error: phoneLookupError,
      } = await adminClient.rpc(
        "find_profile_ids_by_normalized_phone",
        {
          input_phone: phone,
        }
      );

      if (phoneLookupError) {
        console.error(
          "Normalized phone lookup failed:",
          phoneLookupError.message
        );

        return jsonResponse(
          {
            error:
              "Login service could not check this account.",
          },
          500
        );
      }

      const profileIds =
        getUniqueProfileIds(
          phoneMatches as
            | PhoneLookupRow[]
            | null
        );

      /*
       * Reject both missing and
       * duplicate phone records with
       * the same generic error.
       */
      if (
        profileIds.length !== 1
      ) {
        console.warn(
          "Phone login lookup returned an unexpected profile count:",
          profileIds.length
        );

        return jsonResponse(
          {
            error:
              GENERIC_LOGIN_ERROR,
          },
          401
        );
      }

      const profileId =
        profileIds[0];

      /*
       * Read the authoritative email
       * from Supabase Auth rather than
       * depending on profiles.email.
       */
      const {
        data: authUserData,
        error: authUserError,
      } =
        await adminClient.auth.admin.getUserById(
          profileId
        );

      if (
        authUserError ||
        !authUserData?.user
      ) {
        console.error(
          "Auth user lookup failed:",
          authUserError?.message ||
            "Auth user not found."
        );

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
          authUserData.user.email ||
            ""
        )
          .trim()
          .toLowerCase();

      if (!accountEmail) {
        console.error(
          "The matched Auth user has no email address."
        );

        return jsonResponse(
          {
            error:
              GENERIC_LOGIN_ERROR,
          },
          401
        );
      }

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

        expires_at:
          loginData.session
            .expires_at || null,

        token_type:
          loginData.session
            .token_type ||
          "bearer",
      });
    } catch (error) {
      console.error(
        "Phone login function error:",
        error instanceof Error
          ? error.message
          : error
      );

      return jsonResponse(
        {
          error:
            "Login service temporarily failed.",
        },
        500
      );
    }
  }
);
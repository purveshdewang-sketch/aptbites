import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  Cashfree,
  CFEnvironment,
} from "npm:cashfree-pg";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const CASHFREE_CLIENT_ID = Deno.env.get("CASHFREE_CLIENT_ID") || "";
    const CASHFREE_CLIENT_SECRET =
      Deno.env.get("CASHFREE_CLIENT_SECRET") || "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    Cashfree.XClientId = CASHFREE_CLIENT_ID;
    Cashfree.XClientSecret = CASHFREE_CLIENT_SECRET;
    Cashfree.XEnvironment = CFEnvironment.SANDBOX;

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const body = await req.json();

    const {
      customer_name,
      phone,
      flat,
      delivery_type,
      items,
      subtotal_amount,
      platform_fee,
      total_amount,
      notes,
      seller_id,
    } = body;

    const orderId = `QB_${Date.now()}`;

    const cashfreeRequest = {
      order_amount: Number(total_amount),
      order_currency: "INR",

      customer_details: {
        customer_id: `cust_${Date.now()}`,
        customer_name,
        customer_phone: String(phone),
      },

      order_meta: {
        return_url:
          "http://localhost:5173/payment-success?order_id={order_id}",
      },
    };

    const response = await Cashfree.PGCreateOrder(
      "2023-08-01",
      cashfreeRequest
    );

    const paymentSessionId =
      response.data.payment_session_id;

    const cashfreeOrderId =
      response.data.order_id;

    const { data: insertedOrder, error: insertError } =
      await supabase
        .from("orders")
        .insert([
          {
            customer_name,
            phone,
            flat,
            delivery_type,
            items,
            subtotal_amount,
            platform_fee,
            total_amount,
            notes,
            seller_id,

            payment_status: "pending",
            payment_order_id: cashfreeOrderId,
            cashfree_order_response: response.data,
          },
        ])
        .select()
        .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_session_id: paymentSessionId,
        cashfree_order_id: cashfreeOrderId,
        local_order_id: insertedOrder.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
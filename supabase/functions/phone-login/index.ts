import { createClient } from "npm:@supabase/supabase-js@2";

type RecordRow = Record<string, unknown>;

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: RecordRow | null;
  old_record?: RecordRow | null;
  mode?: string;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type NotificationSpec = {
  eventType: string;
  title: string;
  body: string;
  route: string;
  audience: "customer" | "seller" | "admin";
  channelId: string;
  sourceTable: string;
  sourceId: string;
  dedupeBase: string;
  data?: Record<string, string>;
};

const FIREBASE_SCOPE =
  "https://www.googleapis.com/auth/firebase.messaging";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const RESPONSE_FIELDS = [
  "owner_response",
  "admin_response",
  "response",
  "reply",
  "reply_message",
  "response_message",
  "resolution_note",
  "resolution",
  "owner_note",
];

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

function readText(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function lower(value: unknown) {
  return readText(value).toLowerCase();
}

function asBoolean(value: unknown) {
  return (
    value === true ||
    lower(value) === "true" ||
    readText(value) === "1"
  );
}

function money(value: unknown) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function shortId(value: unknown) {
  const clean = readText(value);

  if (!clean) return "";

  return clean.length > 8
    ? clean.slice(0, 8).toUpperCase()
    : clean.toUpperCase();
}

function truncate(
  value: unknown,
  maxLength = 120
) {
  const clean = readText(value)
    .replace(/\s+/g, " ");

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(
    0,
    Math.max(0, maxLength - 1)
  )}…`;
}

function base64UrlEncodeBytes(
  bytes: Uint8Array
) {
  let binary = "";

  for (const byte of bytes) {
    binary +=
      String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncodeText(
  value: string
) {
  return base64UrlEncodeBytes(
    new TextEncoder().encode(value)
  );
}

function pemToArrayBuffer(
  pem: string
) {
  const clean = pem
    .replace(
      /-----BEGIN PRIVATE KEY-----/g,
      ""
    )
    .replace(
      /-----END PRIVATE KEY-----/g,
      ""
    )
    .replace(/\s+/g, "");

  const binary = atob(clean);

  const bytes =
    new Uint8Array(binary.length);

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function getGoogleAccessToken(
  serviceAccount: FirebaseServiceAccount
) {
  const issuedAt =
    Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claims = {
    iss: serviceAccount.client_email,
    scope: FIREBASE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  const unsignedToken =
    `${base64UrlEncodeText(
      JSON.stringify(header)
    )}.` +
    `${base64UrlEncodeText(
      JSON.stringify(claims)
    )}`;

  const privateKey =
    await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(
        serviceAccount.private_key
      ),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(
        unsignedToken
      )
    );

  const jwt =
    `${unsignedToken}.` +
    base64UrlEncodeBytes(
      new Uint8Array(signature)
    );

  const tokenResponse =
    await fetch(
      GOOGLE_TOKEN_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type:
            "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      }
    );

  if (!tokenResponse.ok) {
    throw new Error(
      `Google OAuth failed: ${
        tokenResponse.status
      } ${await tokenResponse.text()}`
    );
  }

  const tokenData =
    await tokenResponse.json();

  if (!tokenData?.access_token) {
    throw new Error(
      "Google OAuth did not return an access token."
    );
  }

  return String(
    tokenData.access_token
  );
}

function verifyRequest(
  request: Request,
  expectedSecret: string
) {
  if (!expectedSecret) {
    return false;
  }

  const suppliedSecret =
    request.headers.get(
      "x-nefo-webhook-secret"
    ) || "";

  return suppliedSecret ===
    expectedSecret;
}

async function getProfile(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  userId: string
) {
  if (!userId) return null;

  const { data } =
    await supabaseAdmin
      .from("profiles")
      .select(
        "id, role, is_seller, full_name, seller_kitchen_name"
      )
      .eq("id", userId)
      .maybeSingle();

  return data || null;
}

async function getAdminIds(
  supabaseAdmin: ReturnType<
    typeof createClient
  >
) {
  const { data, error } =
    await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

  if (error) {
    throw new Error(
      `Could not load admin accounts: ${error.message}`
    );
  }

  return (data || [])
    .map((row) =>
      readText(row.id)
    )
    .filter(Boolean);
}

async function reserveDelivery(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  {
    dedupeKey,
    spec,
    recipientUserId,
  }: {
    dedupeKey: string;
    spec: NotificationSpec;
    recipientUserId: string;
  }
) {
  const { error } =
    await supabaseAdmin
      .from(
        "notification_delivery_log"
      )
      .insert({
        dedupe_key: dedupeKey,
        event_type:
          spec.eventType,
        recipient_user_id:
          recipientUserId,
        source_table:
          spec.sourceTable,
        source_id:
          spec.sourceId,
        delivery_status:
          "processing",
      });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new Error(
    `Could not reserve notification delivery: ${error.message}`
  );
}

async function finishDelivery(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  dedupeKey: string,
  status: string,
  sentCount: number,
  failedCount: number
) {
  await supabaseAdmin
    .from(
      "notification_delivery_log"
    )
    .update({
      delivery_status: status,
      sent_count: sentCount,
      failed_count: failedCount,
      finished_at:
        new Date().toISOString(),
    })
    .eq(
      "dedupe_key",
      dedupeKey
    );
}

async function releaseDelivery(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  dedupeKey: string
) {
  await supabaseAdmin
    .from(
      "notification_delivery_log"
    )
    .delete()
    .eq(
      "dedupe_key",
      dedupeKey
    );
}

async function sendToUser(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  serviceAccount:
    FirebaseServiceAccount,
  accessToken: string,
  recipientUserId: string,
  spec: NotificationSpec
) {
  if (!recipientUserId) {
    return {
      skipped: true,
      sent: 0,
      failed: 0,
    };
  }

  const dedupeKey =
    `${spec.dedupeBase}:user:${recipientUserId}`;

  const reserved =
    await reserveDelivery(
      supabaseAdmin,
      {
        dedupeKey,
        spec,
        recipientUserId,
      }
    );

  if (!reserved) {
    return {
      skipped: true,
      duplicate: true,
      sent: 0,
      failed: 0,
    };
  }

  const {
    data: tokenRows,
    error: tokenError,
  } = await supabaseAdmin
    .from("push_device_tokens")
    .select("token")
    .eq(
      "user_id",
      recipientUserId
    );

  if (tokenError) {
    await releaseDelivery(
      supabaseAdmin,
      dedupeKey
    );

    throw new Error(
      `Could not load push tokens: ${tokenError.message}`
    );
  }

  const tokens = [
    ...new Set(
      (tokenRows || [])
        .map((row) =>
          readText(row.token)
        )
        .filter(Boolean)
    ),
  ];

  if (tokens.length === 0) {
    await releaseDelivery(
      supabaseAdmin,
      dedupeKey
    );

    return {
      skipped: true,
      noTokens: true,
      sent: 0,
      failed: 0,
    };
  }

  const invalidTokens: string[] = [];

  let sent = 0;
  let failed = 0;

  for (const token of tokens) {
    const messageData:
      Record<string, string> = {
        type: spec.eventType,
        audience: spec.audience,
        route: spec.route,
        source_table:
          spec.sourceTable,
        source_id:
          spec.sourceId,
        ...(spec.data || {}),
      };

    const fcmResponse =
      await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
          serviceAccount.project_id
        )}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: spec.title,
                body: spec.body,
              },
              data: messageData,
              android: {
                priority: "high",
                notification: {
                  channel_id:
                    spec.channelId,
                  sound: "default",
                },
              },
            },
          }),
        }
      );

    if (fcmResponse.ok) {
      sent += 1;
      continue;
    }

    failed += 1;

    const errorBody =
      await fcmResponse.text();

    if (
      fcmResponse.status === 404 ||
      errorBody.includes(
        "UNREGISTERED"
      )
    ) {
      invalidTokens.push(token);
    }

    console.error(
      "FCM send failed:",
      fcmResponse.status,
      errorBody
    );
  }

  if (
    invalidTokens.length > 0
  ) {
    await supabaseAdmin
      .from("push_device_tokens")
      .delete()
      .in(
        "token",
        invalidTokens
      );
  }

  if (sent === 0) {
    await releaseDelivery(
      supabaseAdmin,
      dedupeKey
    );
  } else {
    await finishDelivery(
      supabaseAdmin,
      dedupeKey,
      failed > 0
        ? "partial"
        : "sent",
      sent,
      failed
    );
  }

  return {
    skipped: false,
    sent,
    failed,
    removedInvalid:
      invalidTokens.length,
  };
}

async function sendToUsers(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  serviceAccount:
    FirebaseServiceAccount,
  accessToken: string,
  userIds: string[],
  spec: NotificationSpec
) {
  const uniqueUserIds = [
    ...new Set(
      userIds.filter(Boolean)
    ),
  ];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (
    const userId of uniqueUserIds
  ) {
    const result =
      await sendToUser(
        supabaseAdmin,
        serviceAccount,
        accessToken,
        userId,
        spec
      );

    sent += result.sent || 0;
    failed +=
      result.failed || 0;

    if (result.skipped) {
      skipped += 1;
    }
  }

  return {
    users:
      uniqueUserIds.length,
    sent,
    failed,
    skipped,
  };
}

function changed(
  oldRow: RecordRow,
  newRow: RecordRow,
  key: string
) {
  return (
    JSON.stringify(
      oldRow?.[key] ?? null
    ) !==
    JSON.stringify(
      newRow?.[key] ?? null
    )
  );
}

function firstChangedResponse(
  oldRow: RecordRow,
  newRow: RecordRow
) {
  for (
    const key of RESPONSE_FIELDS
  ) {
    if (
      changed(
        oldRow,
        newRow,
        key
      )
    ) {
      return readText(
        newRow?.[key]
      );
    }
  }

  return "";
}

async function handleOrderWebhook(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  serviceAccount:
    FirebaseServiceAccount,
  accessToken: string,
  payload: WebhookPayload
) {
  const eventType =
    readText(payload.type)
      .toUpperCase();

  const record =
    payload.record || {};

  const oldRecord =
    payload.old_record || {};

  const orderId =
    readText(record.id);

  const customerId =
    readText(record.user_id);

  const sellerId =
    readText(record.seller_id);

  if (
    !orderId ||
    !customerId ||
    !sellerId
  ) {
    return {
      skipped: true,
      reason:
        "Order row is missing id/user_id/seller_id",
    };
  }

  const sellerProfile =
    await getProfile(
      supabaseAdmin,
      sellerId
    );

  const kitchenName =
    readText(
      sellerProfile
        ?.seller_kitchen_name
    ) ||
    "The kitchen";

  if (eventType === "INSERT") {
    const isScheduled =
      asBoolean(
        record.scheduled_order
      ) ||
      Boolean(
        readText(
          record.scheduled_for
        )
      );

    const spec:
      NotificationSpec = {
        eventType:
          isScheduled
            ? "scheduled_order_received"
            : "new_order",
        title:
          isScheduled
            ? "🕒 New Scheduled Order"
            : "🔔 New Order",
        body:
          `You received a ₹${money(
            record.total_amount
          )} order from ${
            readText(
              record.customer_name
            ) || "a customer"
          }.`,
        route:
          "/seller-dashboard",
        audience: "seller",
        channelId:
          isScheduled
            ? "nefo_scheduled"
            : "nefo_orders",
        sourceTable: "orders",
        sourceId: orderId,
        dedupeBase:
          `order_insert:${orderId}`,
        data: {
          order_id: orderId,
        },
      };

    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      sellerId,
      spec
    );
  }

  if (eventType !== "UPDATE") {
    return {
      skipped: true,
    };
  }

  const newResponse =
    lower(
      record.seller_response
    );

  const oldResponse =
    lower(
      oldRecord.seller_response
    );

  const newStatus =
    lower(record.status);

  const oldStatus =
    lower(oldRecord.status);

  const readyChanged =
    !asBoolean(
      oldRecord.ready_for_pickup
    ) &&
    asBoolean(
      record.ready_for_pickup
    );

  // Rejection is stored together with status=cancelled.
  // Handle it first so the seller is not notified about
  // their own rejection as though the customer cancelled.
  if (
    newResponse === "rejected" &&
    oldResponse !== "rejected"
  ) {
    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      customerId,
      {
        eventType:
          "order_rejected",
        title:
          "❌ Order Not Accepted",
        body:
          `${kitchenName} could not accept your order. Tap for details.`,
        route: "/orders",
        audience: "customer",
        channelId:
          "nefo_orders",
        sourceTable: "orders",
        sourceId: orderId,
        dedupeBase:
          `order_rejected:${orderId}`,
        data: {
          order_id: orderId,
        },
      }
    );
  }

  // If one update marks the order accepted AND ready,
  // send only the stronger "ready" notification.
  if (readyChanged) {
    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      customerId,
      {
        eventType:
          "ready_for_pickup",
        title:
          "🥡 Ready for Pickup",
        body:
          `Your order from ${kitchenName} is ready for pickup.`,
        route: "/orders",
        audience: "customer",
        channelId:
          "nefo_orders",
        sourceTable: "orders",
        sourceId: orderId,
        dedupeBase:
          `order_ready:${orderId}`,
        data: {
          order_id: orderId,
        },
      }
    );
  }

  if (
    newResponse === "accepted" &&
    oldResponse !== "accepted"
  ) {
    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      customerId,
      {
        eventType:
          "order_accepted",
        title:
          "✅ Order Accepted",
        body:
          `${kitchenName} has accepted your order.`,
        route: "/orders",
        audience: "customer",
        channelId:
          "nefo_orders",
        sourceTable: "orders",
        sourceId: orderId,
        dedupeBase:
          `order_accepted:${orderId}`,
        data: {
          order_id: orderId,
        },
      }
    );
  }

  if (
    ["completed", "delivered"]
      .includes(newStatus) &&
    !["completed", "delivered"]
      .includes(oldStatus)
  ) {
    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      customerId,
      {
        eventType:
          "order_completed",
        title:
          "✅ Order Completed",
        body:
          "Thanks for ordering on NeFo. Your completed order is now in Order History.",
        route:
          "/order-history",
        audience: "customer",
        channelId:
          "nefo_orders",
        sourceTable: "orders",
        sourceId: orderId,
        dedupeBase:
          `order_completed:${orderId}`,
        data: {
          order_id: orderId,
        },
      }
    );
  }

  if (
    newStatus === "cancelled" &&
    oldStatus !== "cancelled"
  ) {
    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      sellerId,
      {
        eventType:
          "order_cancelled",
        title:
          "⚠️ Order Cancelled",
        body:
          `The customer cancelled Order #NF${shortId(
            orderId
          )}.`,
        route:
          "/seller-dashboard",
        audience: "seller",
        channelId:
          "nefo_orders",
        sourceTable: "orders",
        sourceId: orderId,
        dedupeBase:
          `customer_cancelled:${orderId}`,
        data: {
          order_id: orderId,
        },
      }
    );
  }

  return {
    skipped: true,
    reason:
      "No notification-worthy order transition",
  };
}

async function handleMessageWebhook(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  serviceAccount:
    FirebaseServiceAccount,
  accessToken: string,
  payload: WebhookPayload
) {
  if (
    readText(payload.type)
      .toUpperCase() !==
    "INSERT"
  ) {
    return {
      skipped: true,
    };
  }

  const record =
    payload.record || {};

  const messageId =
    readText(record.id);

  const orderId =
    readText(record.order_id);

  const senderId =
    readText(record.sender_id);

  if (
    !orderId ||
    !senderId
  ) {
    return {
      skipped: true,
      reason:
        "Message row is missing order_id/sender_id",
    };
  }

  const {
    data: order,
    error,
  } = await supabaseAdmin
    .from("orders")
    .select(
      "id, user_id, seller_id, customer_name"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return {
      skipped: true,
      reason:
        error?.message ||
        "Order not found for chat message",
    };
  }

  const customerId =
    readText(order.user_id);

  const sellerId =
    readText(order.seller_id);

  let recipientId = "";
  let audience:
    "customer" | "seller" =
    "customer";

  if (senderId === sellerId) {
    recipientId = customerId;
    audience = "customer";
  } else if (
    senderId === customerId
  ) {
    recipientId = sellerId;
    audience = "seller";
  } else {
    return {
      skipped: true,
      reason:
        "Message sender is not an order participant",
    };
  }

  const senderProfile =
    await getProfile(
      supabaseAdmin,
      senderId
    );

  const senderName =
    senderId === sellerId
      ? readText(
          senderProfile
            ?.seller_kitchen_name
        ) || "Kitchen"
      : readText(
          order.customer_name
        ) || "Customer";

  return await sendToUser(
    supabaseAdmin,
    serviceAccount,
    accessToken,
    recipientId,
    {
      eventType:
        "order_message",
      title:
        `💬 New message from ${senderName}`,
      body:
        truncate(
          record.message,
          120
        ) || "You have a new order message.",
      route:
        `/order-chat/${encodeURIComponent(
          orderId
        )}`,
      audience,
      channelId:
        "nefo_messages",
      sourceTable:
        "order_messages",
      sourceId:
        messageId || orderId,
      dedupeBase:
        `order_message:${
          messageId ||
          `${orderId}:${readText(
            record.created_at
          )}`
        }`,
      data: {
        order_id: orderId,
      },
    }
  );
}

async function handleSellerApplicationWebhook(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  serviceAccount:
    FirebaseServiceAccount,
  accessToken: string,
  payload: WebhookPayload
) {
  const eventType =
    readText(payload.type)
      .toUpperCase();

  const record =
    payload.record || {};

  const oldRecord =
    payload.old_record || {};

  const applicationId =
    readText(record.id);

  const applicantId =
    readText(record.user_id);

  const newStatus =
    lower(record.status);

  const oldStatus =
    lower(oldRecord.status);

  const kitchenName =
    readText(
      record.kitchen_name
    ) ||
    readText(
      record.full_name
    ) ||
    "A new kitchen";

  if (
    eventType === "INSERT" &&
    newStatus === "pending"
  ) {
    const adminIds =
      await getAdminIds(
        supabaseAdmin
      );

    return await sendToUsers(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      adminIds,
      {
        eventType:
          "seller_application_submitted",
        title:
          "🔔 New Seller Application",
        body:
          `${kitchenName} has applied to sell on NeFo. Tap to review.`,
        route:
          "/owner-seller-applications",
        audience: "admin",
        channelId:
          "nefo_owner_alerts",
        sourceTable:
          "seller_applications",
        sourceId:
          applicationId,
        dedupeBase:
          `seller_application_new:${applicationId}`,
        data: {
          application_id:
            applicationId,
        },
      }
    );
  }

  if (
    eventType !== "UPDATE"
  ) {
    return {
      skipped: true,
    };
  }

  if (
    newStatus === "pending" &&
    oldStatus !== "pending"
  ) {
    const adminIds =
      await getAdminIds(
        supabaseAdmin
      );

    return await sendToUsers(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      adminIds,
      {
        eventType:
          "seller_reapplication",
        title:
          "🔔 Seller Re-application",
        body:
          `${kitchenName} has re-applied to sell on NeFo. Tap to review.`,
        route:
          "/owner-seller-applications",
        audience: "admin",
        channelId:
          "nefo_owner_alerts",
        sourceTable:
          "seller_applications",
        sourceId:
          applicationId,
        dedupeBase:
          `seller_reapplication:${applicationId}:${readText(
            record.reviewed_at
          ) || "pending"}`,
        data: {
          application_id:
            applicationId,
        },
      }
    );
  }

  if (
    newStatus === "approved" &&
    oldStatus !== "approved" &&
    applicantId
  ) {
    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      applicantId,
      {
        eventType:
          "seller_application_approved",
        title:
          "✅ Seller Application Approved",
        body:
          "Your NeFo seller application has been approved. You can continue your seller setup.",
        route:
          "/seller-registration",
        audience: "seller",
        channelId:
          "nefo_owner_alerts",
        sourceTable:
          "seller_applications",
        sourceId:
          applicationId,
        dedupeBase:
          `seller_application_approved:${applicationId}`,
        data: {
          application_id:
            applicationId,
        },
      }
    );
  }

  if (
    newStatus === "rejected" &&
    oldStatus !== "rejected" &&
    applicantId
  ) {
    const reason =
      truncate(
        record.rejection_reason,
        90
      );

    return await sendToUser(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      applicantId,
      {
        eventType:
          "seller_application_rejected",
        title:
          "Seller Application Update",
        body:
          reason
            ? `Your application needs changes: ${reason}`
            : "Your seller application needs changes. Tap to review.",
        route:
          "/seller-registration",
        audience: "seller",
        channelId:
          "nefo_owner_alerts",
        sourceTable:
          "seller_applications",
        sourceId:
          applicationId,
        dedupeBase:
          `seller_application_rejected:${applicationId}:${readText(
            record.reviewed_at
          ) || "rejected"}`,
        data: {
          application_id:
            applicationId,
        },
      }
    );
  }

  return {
    skipped: true,
    reason:
      "No notification-worthy seller application transition",
  };
}

async function handleSupportWebhook(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  serviceAccount:
    FirebaseServiceAccount,
  accessToken: string,
  payload: WebhookPayload
) {
  const eventType =
    readText(payload.type)
      .toUpperCase();

  const record =
    payload.record || {};

  const oldRecord =
    payload.old_record || {};

  const ticketId =
    readText(record.id);

  const ticketUserId =
    readText(record.user_id);

  if (
    !ticketId ||
    !ticketUserId
  ) {
    return {
      skipped: true,
      reason:
        "Support ticket is missing id/user_id",
    };
  }

  const ticketUserProfile =
    await getProfile(
      supabaseAdmin,
      ticketUserId
    );

  const ticketUserRole =
    lower(
      ticketUserProfile?.role
    );

  const ticketFromSeller =
    ticketUserRole === "seller" ||
    ticketUserRole === "admin" ||
    ticketUserProfile
      ?.is_seller === true;

  if (eventType === "INSERT") {
    const adminIds =
      await getAdminIds(
        supabaseAdmin
      );

    return await sendToUsers(
      supabaseAdmin,
      serviceAccount,
      accessToken,
      adminIds,
      {
        eventType:
          "new_support_ticket",
        title:
          ticketFromSeller
            ? "🎫 New Seller Support Ticket"
            : "🎫 New Support Request",
        body:
          `${readText(
            ticketUserProfile
              ?.full_name
          ) || "A NeFo user"} needs assistance${
            readText(
              record.issue_type
            )
              ? ` with ${readText(
                  record.issue_type
                ).replaceAll(
                  "_",
                  " "
                )}`
              : ""
          }.`,
        route:
          "/owner-support-tickets",
        audience: "admin",
        channelId:
          "nefo_owner_alerts",
        sourceTable:
          "support_tickets",
        sourceId:
          ticketId,
        dedupeBase:
          `support_ticket_new:${ticketId}`,
        data: {
          ticket_id:
            ticketId,
        },
      }
    );
  }

  if (eventType !== "UPDATE") {
    return {
      skipped: true,
    };
  }

  const oldStatus =
    lower(oldRecord.status);

  const newStatus =
    lower(record.status);

  const statusChanged =
    oldStatus !== newStatus;

  const responseText =
    firstChangedResponse(
      oldRecord,
      record
    );

  if (
    !statusChanged &&
    !responseText
  ) {
    return {
      skipped: true,
      reason:
        "Support update did not change status/response fields",
    };
  }

  const resolved =
    ["resolved", "closed"]
      .includes(newStatus);

  const route =
    ticketFromSeller
      ? "/seller-helper"
      : "/care-agent";

  const body =
    responseText
      ? truncate(
          responseText,
          120
        )
      : resolved
      ? "Your NeFo support ticket has been resolved."
      : `Your support ticket status is now ${
          newStatus
            .replaceAll("_", " ") ||
          "updated"
        }.`;

  return await sendToUser(
    supabaseAdmin,
    serviceAccount,
    accessToken,
    ticketUserId,
    {
      eventType:
        "support_update",
      title:
        resolved
          ? "✅ Support Ticket Resolved"
          : "💬 NeFo Support Update",
      body,
      route,
      audience:
        ticketFromSeller
          ? "seller"
          : "customer",
      channelId:
        "nefo_support",
      sourceTable:
        "support_tickets",
      sourceId:
        ticketId,
      dedupeBase:
        `support_update:${ticketId}:${newStatus}:${readText(
          record.updated_at
        ) || readText(
          record.reviewed_at
        ) || truncate(
          responseText,
          50
        ) || "update"}`,
      data: {
        ticket_id:
          ticketId,
      },
    }
  );
}

async function handleScheduledReminders(
  supabaseAdmin: ReturnType<
    typeof createClient
  >,
  serviceAccount:
    FirebaseServiceAccount,
  accessToken: string
) {
  const now =
    new Date();

  // Cron is intended to run every 5 minutes.
  // Catch orders whose scheduled time is roughly 30 minutes away.
  const lowerBound =
    new Date(
      now.getTime() +
        25 * 60 * 1000
    );

  const upperBound =
    new Date(
      now.getTime() +
        35 * 60 * 1000
    );

  const {
    data: orders,
    error,
  } = await supabaseAdmin
    .from("orders")
    .select(
      "id, seller_id, user_id, customer_name, scheduled_for, scheduled_order, status, seller_response, total_amount"
    )
    .eq(
      "scheduled_order",
      true
    )
    .gte(
      "scheduled_for",
      lowerBound.toISOString()
    )
    .lte(
      "scheduled_for",
      upperBound.toISOString()
    );

  if (error) {
    throw new Error(
      `Could not load scheduled orders: ${error.message}`
    );
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (
    const order of orders || []
  ) {
    const status =
      lower(order.status);

    const sellerResponse =
      lower(
        order.seller_response
      );

    if (
      [
        "cancelled",
        "completed",
        "delivered",
      ].includes(status) ||
      sellerResponse ===
        "rejected"
    ) {
      skipped += 1;
      continue;
    }

    const sellerId =
      readText(
        order.seller_id
      );

    if (!sellerId) {
      skipped += 1;
      continue;
    }

    const scheduledDate =
      new Date(
        readText(
          order.scheduled_for
        )
      );

    const scheduledLabel =
      Number.isNaN(
        scheduledDate.getTime()
      )
        ? "soon"
        : scheduledDate.toLocaleTimeString(
            "en-IN",
            {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone:
                "Asia/Kolkata",
            }
          );

    const result =
      await sendToUser(
        supabaseAdmin,
        serviceAccount,
        accessToken,
        sellerId,
        {
          eventType:
            "scheduled_order_reminder",
          title:
            "⏰ Scheduled Order Soon",
          body:
            `Order #NF${shortId(
              order.id
            )} for ${scheduledLabel} is coming up in about 30 minutes.`,
          route:
            "/seller-dashboard",
          audience:
            "seller",
          channelId:
            "nefo_scheduled",
          sourceTable:
            "orders",
          sourceId:
            readText(
              order.id
            ),
          dedupeBase:
            `scheduled_seller_30m:${readText(
              order.id
            )}`,
          data: {
            order_id:
              readText(
                order.id
              ),
          },
        }
      );

    sent += result.sent || 0;
    failed +=
      result.failed || 0;

    if (result.skipped) {
      skipped += 1;
    }
  }

  return {
    checked:
      (orders || []).length,
    sent,
    failed,
    skipped,
  };
}

Deno.serve(
  async (request) => {
    if (
      request.method !== "POST"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed",
        },
        405
      );
    }

    const webhookSecret =
      Deno.env.get(
        "NEFO_WEBHOOK_SECRET"
      ) || "";

    if (
      !verifyRequest(
        request,
        webhookSecret
      )
    ) {
      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    const firebaseJson =
      Deno.env.get(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !firebaseJson
    ) {
      return jsonResponse(
        {
          error:
            "Missing Supabase/Firebase server secrets.",
        },
        500
      );
    }

    let serviceAccount:
      FirebaseServiceAccount;

    try {
      serviceAccount =
        JSON.parse(
          firebaseJson
        );
    } catch {
      return jsonResponse(
        {
          error:
            "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.",
        },
        500
      );
    }

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      return jsonResponse(
        {
          error:
            "Firebase service account JSON is incomplete.",
        },
        500
      );
    }

    let payload:
      WebhookPayload;

    try {
      payload =
        await request.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON payload",
        },
        400
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );

    try {
      const accessToken =
        await getGoogleAccessToken(
          serviceAccount
        );

      if (
        readText(
          payload.mode
        ) ===
        "scheduled_reminders"
      ) {
        const result =
          await handleScheduledReminders(
            supabaseAdmin,
            serviceAccount,
            accessToken
          );

        return jsonResponse({
          ok: true,
          mode:
            "scheduled_reminders",
          ...result,
        });
      }

      const table =
        readText(
          payload.table
        );

      const schema =
        readText(
          payload.schema ||
            "public"
        );

      if (
        schema !== "public"
      ) {
        return jsonResponse({
          ok: true,
          skipped: true,
          reason:
            "Non-public schema",
        });
      }

      let result:
        Record<string, unknown>;

      if (
        table === "orders"
      ) {
        result =
          await handleOrderWebhook(
            supabaseAdmin,
            serviceAccount,
            accessToken,
            payload
          );
      } else if (
        table ===
        "order_messages"
      ) {
        result =
          await handleMessageWebhook(
            supabaseAdmin,
            serviceAccount,
            accessToken,
            payload
          );
      } else if (
        table ===
        "seller_applications"
      ) {
        result =
          await handleSellerApplicationWebhook(
            supabaseAdmin,
            serviceAccount,
            accessToken,
            payload
          );
      } else if (
        table ===
        "support_tickets"
      ) {
        result =
          await handleSupportWebhook(
            supabaseAdmin,
            serviceAccount,
            accessToken,
            payload
          );
      } else {
        result = {
          skipped: true,
          reason:
            `Unsupported table: ${table}`,
        };
      }

      return jsonResponse({
        ok: true,
        table,
        event:
          readText(
            payload.type
          ),
        ...result,
      });
    } catch (error) {
      console.error(
        "NeFo notification function failed:",
        error
      );

      return jsonResponse(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
        500
      );
    }
  }
);

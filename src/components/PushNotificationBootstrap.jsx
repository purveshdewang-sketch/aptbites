import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const ORDER_CHANNEL_ID = "nefo_orders";
const MESSAGE_CHANNEL_ID = "nefo_messages";
const OWNER_CHANNEL_ID = "nefo_owner_alerts";
const SUPPORT_CHANNEL_ID = "nefo_support";
const SCHEDULED_CHANNEL_ID = "nefo_scheduled";

const PUSH_TOKEN_STORAGE_KEY = "NeFo_push_token";
const PUSH_TOKEN_USER_STORAGE_KEY = "NeFo_push_token_user_id";
const PENDING_PUSH_ROUTE_KEY = "NeFo_pending_push_route";

function readText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeEventName(value) {
  return readText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getInternalRoute(value) {
  const route = readText(value);

  if (!route.startsWith("/") || route.startsWith("//")) {
    return "";
  }

  return route;
}

function getOrderId(data = {}) {
  return readText(
    data.orderId ||
      data.order_id ||
      data.orderID ||
      data.id
  );
}

function resolvePushRoute(notification = {}) {
  const data = notification?.data || {};

  const directRoute = getInternalRoute(
    data.route ||
      data.path ||
      data.url ||
      notification?.link
  );

  if (directRoute) return directRoute;

  const eventName = normalizeEventName(
    data.type ||
      data.event ||
      data.notificationType ||
      data.notification_type
  );

  const audience = normalizeEventName(
    data.audience ||
      data.role ||
      data.recipient_role
  );

  const orderId = getOrderId(data);

  if (
    (eventName.includes("message") ||
      eventName.includes("chat")) &&
    orderId
  ) {
    return `/order-chat/${encodeURIComponent(orderId)}`;
  }

  if (
    eventName === "seller_application_submitted" ||
    eventName === "seller_reapplication" ||
    eventName === "new_seller_application"
  ) {
    return "/owner-seller-applications";
  }

  if (
    eventName === "seller_application_approved" ||
    eventName === "seller_application_rejected"
  ) {
    return "/seller-registration";
  }

  if (eventName === "new_support_ticket") {
    return "/owner-support-tickets";
  }

  if (eventName === "support_update") {
    return audience === "seller"
      ? "/seller-helper"
      : "/care-agent";
  }

  if (
    audience === "seller" ||
    eventName === "new_order" ||
    eventName === "scheduled_order_received" ||
    eventName === "scheduled_order_reminder"
  ) {
    return "/seller-dashboard";
  }

  if (
    orderId ||
    eventName.includes("order") ||
    eventName.includes("pickup") ||
    eventName.includes("payment")
  ) {
    return "/orders";
  }

  return "/";
}

function getLoginRouteForNotification(notification = {}) {
  const data = notification?.data || {};

  const eventName = normalizeEventName(
    data.type ||
      data.event ||
      data.notificationType ||
      data.notification_type
  );

  const audience = normalizeEventName(
    data.audience ||
      data.role ||
      data.recipient_role
  );

  if (
    audience === "seller" ||
    audience === "admin" ||
    audience === "owner" ||
    eventName === "new_order" ||
    eventName === "scheduled_order_received" ||
    eventName === "scheduled_order_reminder" ||
    eventName === "new_seller_application" ||
    eventName === "seller_application_submitted" ||
    eventName === "seller_reapplication" ||
    eventName === "new_support_ticket"
  ) {
    return "/seller-login";
  }

  return "/customer-login";
}

function dispatchPushEvent(name, detail) {
  window.dispatchEvent(
    new CustomEvent(name, {
      detail,
    })
  );
}

async function registerPushToken({
  token,
  platform,
}) {
  if (!token) return;

  const { error } = await supabase.rpc(
    "register_push_device_token",
    {
      p_token: token,
      p_platform:
        platform || Capacitor.getPlatform() || "android",
    }
  );

  if (error) {
    console.error(
      "Could not register NeFo push token in Supabase:",
      error.message
    );
  }
}

async function createAndroidChannel(config) {
  try {
    await PushNotifications.createChannel(config);
  } catch (error) {
    console.warn(
      `Could not create ${config.id} notification channel:`,
      error
    );
  }
}

export default function PushNotificationBootstrap() {
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const userIdRef = useRef(user?.id || "");

  useEffect(() => {
    userIdRef.current = user?.id || "";
  }, [user?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let cancelled = false;
    const listenerHandles = [];

    async function addNativeListeners() {
      const registrationHandle =
        await PushNotifications.addListener(
          "registration",
          (token) => {
            const tokenValue = readText(token?.value);

            if (!tokenValue) return;

            localStorage.setItem(
              PUSH_TOKEN_STORAGE_KEY,
              tokenValue
            );

            if (userIdRef.current) {
              localStorage.setItem(
                PUSH_TOKEN_USER_STORAGE_KEY,
                userIdRef.current
              );

              void registerPushToken({
                token: tokenValue,
                platform: Capacitor.getPlatform(),
              });
            }

            dispatchPushEvent("nefo:push-token", {
              token: tokenValue,
              userId: userIdRef.current || null,
              platform: Capacitor.getPlatform(),
            });

            console.info(
              "NeFo push registration completed."
            );
          }
        );

      if (cancelled) {
        await registrationHandle.remove();
        return;
      }

      listenerHandles.push(registrationHandle);

      const registrationErrorHandle =
        await PushNotifications.addListener(
          "registrationError",
          (error) => {
            console.error(
              "NeFo push registration failed:",
              error?.error || error
            );

            dispatchPushEvent(
              "nefo:push-registration-error",
              error
            );
          }
        );

      if (cancelled) {
        await registrationErrorHandle.remove();
        return;
      }

      listenerHandles.push(registrationErrorHandle);

      const receivedHandle =
        await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            dispatchPushEvent(
              "nefo:push-received",
              notification
            );
          }
        );

      if (cancelled) {
        await receivedHandle.remove();
        return;
      }

      listenerHandles.push(receivedHandle);

      const actionHandle =
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const notification =
              action?.notification || {};

            const route =
              resolvePushRoute(notification);

            if (!userIdRef.current) {
              sessionStorage.setItem(
                PENDING_PUSH_ROUTE_KEY,
                route
              );

              navigate(
                getLoginRouteForNotification(
                  notification
                ),
                {
                  replace: false,
                }
              );

              return;
            }

            navigate(route, {
              replace: false,
            });
          }
        );

      if (cancelled) {
        await actionHandle.remove();
        return;
      }

      listenerHandles.push(actionHandle);
    }

    addNativeListeners().catch((error) => {
      console.error(
        "Could not initialise NeFo push listeners:",
        error
      );
    });

    return () => {
      cancelled = true;

      listenerHandles.forEach((handle) => {
        handle.remove().catch(() => {});
      });
    };
  }, [navigate]);

  useEffect(() => {
    if (
      !Capacitor.isNativePlatform() ||
      authLoading ||
      !user?.id
    ) {
      return;
    }

    const savedToken = readText(
      localStorage.getItem(
        PUSH_TOKEN_STORAGE_KEY
      )
    );

    if (savedToken) {
      localStorage.setItem(
        PUSH_TOKEN_USER_STORAGE_KEY,
        user.id
      );

      void registerPushToken({
        token: savedToken,
        platform: Capacitor.getPlatform(),
      });
    }

    const pendingRoute = getInternalRoute(
      sessionStorage.getItem(
        PENDING_PUSH_ROUTE_KEY
      )
    );

    if (pendingRoute) {
      sessionStorage.removeItem(
        PENDING_PUSH_ROUTE_KEY
      );

      navigate(pendingRoute, {
        replace: false,
      });
    }
  }, [authLoading, navigate, user?.id]);

  useEffect(() => {
    if (
      !Capacitor.isNativePlatform() ||
      authLoading ||
      !user?.id
    ) {
      return undefined;
    }

    let cancelled = false;

    async function registerForPushNotifications() {
      try {
        if (Capacitor.getPlatform() === "android") {
          await Promise.all([
            createAndroidChannel({
              id: ORDER_CHANNEL_ID,
              name: "NeFo order updates",
              description:
                "New orders and order status updates.",
              importance: 5,
              visibility: 1,
              vibration: true,
              lights: true,
              lightColor: "#CF743D",
            }),
            createAndroidChannel({
              id: MESSAGE_CHANNEL_ID,
              name: "NeFo order messages",
              description:
                "Messages between customers and kitchens.",
              importance: 5,
              visibility: 1,
              vibration: true,
              lights: true,
              lightColor: "#CF743D",
            }),
            createAndroidChannel({
              id: OWNER_CHANNEL_ID,
              name: "NeFo owner alerts",
              description:
                "Seller applications and owner/admin alerts.",
              importance: 5,
              visibility: 1,
              vibration: true,
              lights: true,
              lightColor: "#CF743D",
            }),
            createAndroidChannel({
              id: SUPPORT_CHANNEL_ID,
              name: "NeFo support updates",
              description:
                "Support ticket and support response updates.",
              importance: 4,
              visibility: 1,
              vibration: true,
              lights: true,
              lightColor: "#CF743D",
            }),
            createAndroidChannel({
              id: SCHEDULED_CHANNEL_ID,
              name: "NeFo scheduled orders",
              description:
                "Upcoming scheduled-order reminders.",
              importance: 5,
              visibility: 1,
              vibration: true,
              lights: true,
              lightColor: "#CF743D",
            }),
          ]);
        }

        let permissionStatus =
          await PushNotifications.checkPermissions();

        if (
          permissionStatus.receive === "prompt" ||
          permissionStatus.receive ===
            "prompt-with-rationale"
        ) {
          permissionStatus =
            await PushNotifications.requestPermissions();
        }

        if (
          cancelled ||
          permissionStatus.receive !== "granted"
        ) {
          if (
            permissionStatus.receive !== "granted"
          ) {
            console.warn(
              "NeFo notification permission was not granted."
            );
          }

          return;
        }

        await PushNotifications.register();
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Could not register NeFo push notifications:",
          error
        );
      }
    }

    registerForPushNotifications();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  return null;
}

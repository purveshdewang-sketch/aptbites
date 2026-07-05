import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const REMINDER_CHANNEL_ID = "nefo-reminders";
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function isNativeApp() {
  return Capacitor.isNativePlatform();
}

function createStableNotificationId(value, offset = 0) {
  const text = String(value || "nefo");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }

  const positiveHash = Math.abs(hash || 1);
  const safeId = (positiveHash + offset) % 2147483000;

  return safeId || offset + 1;
}

async function createAndroidReminderChannel() {
  if (Capacitor.getPlatform() !== "android") {
    return;
  }

  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: "NeFo order reminders",
    description: "Scheduled-order and food-order reminders from NeFo.",
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
  });
}

export async function requestLocalNotificationPermission() {
  if (!isNativeApp()) {
    return {
      granted: false,
      reason: "Local notifications are available only in the installed app.",
    };
  }

  let permission =
    await LocalNotifications.checkPermissions();

  if (permission.display !== "granted") {
    permission =
      await LocalNotifications.requestPermissions();
  }

  if (permission.display !== "granted") {
    return {
      granted: false,
      reason: "Notification permission was not granted.",
    };
  }

  await createAndroidReminderChannel();

  return {
    granted: true,
    reason: "",
  };
}

export async function checkExactAlarmAccess() {
  if (
    !isNativeApp() ||
    Capacitor.getPlatform() !== "android" ||
    typeof LocalNotifications.checkExactNotificationSetting !== "function"
  ) {
    return {
      exactAlarmSupported: false,
      status: "not_applicable",
    };
  }

  try {
    const result =
      await LocalNotifications.checkExactNotificationSetting();

    return {
      exactAlarmSupported: true,
      status: result.exact_alarm,
    };
  } catch {
    return {
      exactAlarmSupported: true,
      status: "unknown",
    };
  }
}

export async function openExactAlarmSettings() {
  if (
    Capacitor.getPlatform() !== "android" ||
    typeof LocalNotifications.changeExactNotificationSetting !== "function"
  ) {
    return;
  }

  await LocalNotifications.changeExactNotificationSetting();
}

export async function cancelOrderReminders(orderId) {
  if (!isNativeApp() || !orderId) {
    return;
  }

  await LocalNotifications.cancel({
    notifications: [
      {
        id: createStableNotificationId(orderId, 1),
      },
      {
        id: createStableNotificationId(orderId, 2),
      },
    ],
  });
}

export async function scheduleOrderReminders({
  orderId,
  scheduledFor,
  audience = "customer",
  kitchenName = "your kitchen",
}) {
  if (!orderId || !scheduledFor) {
    return {
      scheduled: 0,
      reason: "Order ID or scheduled time is missing.",
    };
  }

  const permission =
    await requestLocalNotificationPermission();

  if (!permission.granted) {
    return {
      scheduled: 0,
      reason: permission.reason,
    };
  }

  const scheduledDate =
    new Date(scheduledFor);

  if (
    Number.isNaN(
      scheduledDate.getTime()
    )
  ) {
    return {
      scheduled: 0,
      reason: "The scheduled order time is invalid.",
    };
  }

  await cancelOrderReminders(orderId);

  const now = Date.now();
  const notifications = [];
  const route =
    audience === "seller"
      ? "/seller-dashboard"
      : "/orders";

  const reminderTime =
    new Date(
      scheduledDate.getTime() -
        THIRTY_MINUTES_MS
    );

  if (reminderTime.getTime() > now) {
    notifications.push({
      id: createStableNotificationId(orderId, 1),
      title:
        audience === "seller"
          ? "Scheduled order in 30 minutes"
          : "Your NeFo order is coming up",
      body:
        audience === "seller"
          ? `Prepare scheduled order #${String(orderId).slice(0, 8)}.`
          : `${kitchenName} is scheduled to prepare your order in 30 minutes.`,
      schedule: {
        at: reminderTime,
        allowWhileIdle: true,
      },
      channelId: REMINDER_CHANNEL_ID,
      autoCancel: true,
      extra: {
        route,
        orderId,
        audience,
        reminderType: "thirty_minutes_before",
      },
    });
  }

  if (scheduledDate.getTime() > now) {
    notifications.push({
      id: createStableNotificationId(orderId, 2),
      title:
        audience === "seller"
          ? "Scheduled order time"
          : "Your scheduled order time",
      body:
        audience === "seller"
          ? `Open NeFo and check order #${String(orderId).slice(0, 8)}.`
          : `Open NeFo to check the latest status of your order from ${kitchenName}.`,
      schedule: {
        at: scheduledDate,
        allowWhileIdle: true,
      },
      channelId: REMINDER_CHANNEL_ID,
      autoCancel: true,
      extra: {
        route,
        orderId,
        audience,
        reminderType: "scheduled_time",
      },
    });
  }

  if (notifications.length === 0) {
    return {
      scheduled: 0,
      reason: "The scheduled time has already passed.",
    };
  }

  await LocalNotifications.schedule({
    notifications,
  });

  return {
    scheduled: notifications.length,
    reason: "",
  };
}

export async function scheduleTestNotification(
  delaySeconds = 10
) {
  const permission =
    await requestLocalNotificationPermission();

  if (!permission.granted) {
    return permission;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: createStableNotificationId(
          `test-${Date.now()}`
        ),
        title: "NeFo notifications are working",
        body: "This test notification can appear even after you close the app.",
        schedule: {
          at: new Date(
            Date.now() +
              delaySeconds * 1000
          ),
          allowWhileIdle: true,
        },
        channelId: REMINDER_CHANNEL_ID,
        autoCancel: true,
        extra: {
          route: "/",
          reminderType: "test",
        },
      },
    ],
  });

  return {
    granted: true,
    reason: "",
  };
}

export async function registerLocalNotificationOpenListener(
  onOpen
) {
  if (!isNativeApp()) {
    return () => {};
  }

  const handle =
    await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        const extra =
          event?.notification?.extra ||
          {};

        onOpen?.(extra);
      }
    );

  return () => {
    handle.remove();
  };
}

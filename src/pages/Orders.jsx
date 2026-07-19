import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const TRACKING_STEPS = [
  {
    key: "confirmed",
    label: "Order Confirmed",
  },
  {
    key: "preparing",
    label: "Preparing",
  },
  {
    key: "out_for_delivery",
    label: "Out for Delivery",
  },
  {
    key: "completed",
    label: "Delivered",
  },
];

const CANCEL_WINDOW_SECONDS = 60;

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] =
    useState([]);

  const [
    completedOrdersCount,
    setCompletedOrdersCount,
  ] = useState(0);

  const [
    cancelMessage,
    setCancelMessage,
  ] = useState("");

  const [
    timerTick,
    setTimerTick,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setTimerTick(
          (current) => current + 1
        );
      }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    fetchOrders();

    const channel = supabase
      .channel(
        `customer-orders-${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchOrders(
    showLoading = true
  ) {
    if (!user) return;

    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage("");

    const [
      activeOrdersResult,
      completedOrdersResult,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .not(
          "status",
          "in",
          '("cancelled","completed","delivered")'
        )
        .order("id", {
          ascending: false,
        }),

      supabase
        .from("orders")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id)
        .in("status", [
          "completed",
          "delivered",
        ]),
    ]);

    if (activeOrdersResult.error) {
      setErrorMessage(
        activeOrdersResult.error.message
      );

      setOrders([]);
    } else {
      setOrders(
        activeOrdersResult.data || []
      );
    }

    if (
      !completedOrdersResult.error
    ) {
      setCompletedOrdersCount(
        completedOrdersResult.count || 0
      );
    }

    setLoading(false);
  }

  function normalizeStatus(status) {
    const value = String(
      status || "confirmed"
    ).toLowerCase();

    if (value === "cancelled") {
      return "cancelled";
    }

    if (value === "placed") {
      return "confirmed";
    }

    if (value === "confirmed") {
      return "confirmed";
    }

    if (value === "accepted") {
      return "confirmed";
    }

    if (value === "cooking") {
      return "preparing";
    }

    if (value === "baking") {
      return "preparing";
    }

    if (value === "preparing") {
      return "preparing";
    }

    if (value === "packing") {
      return "out_for_delivery";
    }

    if (
      value === "out_for_delivery"
    ) {
      return "out_for_delivery";
    }

    if (
      value === "ready_for_pickup"
    ) {
      return "ready_for_pickup";
    }

    if (value === "delivered") {
      return "completed";
    }

    if (value === "completed") {
      return "completed";
    }

    return value;
  }

  function normalizeKitchenResponse(
    response
  ) {
    return String(
      response || "pending"
    ).toLowerCase();
  }

  function isSelfPickup(order) {
    return String(
      order.delivery_type || ""
    )
      .toLowerCase()
      .includes("pickup");
  }

  function isScheduledOrder(order) {
    return (
      order.scheduled_order ===
        true ||
      Boolean(order.scheduled_for)
    );
  }

  function formatPlacedDateTime(
    value
  ) {
    if (!value) {
      return "Placed time unavailable";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "Placed time unavailable";
    }

    return `Placed on ${date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
      }
    )}, ${date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    )}`;
  }

  function formatShortTime(value) {
    if (!value) return "---";

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "---";
    }

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );
  }

  function addMinutes(
    value,
    minutes
  ) {
    const baseDate = value
      ? new Date(value)
      : new Date();

    if (
      Number.isNaN(
        baseDate.getTime()
      )
    ) {
      return null;
    }

    return new Date(
      baseDate.getTime() +
        minutes * 60000
    ).toISOString();
  }

  function getCancelSecondsLeft(order) {
    void timerTick;

    const createdAt = new Date(
      order.created_at || Date.now()
    ).getTime();

    if (
      Number.isNaN(createdAt)
    ) {
      return 0;
    }

    const elapsedSeconds =
      Math.floor(
        (Date.now() - createdAt) /
          1000
      );

    return Math.max(
      0,
      CANCEL_WINDOW_SECONDS -
        elapsedSeconds
    );
  }

  function formatCancelTimer(secondsLeft) {
    const safeSeconds =
      Math.max(
        0,
        Number(secondsLeft || 0)
      );

    const minutes =
      Math.floor(
        safeSeconds / 60
      );

    const seconds =
      safeSeconds % 60;

    return `${minutes}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  function formatScheduledDateTime(
    value
  ) {
    if (!value) {
      return "Schedule time not available";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "Schedule time not available";
    }

    return date.toLocaleString(
      "en-IN",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );
  }

  function getAutoStatus(order) {
    void timerTick;

    const dbStatus =
      normalizeStatus(order.status);

    const kitchenResponse =
      normalizeKitchenResponse(
        order.seller_response
      );

    if (
      dbStatus === "cancelled" ||
      kitchenResponse === "rejected"
    ) {
      return "cancelled";
    }

    if (
      dbStatus === "completed"
    ) {
      return "completed";
    }

    if (order.ready_for_pickup) {
      return isSelfPickup(order)
        ? "ready_for_pickup"
        : "out_for_delivery";
    }

    if (
      dbStatus === "confirmed" ||
      dbStatus === "preparing" ||
      dbStatus ===
        "out_for_delivery" ||
      dbStatus ===
        "ready_for_pickup"
    ) {
      return dbStatus;
    }

    const createdAt = new Date(
      order.created_at || Date.now()
    ).getTime();

    const minutesPassed =
      Math.floor(
        (Date.now() - createdAt) /
          60000
      );

    if (minutesPassed >= 20) {
      return isSelfPickup(order)
        ? "ready_for_pickup"
        : "out_for_delivery";
    }

    if (minutesPassed >= 10) {
      return "preparing";
    }

    return "confirmed";
  }

  function getOrderItems(order) {
    if (
      Array.isArray(order.items)
    ) {
      return order.items;
    }

    if (
      typeof order.items ===
      "string"
    ) {
      try {
        const parsedItems =
          JSON.parse(order.items);

        return Array.isArray(
          parsedItems
        )
          ? parsedItems
          : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  function getStepIndex(order) {
    const currentStatus =
      getAutoStatus(order);

    if (
      currentStatus === "cancelled"
    ) {
      return -1;
    }

    if (
      currentStatus === "confirmed"
    ) {
      return 0;
    }

    if (
      currentStatus === "preparing"
    ) {
      return 1;
    }

    if (
      currentStatus ===
      "out_for_delivery"
    ) {
      return 2;
    }

    if (
      currentStatus ===
      "ready_for_pickup"
    ) {
      return 2;
    }

    if (
      currentStatus === "completed"
    ) {
      return 3;
    }

    return 0;
  }

  function getTrackingSteps(order) {
    const pickup =
      isSelfPickup(order);

    return TRACKING_STEPS.map(
      (step) => {
        if (
          step.key ===
            "out_for_delivery" &&
          pickup
        ) {
          return {
            ...step,
            label:
              "Ready for Pickup",
          };
        }

        if (
          step.key ===
            "completed" &&
          pickup
        ) {
          return {
            ...step,
            label: "Picked Up",
          };
        }

        return step;
      }
    );
  }

  function getStepTime(
    order,
    index
  ) {
    const activeIndex =
      getStepIndex(order);

    if (index > activeIndex) {
      return "---";
    }

    if (index === 0) {
      return formatShortTime(
        order.created_at
      );
    }

    if (index === 1) {
      return formatShortTime(
        addMinutes(
          order.created_at,
          15
        )
      );
    }

    if (index === 2) {
      return formatShortTime(
        addMinutes(
          order.created_at,
          30
        )
      );
    }

    if (index === 3) {
      return formatShortTime(
        addMinutes(
          order.created_at,
          45
        )
      );
    }

    return "---";
  }

  function getCurrentStepSubtext(
    order,
    stepIndex
  ) {
    const currentStatus =
      getAutoStatus(order);

    if (
      currentStatus === "cancelled"
    ) {
      return "Cancelled";
    }

    if (
      stepIndex === 2 &&
      currentStatus ===
        "out_for_delivery"
    ) {
      return isSelfPickup(order)
        ? "Ready"
        : "Live";
    }

    if (
      stepIndex === 2 &&
      currentStatus ===
        "ready_for_pickup"
    ) {
      return "Ready";
    }

    return "";
  }

  function getEtaText(order) {
    const currentStatus =
      getAutoStatus(order);

    if (
      currentStatus === "confirmed"
    ) {
      return "30 min";
    }

    if (
      currentStatus === "preparing"
    ) {
      return "20 min";
    }

    if (
      currentStatus ===
      "out_for_delivery"
    ) {
      return "15 min";
    }

    if (
      currentStatus ===
      "ready_for_pickup"
    ) {
      return "Ready now";
    }

    if (
      currentStatus === "completed"
    ) {
      return "Delivered";
    }

    return "15 min";
  }

  function getArrivalLabel(order) {
    if (isSelfPickup(order)) {
      const currentStatus =
        getAutoStatus(order);

      return currentStatus ===
        "ready_for_pickup"
        ? "Order is ready for pickup"
        : "Order will be ready in";
    }

    return "Order will arrive in";
  }

  function getPartnerName(order) {
    return (
      order.delivery_partner_name ||
      order.partner_name ||
      order.seller_name ||
      order.seller_kitchen_name ||
      "NeFo Partner"
    );
  }

  function getPartnerRole(order) {
    if (isSelfPickup(order)) {
      return "Kitchen pickup coordinator";
    }

    return "Your delivery partner";
  }

  function getPartnerInitial(order) {
    return getPartnerName(order)
      .charAt(0)
      .toUpperCase();
  }

  function getOrderTitle(order) {
    const orderId = String(
      order.id || ""
    )
      .slice(0, 8)
      .toUpperCase();

    return `Order #NF${orderId}`;
  }

  function getStatusLabel(order) {
    const currentStatus =
      getAutoStatus(order);

    if (
      currentStatus === "confirmed"
    ) {
      return "Confirmed";
    }

    if (
      currentStatus === "preparing"
    ) {
      return "Preparing";
    }

    if (
      currentStatus ===
      "out_for_delivery"
    ) {
      return isSelfPickup(order)
        ? "Ready Soon"
        : "Out for Delivery";
    }

    if (
      currentStatus ===
      "ready_for_pickup"
    ) {
      return "Ready";
    }

    if (
      currentStatus === "completed"
    ) {
      return isSelfPickup(order)
        ? "Picked Up"
        : "Delivered";
    }

    if (
      currentStatus === "cancelled"
    ) {
      return "Cancelled";
    }

    return "Active";
  }

  function getStatusStyle(order) {
    const currentStatus =
      getAutoStatus(order);

    if (
      currentStatus === "confirmed"
    ) {
      return "border-[#D8C9B3] bg-[#FFF0DF] text-[#3F5128]";
    }

    if (
      currentStatus === "preparing"
    ) {
      return "border-orange-200 bg-orange-50 text-orange-700";
    }

    if (
      currentStatus ===
        "out_for_delivery" ||
      currentStatus ===
        "ready_for_pickup"
    ) {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (
      currentStatus === "cancelled"
    ) {
      return "border-red-200 bg-red-50 text-red-600";
    }

    return "border-[#EADFCE] bg-[#FFFDF7] text-[#6B6258]";
  }

  function canCancelOrder(order) {
    const currentStatus =
      getAutoStatus(order);

    const kitchenResponse =
      normalizeKitchenResponse(
        order.seller_response
      );

    const secondsLeft =
      getCancelSecondsLeft(order);

    return (
      currentStatus ===
        "confirmed" &&
      kitchenResponse !==
        "accepted" &&
      secondsLeft > 0
    );
  }

  async function cancelOrder(orderId) {
    const confirmCancel =
      window.confirm(
        "Cancel this order?"
      );

    if (!confirmCancel) return;

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .select("id, status");

    if (error) {
      alert(
        `Cancel failed: ${error.message}`
      );

      return;
    }

    if (
      !data ||
      data.length === 0
    ) {
      alert(
        "Cancel failed: this order does not belong to the current logged-in user."
      );

      return;
    }

    setCancelMessage(
      "Order cancelled successfully."
    );

    setOrders(
      (currentOrders) =>
        currentOrders.filter(
          (order) =>
            order.id !== orderId
        )
    );

    window.setTimeout(() => {
      setCancelMessage("");
    }, 1500);
  }

  const visibleOrders =
    useMemo(() => {
      return orders.filter(
        (order) => {
          const dbStatus =
            normalizeStatus(
              order.status
            );

          const kitchenResponse =
            normalizeKitchenResponse(
              order.seller_response
            );

          if (
            dbStatus === "cancelled"
          ) {
            return false;
          }

          if (
            dbStatus === "completed"
          ) {
            return false;
          }

          if (
            kitchenResponse ===
            "rejected"
          ) {
            return false;
          }

          return true;
        }
      );
    }, [orders, timerTick]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <section
            className={`mt-6 p-8 text-center ${CARD}`}
          >
            <h1 className="text-2xl font-black text-[#181411]">
              Sign in to view orders
            </h1>

            <p className="mt-2 text-sm font-semibold text-[#6B6258]">
              Your active orders will
              appear here after checkout.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white shadow-lg shadow-[#3F5128]/15"
            >
              Sign In
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-28 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              My Orders
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Active orders
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Track preparation,
              delivery and pickup in
              real time.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-4 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#6B6258]">
              Active
            </p>

            <p className="mt-2 text-3xl font-black text-[#181411]">
              {visibleOrders.length}
            </p>
          </div>

          <Link
            to="/order-history"
            className="rounded-[22px] border border-[#D8C9B3] bg-[#FFF0DF] p-4 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-[0.98]"
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-[#CF743D]">
              Past Orders
            </p>

            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-3xl font-black text-[#3F5128]">
                {completedOrdersCount}
              </p>

              <span className="text-xl text-[#CF743D]">
                ★
              </span>
            </div>
          </Link>
        </section>

        {completedOrdersCount > 0 ? (
          <Link
            to="/order-history"
            className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-[#F3C06E] bg-[#FFF8E7] p-4 active:scale-[0.99]"
          >
            <div className="min-w-0">
              <p className="font-black text-[#3F5128]">
                Rate your completed
                dishes
              </p>

              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#6B6258]">
                Open past orders to rate
                individual food items.
              </p>
            </div>

            <span className="shrink-0 text-xl font-black text-[#CF743D]">
              ›
            </span>
          </Link>
        ) : null}

        {cancelMessage ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700">
            {cancelMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5">
            <OrdersLoading />
          </div>
        ) : null}

        {!loading &&
        errorMessage ? (
          <section className="mt-5 rounded-[30px] border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="font-black text-red-600">
              Failed to load orders
            </p>

            <p className="mt-1 text-sm font-semibold text-red-500">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                fetchOrders()
              }
              className="mt-4 rounded-2xl border border-red-600 bg-red-600 px-5 py-3 text-sm font-black text-white"
            >
              Try Again
            </button>
          </section>
        ) : null}

        {!loading &&
        !errorMessage &&
        visibleOrders.length === 0 ? (
          <section
            className={`mt-5 p-8 text-center ${CARD}`}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              🍲
            </div>

            <h2 className="mt-5 text-2xl font-black text-[#181411]">
              No active orders
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Running and scheduled
              orders will appear here
              after checkout.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                to="/marketplace"
                className="rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
              >
                Explore Marketplace
              </Link>

              <Link
                to="/order-history"
                className="rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] py-4 text-center text-sm font-black text-[#3F5128] active:scale-[0.98]"
              >
                Past Orders & Ratings
              </Link>

              <Link
                to="/customer-care"
                className="rounded-2xl border border-[#EADFCE] bg-[#FFFDF7] py-4 text-center text-sm font-black text-[#3F5128] active:scale-[0.98]"
              >
                Need Help?
              </Link>
            </div>
          </section>
        ) : null}

        {!loading &&
        !errorMessage &&
        visibleOrders.length > 0 ? (
          <section className="mt-5 space-y-5">
            {visibleOrders.map(
              (order) => (
                <OrderTrackingCard
                  key={order.id}
                  order={order}
                  getAutoStatus={
                    getAutoStatus
                  }
                  getOrderItems={
                    getOrderItems
                  }
                  getStepIndex={
                    getStepIndex
                  }
                  getTrackingSteps={
                    getTrackingSteps
                  }
                  getStepTime={
                    getStepTime
                  }
                  getCurrentStepSubtext={
                    getCurrentStepSubtext
                  }
                  getEtaText={
                    getEtaText
                  }
                  getArrivalLabel={
                    getArrivalLabel
                  }
                  getPartnerName={
                    getPartnerName
                  }
                  getPartnerRole={
                    getPartnerRole
                  }
                  getPartnerInitial={
                    getPartnerInitial
                  }
                  getOrderTitle={
                    getOrderTitle
                  }
                  getStatusLabel={
                    getStatusLabel
                  }
                  getStatusStyle={
                    getStatusStyle
                  }
                  formatPlacedDateTime={
                    formatPlacedDateTime
                  }
                  formatScheduledDateTime={
                    formatScheduledDateTime
                  }
                  isScheduledOrder={
                    isScheduledOrder
                  }
                  isSelfPickup={
                    isSelfPickup
                  }
                  canCancelOrder={
                    canCancelOrder
                  }
                  getCancelSecondsLeft={
                    getCancelSecondsLeft
                  }
                  formatCancelTimer={
                    formatCancelTimer
                  }
                  cancelOrder={
                    cancelOrder
                  }
                />
              )
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function OrderTrackingCard({
  order,
  getAutoStatus,
  getOrderItems,
  getStepIndex,
  getTrackingSteps,
  getStepTime,
  getCurrentStepSubtext,
  getEtaText,
  getArrivalLabel,
  getPartnerName,
  getPartnerRole,
  getPartnerInitial,
  getOrderTitle,
  getStatusLabel,
  getStatusStyle,
  formatPlacedDateTime,
  formatScheduledDateTime,
  isScheduledOrder,
  isSelfPickup,
  canCancelOrder,
  getCancelSecondsLeft,
  formatCancelTimer,
  cancelOrder,
}) {
  const autoStatus =
    getAutoStatus(order);

  const activeIndex =
    getStepIndex(order);

  const steps =
    getTrackingSteps(order);

  const orderItems =
    getOrderItems(order);

  const cancelSecondsLeft =
    getCancelSecondsLeft(order);

  const cancellationAllowed =
    canCancelOrder(order);

  const cancelTimerText =
    formatCancelTimer(
      cancelSecondsLeft
    );

  return (
    <article
      className={`overflow-hidden ${CARD}`}
    >
      <header className="border-b border-[#EADFCE] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black leading-tight text-[#181411]">
              {getOrderTitle(order)}
            </h2>

            <p className="mt-1 truncate text-xs font-bold text-[#6B6258]">
              {formatPlacedDateTime(
                order.created_at
              )}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${getStatusStyle(
              order
            )}`}
          >
            {getStatusLabel(order)}
          </span>
        </div>
      </header>

      <div className="p-4">
        {isScheduledOrder(order) &&
        autoStatus === "confirmed" ? (
          <div className="mb-4 rounded-2xl border border-[#CF743D]/25 bg-[#FFF0DF] px-4 py-3 text-xs font-black text-[#3F5128]">
            Scheduled for{" "}
            {formatScheduledDateTime(
              order.scheduled_for
            )}
          </div>
        ) : null}

        {autoStatus === "confirmed" ? (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 ${
              cancellationAllowed
                ? "border-red-200 bg-red-50"
                : "border-[#EADFCE] bg-[#FFFDF7]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={`text-xs font-black uppercase tracking-wide ${
                    cancellationAllowed
                      ? "text-red-600"
                      : "text-[#6B6258]"
                  }`}
                >
                  Cancellation window
                </p>

                <p className="mt-1 text-xs font-semibold leading-relaxed text-[#6B6258]">
                  {cancellationAllowed
                    ? "You can cancel this order for 1 minute after placing it."
                    : "Cancellation time is over. Contact the seller if you need help."}
                </p>
              </div>

              <div
                className={`shrink-0 rounded-2xl border px-3 py-2 text-center ${
                  cancellationAllowed
                    ? "border-red-200 bg-white text-red-600"
                    : "border-[#EADFCE] bg-white text-[#9A8E80]"
                }`}
              >
                <p className="text-[10px] font-black uppercase">
                  Left
                </p>

                <p className="mt-0.5 text-lg font-black leading-none">
                  {cancelTimerText}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-0">
          {steps.map(
            (step, index) => {
              const isDone =
                activeIndex >= index;

              const isCurrent =
                activeIndex === index;

              const isLast =
                index ===
                steps.length - 1;

              const subtext =
                getCurrentStepSubtext(
                  order,
                  index
                );

              return (
                <div
                  key={step.key}
                  className="relative flex gap-3"
                >
                  <div className="relative flex w-8 shrink-0 justify-center">
                    {!isLast ? (
                      <div
                        className={`absolute left-1/2 top-8 h-full w-px -translate-x-1/2 ${
                          isDone
                            ? "bg-[#CF743D]"
                            : "bg-[#F1E8DC]"
                        }`}
                      />
                    ) : null}

                    <div
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        isDone
                          ? isCurrent &&
                            index === 2
                            ? "border-[#3F5128] bg-[#3F5128] text-white"
                            : "border-[#CF743D] bg-white text-[#CF743D]"
                          : "border-[#F1E8DC] bg-[#FFF8EC] text-transparent"
                      }`}
                    >
                      {isDone ? (
                        isCurrent &&
                        index === 2 ? (
                          isSelfPickup(
                            order
                          ) ? (
                            <PickupIcon />
                          ) : (
                            <TruckIcon />
                          )
                        ) : (
                          <CheckIcon />
                        )
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`min-w-0 flex-1 pb-7 ${
                      isLast
                        ? "pb-1"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-black ${
                            isDone
                              ? "text-[#181411]"
                              : "text-[#9A8E80]"
                          }`}
                        >
                          {step.label}
                        </p>

                        {subtext ? (
                          <p className="mt-0.5 text-[10px] font-black text-[#CF743D]">
                            {subtext}
                          </p>
                        ) : null}
                      </div>

                      <p
                        className={`shrink-0 text-[11px] font-bold ${
                          isDone
                            ? "text-[#6B6258]"
                            : "text-[#9A8E80]"
                        }`}
                      >
                        {getStepTime(
                          order,
                          index
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
        <Link
          to={`/order-chat/${order.id}`}
          className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-[#CF743D] bg-[#FFF0DF] p-4 shadow-[4px_4px_12px_rgba(63,81,40,0.05),-4px_-4px_12px_rgba(255,255,255,0.95)] active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="truncate text-base font-black text-[#3F5128]">
              Talk to Seller
            </p>

            <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
              Live chat for pickup, delivery, or order changes.
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#CF743D] bg-[#CF743D] text-white">
            <ChatIcon />
          </div>
        </Link>

        <div className="mt-4 rounded-[22px] border border-[#EADFCE] bg-[#FFFDF7] p-4 shadow-inner">
          <p className="text-xs font-bold text-[#6B6258]">
            {getArrivalLabel(order)}
          </p>

          <p className="mt-1 text-3xl font-black leading-none text-[#181411]">
            {getEtaText(order)}
          </p>
        </div>

        {orderItems.length > 0 ? (
          <details className="mt-4 rounded-[22px] border border-[#EADFCE] bg-white px-4 py-3">
            <summary className="cursor-pointer text-sm font-black text-[#3F5128]">
              View order items
            </summary>

            <div className="mt-3 space-y-3">
              {orderItems.map(
                (item, index) => (
                  <div
                    key={`${order.id}-${
                      item.id ||
                      item.food_id ||
                      item.name ||
                      index
                    }`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#181411]">
                        {item.name}
                      </p>

                      <p className="text-xs font-semibold text-[#6B6258]">
                        Qty{" "}
                        {item.quantity} × ₹
                        {item.price}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-black text-[#3F5128]">
                      ₹
                      {Number(
                        item.price || 0
                      ) *
                        Number(
                          item.quantity ||
                            0
                        )}
                    </p>
                  </div>
                )
              )}
            </div>
          </details>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3">
          {cancellationAllowed ? (
            <button
              type="button"
              onClick={() =>
                cancelOrder(order.id)
              }
              className="rounded-2xl border border-red-200 bg-red-50 py-3 text-xs font-black text-red-500 active:scale-95"
            >
              Cancel Order ({cancelTimerText})
            </button>
          ) : autoStatus === "confirmed" ? (
            <div className="rounded-2xl border border-[#EADFCE] bg-[#FFFDF7] px-4 py-3 text-center text-xs font-black text-[#9A8E80]">
              Cancel option closed
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function OrdersLoading() {
  return (
    <div className="space-y-4">
      <div className="h-[440px] animate-pulse rounded-[30px] border border-[#EADFCE] bg-white/90 shadow-sm" />

      <div className="h-[440px] animate-pulse rounded-[30px] border border-[#EADFCE] bg-white/90 shadow-sm" />
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function PickupIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M4 4h16v12H8l-4 4z" />
    </svg>
  );
}
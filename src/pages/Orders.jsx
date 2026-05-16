import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const ORDER_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "cooking", label: "Cooking", icon: "🍳" },
  { key: "packing", label: "Packing", icon: "📦" },
  { key: "ready_for_pickup", label: "Ready", icon: "🛍️" },
  { key: "completed", label: "Completed", icon: "🏁" },
];

export default function Orders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [cancelMessage, setCancelMessage] = useState("");
  const [timerTick, setTimerTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((current) => current + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchOrders();

    const channel = supabase
      .channel(`customer-orders-${user.id}`)
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

  async function fetchOrders(showLoading = true) {
    if (!user) return;

    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .not("status", "in", '("cancelled","completed")')
      .order("id", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  function normalizeStatus(status) {
    const value = String(status || "confirmed").toLowerCase();

    if (value === "cancelled") return "cancelled";
    if (value === "placed") return "confirmed";
    if (value === "baking") return "cooking";
    if (value === "delivered") return "completed";
    if (value === "out_for_delivery") return "packing";

    return value;
  }

  function normalizeSellerResponse(response) {
    return String(response || "pending").toLowerCase();
  }

  function isSelfPickup(order) {
    return String(order.delivery_type || "").toLowerCase().includes("pickup");
  }

  function isScheduledOrder(order) {
    return order.scheduled_order === true || Boolean(order.scheduled_for);
  }

  function formatScheduledDateTime(value) {
    if (!value) return "Schedule time not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Schedule time not available";
    }

    return date.toLocaleString([], {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getAutoStatus(order) {
    timerTick;

    const dbStatus = normalizeStatus(order.status);
    const sellerResponse = normalizeSellerResponse(order.seller_response);

    if (dbStatus === "cancelled" || sellerResponse === "rejected") {
      return "cancelled";
    }

    if (dbStatus === "completed") {
      return "completed";
    }

    if (order.ready_for_pickup) {
      return "ready_for_pickup";
    }

    const createdAt = new Date(order.created_at || Date.now()).getTime();
    const minutesPassed = Math.floor((Date.now() - createdAt) / 60000);

    if (minutesPassed >= 20) return "packing";
    if (minutesPassed >= 10) return "cooking";

    return "confirmed";
  }

  function getOrderItems(order) {
    if (Array.isArray(order.items)) return order.items;

    if (typeof order.items === "string") {
      try {
        const parsedItems = JSON.parse(order.items);
        return Array.isArray(parsedItems) ? parsedItems : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  function getStepIndex(status) {
    const currentStatus = normalizeStatus(status);
    const index = ORDER_STEPS.findIndex((step) => step.key === currentStatus);
    return index === -1 ? 0 : index;
  }

  function getStatusLabel(order) {
    const currentStatus = getAutoStatus(order);

    if (currentStatus === "confirmed") {
      return isScheduledOrder(order) ? "Scheduled Order" : "Order Confirmed";
    }

    if (currentStatus === "cooking") return "Cooking";
    if (currentStatus === "packing") return "Almost Ready";
    if (currentStatus === "ready_for_pickup") return "Ready for Pickup";

    if (currentStatus === "completed") {
      return isSelfPickup(order) ? "Picked Up" : "Delivered";
    }

    if (currentStatus === "cancelled") return "Cancelled";

    return "Order Confirmed";
  }

  function getStatusStyle(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "cancelled") {
      return "bg-red-50 text-red-600 border-red-200";
    }

    if (currentStatus === "completed") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (currentStatus === "ready_for_pickup") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (currentStatus === "packing") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (currentStatus === "cooking") {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }

    return "bg-[#41D3BD]/12 text-[#073B35] border-[#41D3BD]/30";
  }

  function getProgressWidth(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "cancelled") return 0;
    if (currentStatus === "confirmed") return 15;
    if (currentStatus === "cooking") return 45;
    if (currentStatus === "packing") return 85;
    if (currentStatus === "ready_for_pickup") return 92;
    if (currentStatus === "completed") return 100;

    return 15;
  }

  async function cancelOrder(orderId) {
    const confirmCancel = window.confirm("Cancel this order?");

    if (!confirmCancel) return;

    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .select("id, status");

    if (error) {
      alert(`Cancel failed: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      alert(
        "Cancel failed: this order does not belong to the current logged-in user."
      );
      return;
    }

    setCancelMessage("Order cancelled successfully.");

    setOrders((currentOrders) =>
      currentOrders.filter((order) => order.id !== orderId)
    );

    setTimeout(() => {
      setCancelMessage("");
    }, 1500);
  }

  function OrderStatusBar({ order }) {
    const status = getAutoStatus(order);
    const activeIndex = getStepIndex(status);
    const progressWidth = getProgressWidth(status);

    return (
      <div className="mt-5">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {ORDER_STEPS.map((step, index) => {
            const isActive = index <= activeIndex;
            const isCurrent = index === activeIndex;

            return (
              <div key={step.key} className="text-center">
                <div
                  className={`mx-auto w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-base sm:text-lg border transition-all duration-300 ${
                    isActive
                      ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD] shadow-lg shadow-[#41D3BD]/20"
                      : "bg-[#FFFFF2] text-[#9AA7A3] border-[#D7F5EF]"
                  } ${isCurrent ? "scale-110" : ""}`}
                >
                  {step.icon}
                </div>

                <p
                  className={`mt-2 text-[9px] sm:text-xs font-bold leading-tight ${
                    isActive ? "text-[#073B35]" : "text-[#9AA7A3]"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 h-2.5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#41D3BD] transition-all duration-700 ease-out"
            style={{
              width: `${progressWidth}%`,
            }}
          />
        </div>

        {isScheduledOrder(order) && status === "confirmed" && (
          <div className="mt-4 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] rounded-2xl p-4 font-bold">
            🕒 Scheduled for {formatScheduledDateTime(order.scheduled_for)}
          </div>
        )}

        {status === "packing" && (
          <p className="text-[#51615D] text-xs mt-3">
            Your order is almost ready. It will finish only when the seller marks
            it complete.
          </p>
        )}

        {status === "ready_for_pickup" && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 font-bold">
            🛍️ Your order is ready. Please pick it up from the seller.
          </div>
        )}
      </div>
    );
  }

  const visibleOrders = orders.filter((order) => {
    const dbStatus = normalizeStatus(order.status);
    const sellerResponse = normalizeSellerResponse(order.seller_response);

    if (dbStatus === "cancelled") return false;
    if (dbStatus === "completed") return false;
    if (sellerResponse === "rejected") return false;

    return true;
  });

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <div>
            <p className="text-[#1A9F8D] font-semibold tracking-wide uppercase text-sm">
              Active Orders
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-3 tracking-tight text-[#111827]">
              Live Order Tracking
            </h1>

            <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed">
              Track your Nefo orders from kitchen confirmation to final
              completion.
            </p>
          </div>

          {cancelMessage && (
            <div className="mt-5 bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm font-bold">
              {cancelMessage}
            </div>
          )}

          {!user && (
            <div className="mt-10 bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-xl shadow-[#073B35]/5">
              <h2 className="text-2xl font-bold text-[#111827]">
                Sign in to view orders
              </h2>

              <Link
                to="/customer-login"
                className="inline-block mt-7 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-bold px-6 py-3 rounded-2xl"
              >
                Sign In
              </Link>
            </div>
          )}

          {user && loading && (
            <div className="mt-8 space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-5 animate-pulse shadow-lg shadow-[#073B35]/5"
                >
                  <div className="h-5 bg-[#D7F5EF] rounded-full w-1/3" />
                  <div className="h-4 bg-[#D7F5EF] rounded-full w-2/3 mt-4" />
                  <div className="h-16 bg-[#D7F5EF] rounded-2xl mt-5" />
                </div>
              ))}
            </div>
          )}

          {user && errorMessage && (
            <div className="mt-10 bg-red-50 border border-red-200 text-red-600 rounded-3xl p-5">
              <p className="font-bold">Failed to load orders</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {user && !loading && !errorMessage && visibleOrders.length === 0 && (
            <div className="mt-10 bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-8 sm:p-10 text-center shadow-xl shadow-[#073B35]/5">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-4xl">
                🍲
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-6 text-[#111827]">
                No active orders
              </h2>

              <p className="text-[#51615D] mt-3 max-w-md mx-auto">
                Your running or scheduled orders will appear here after checkout.
              </p>

              <Link
                to="/marketplace"
                className="inline-block mt-7 bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-95 text-[#073B35] font-bold px-6 py-3 rounded-2xl transition-all duration-200"
              >
                Explore Marketplace
              </Link>
            </div>
          )}

          {user && !loading && !errorMessage && visibleOrders.length > 0 && (
            <div className="mt-8 space-y-5">
              {visibleOrders.map((order) => {
                const autoStatus = getAutoStatus(order);
                const scheduled = isScheduledOrder(order);

                return (
                  <article
                    key={order.id}
                    className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <p className="text-[#51615D] text-sm">
                          Order #{order.id}
                        </p>

                        <h2 className="text-2xl sm:text-3xl font-black mt-1 text-[#073B35]">
                          ₹{order.total_amount}
                        </h2>

                        <p className="text-[#51615D] text-sm mt-2">
                          {order.delivery_type || "Delivery"} • {order.flat}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {scheduled && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#41D3BD]/12 text-[#073B35] border border-[#41D3BD]/25">
                              🕒 Scheduled
                            </span>
                          )}

                          {scheduled && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D]">
                              {formatScheduledDateTime(order.scheduled_for)}
                            </span>
                          )}

                          {isSelfPickup(order) && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🛍️ Self Pickup
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`w-fit border text-xs font-bold px-3 py-1.5 rounded-full ${getStatusStyle(
                          autoStatus
                        )}`}
                      >
                        {getStatusLabel(order)}
                      </span>
                    </div>

                    <OrderStatusBar order={order} />

                    <button
                      type="button"
                      onClick={() => cancelOrder(order.id)}
                      className="mt-5 w-full border border-red-300 text-red-500 hover:bg-red-500 hover:text-white font-black py-3 rounded-2xl active:scale-95 transition-all"
                    >
                      Cancel Order
                    </button>

                    <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4 space-y-3">
                      {getOrderItems(order).map((item) => (
                        <div
                          key={`${order.id}-${item.id}`}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-[#111827]">
                              {item.name}
                            </p>

                            <p className="text-[#51615D] text-sm">
                              Qty {item.quantity} × ₹{item.price}
                            </p>
                          </div>

                          <p className="text-[#073B35] font-bold shrink-0">
                            ₹
                            {Number(item.price || 0) *
                              Number(item.quantity || 0)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
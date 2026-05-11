import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const ORDER_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "cooking", label: "Cooking", icon: "🍳" },
  { key: "packing", label: "Packing", icon: "📦" },
  { key: "out_for_delivery", label: "Out", icon: "🛵" },
  { key: "completed", label: "Delivered", icon: "🏁" },
];

export default function Orders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchOrders();

    const channel = supabase
      .channel(`customer-active-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchOrders() {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "completed")
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

    if (value === "placed") return "confirmed";
    if (value === "baking") return "cooking";
    if (value === "delivered") return "completed";

    return value;
  }

  function getStepIndex(status) {
    const currentStatus = normalizeStatus(status);
    const index = ORDER_STEPS.findIndex((step) => step.key === currentStatus);
    return index === -1 ? 0 : index;
  }

  function getStatusLabel(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "confirmed") return "Order Confirmed";
    if (currentStatus === "cooking") return "Cooking";
    if (currentStatus === "packing") return "Packing";
    if (currentStatus === "out_for_delivery") return "Out for Delivery";
    if (currentStatus === "completed") return "Delivered";

    return "Order Confirmed";
  }

  function getStatusStyle(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "out_for_delivery") {
      return "bg-purple-900/40 text-purple-300 border-purple-500/20";
    }

    if (currentStatus === "packing") {
      return "bg-blue-900/40 text-blue-300 border-blue-500/20";
    }

    if (currentStatus === "cooking") {
      return "bg-orange-900/40 text-orange-300 border-orange-500/20";
    }

    if (currentStatus === "completed") {
      return "bg-green-900/40 text-green-300 border-green-500/20";
    }

    return "bg-yellow-900/30 text-yellow-300 border-yellow-500/20";
  }

  function OrderStatusBar({ status }) {
    const activeIndex = getStepIndex(status);

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
                      ? "bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/20"
                      : "bg-black text-gray-500 border-[#333]"
                  } ${isCurrent ? "scale-110" : ""}`}
                >
                  {step.icon}
                </div>

                <p
                  className={`mt-2 text-[9px] sm:text-xs font-bold leading-tight ${
                    isActive ? "text-yellow-400" : "text-gray-600"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 h-2.5 bg-black border border-[#222] rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 transition-all duration-700 ease-out"
            style={{
              width: `${((activeIndex + 1) / ORDER_STEPS.length) * 100}%`,
            }}
          />
        </div>

        <p className="text-gray-500 text-xs mt-3 text-center">
          Live status updates automatically when the seller updates your order.
        </p>
      </div>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <div>
            <p className="text-yellow-400 font-semibold tracking-wide uppercase text-sm">
              Active Orders
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-3 tracking-tight">
              Live Order Tracking
            </h1>

            <p className="text-gray-400 mt-4 max-w-2xl leading-relaxed">
              Track your QuickBites orders in real time from kitchen confirmation to delivery.
            </p>
          </div>

          {!user && (
            <div className="mt-10 bg-[#111111] border border-[#222] rounded-[2rem] p-8 text-center">
              <h2 className="text-2xl font-bold">Sign in to view orders</h2>

              <Link
                to="/customer-login"
                className="inline-block mt-7 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-2xl"
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
                  className="bg-[#111111] border border-[#222] rounded-3xl p-5 animate-pulse"
                >
                  <div className="h-5 bg-[#1a1a1a] rounded-full w-1/3" />
                  <div className="h-4 bg-[#1a1a1a] rounded-full w-2/3 mt-4" />
                  <div className="h-16 bg-[#1a1a1a] rounded-2xl mt-5" />
                </div>
              ))}
            </div>
          )}

          {user && errorMessage && (
            <div className="mt-10 bg-red-950/40 border border-red-500/50 text-red-300 rounded-3xl p-5">
              <p className="font-bold">Failed to load orders</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {user && !loading && !errorMessage && orders.length === 0 && (
            <div className="mt-10 bg-[#111111] border border-[#222] rounded-[2rem] p-8 sm:p-10 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center text-4xl">
                🍲
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-6">
                No active orders
              </h2>

              <p className="text-gray-500 mt-3 max-w-md mx-auto">
                Your running orders will appear here after checkout.
              </p>

              <Link
                to="/marketplace"
                className="inline-block mt-7 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-6 py-3 rounded-2xl transition-all duration-200"
              >
                Explore Marketplace
              </Link>
            </div>
          )}

          {user && !loading && !errorMessage && orders.length > 0 && (
            <div className="mt-8 space-y-5">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="bg-[#111111] border border-[#222] rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-black/20"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Order #{order.id}</p>

                      <h2 className="text-2xl sm:text-3xl font-black mt-1">
                        ₹{order.total_amount}
                      </h2>

                      <p className="text-gray-400 text-sm mt-2">
                        {order.delivery_type || "Delivery"} • {order.flat}
                      </p>
                    </div>

                    <span
                      className={`w-fit border text-xs font-bold px-3 py-1.5 rounded-full ${getStatusStyle(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <OrderStatusBar status={order.status} />

                  <div className="mt-5 bg-black/40 border border-[#222] rounded-3xl p-4 space-y-3">
                    {(order.items || []).map((item) => (
                      <div
                        key={`${order.id}-${item.id}`}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{item.name}</p>

                          <p className="text-gray-500 text-sm">
                            Qty {item.quantity} × ₹{item.price}
                          </p>
                        </div>

                        <p className="text-yellow-400 font-bold shrink-0">
                          ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
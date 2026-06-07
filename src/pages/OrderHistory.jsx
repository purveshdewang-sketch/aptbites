import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function OrderHistory() {
  const { user } = useAuth();
  const { addToCart, clearCart } = useCart();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchCompletedOrders();

    const channel = supabase
      .channel(`customer-completed-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCompletedOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchCompletedOrders() {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["completed", "cancelled"])
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
    return String(status || "completed").toLowerCase();
  }

  function isSelfPickup(order) {
    return String(order.delivery_type || "").toLowerCase().includes("pickup");
  }

  function getStatusLabel(order) {
    const currentStatus = normalizeStatus(order.status);

    if (currentStatus === "cancelled") return "Cancelled";
    return isSelfPickup(order) ? "Picked Up" : "Delivered";
  }

  function getStatusStyle(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "cancelled") {
      return "bg-red-50 text-red-600 border-red-200";
    }

    return "bg-green-50 text-green-700 border-green-200";
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

  function getOrderDate(order) {
    if (!order.created_at) return "Date not available";

    const date = new Date(order.created_at);

    if (Number.isNaN(date.getTime())) return "Date not available";

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function handleReorder(order) {
    if (normalizeStatus(order.status) === "cancelled") {
      alert("Cancelled orders cannot be reordered directly.");
      return;
    }

    const orderItems = getOrderItems(order);

    if (orderItems.length === 0) {
      alert("This order has no items to reorder.");
      return;
    }

    clearCart();

    orderItems.forEach((item) => {
      const quantity = Number(item.quantity || 1);

      for (let i = 0; i < quantity; i++) {
        addToCart({
          ...item,
          seller_id: order.seller_id,
          quantity: 1,
        });
      }
    });

    navigate("/cart");
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <section className="relative overflow-hidden bg-white/85 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                <span>📜</span>
                <span>Order History</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                Past orders
                <span className="block text-[#111827]">and reorders</span>
              </h1>

              <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed text-sm sm:text-lg">
                View completed, picked-up, and cancelled Nefo orders. Reorder
                your favourite dishes when they are available again.
              </p>
            </div>
          </section>

          {!user && (
            <div className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-xl shadow-[#073B35]/5">
              <h2 className="text-2xl font-black text-[#111827]">
                Sign in to view history
              </h2>

              <Link
                to="/customer-login"
                className="inline-block mt-7 bg-[#073B35] hover:bg-[#0B5149] text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-[#073B35]/15"
              >
                Sign In
              </Link>
            </div>
          )}

          {user && loading && (
            <div className="mt-8 space-y-4">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-6 animate-pulse shadow-lg shadow-[#073B35]/5"
                >
                  <div className="h-5 bg-[#D7F5EF] rounded-full w-1/3" />
                  <div className="h-4 bg-[#D7F5EF] rounded-full w-2/3 mt-4" />
                  <div className="h-20 bg-[#D7F5EF] rounded-2xl mt-5" />
                </div>
              ))}
            </div>
          )}

          {user && errorMessage && (
            <div className="mt-8 bg-red-50 border border-red-200 text-red-600 rounded-3xl p-5">
              <p className="font-black">Failed to load order history</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {user && !loading && !errorMessage && orders.length === 0 && (
            <div className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 sm:p-10 text-center shadow-xl shadow-[#073B35]/5">
              <div className="w-24 h-24 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-5xl">
                📜
              </div>

              <h2 className="text-3xl sm:text-4xl font-black mt-6 text-[#111827]">
                No order history yet
              </h2>

              <p className="text-[#51615D] mt-3 max-w-md mx-auto">
                Completed and cancelled orders will appear here.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/orders"
                  className="w-full sm:w-auto bg-[#073B35] hover:bg-[#0B5149] active:scale-95 text-white font-black px-6 py-3 rounded-2xl transition-all duration-200 shadow-lg shadow-[#073B35]/15 text-center"
                >
                  View Active Orders
                </Link>

                <Link
                  to="/customer-care"
                  className="w-full sm:w-auto border border-[#41D3BD]/45 bg-[#FFFFF2] text-[#073B35] hover:bg-[#D7F5EF] active:scale-95 font-black px-6 py-3 rounded-2xl transition-all duration-200 text-center"
                >
                  Need Help?
                </Link>
              </div>
            </div>
          )}

          {user && !loading && !errorMessage && orders.length > 0 && (
            <div className="mt-8 space-y-5">
              {orders.map((order) => {
                const orderStatus = normalizeStatus(order.status);
                const orderItems = getOrderItems(order);

                return (
                  <article
                    key={order.id}
                    className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <p className="text-[#51615D] text-sm font-bold">
                          Order #{order.id}
                        </p>

                        <h2 className="text-3xl sm:text-4xl font-black mt-1 text-[#073B35]">
                          ₹{order.total_amount || 0}
                        </h2>

                        <p className="text-[#51615D] text-sm mt-2">
                          {order.delivery_type || "Delivery"} • Your address:{" "}
                          {order.flat || "Not available"}
                        </p>

                        <p className="text-[#9AA7A3] text-xs mt-2">
                          {getOrderDate(order)}
                        </p>
                      </div>

                      <span
                        className={`w-fit border text-xs font-black px-3 py-1.5 rounded-full ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order)}
                      </span>
                    </div>

                    <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4 space-y-3">
                      {orderItems.length === 0 ? (
                        <p className="text-[#51615D] text-sm">
                          No item details available for this order.
                        </p>
                      ) : (
                        orderItems.map((item) => (
                          <div
                            key={`${order.id}-${item.id}`}
                            className="flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="font-black truncate text-[#111827]">
                                {item.name}
                              </p>

                              <p className="text-[#51615D] text-sm">
                                Qty {item.quantity} × ₹{item.price}
                              </p>
                            </div>

                            <p className="text-[#073B35] font-black shrink-0">
                              ₹
                              {Number(item.price || 0) *
                                Number(item.quantity || 0)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 space-y-3 text-sm">
                      <div className="flex justify-between text-[#51615D]">
                        <span>Subtotal</span>
                        <span>₹{order.subtotal_amount || 0}</span>
                      </div>

                      <div className="flex justify-between text-[#51615D]">
                        <span>Platform Fee</span>
                        <span>₹{order.platform_fee || 10}</span>
                      </div>

                      <div className="flex justify-between text-[#073B35] font-black border-t border-[#D7F5EF] pt-3">
                        <span>Total</span>
                        <span>₹{order.total_amount || 0}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <p className="text-[#51615D] text-sm mt-4 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                        Note: {order.notes}
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {orderStatus === "cancelled" ? (
                        <div className="w-full border border-red-200 text-red-600 bg-red-50 font-black py-3 rounded-2xl text-center">
                          Cancelled
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="w-full bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.98] text-white font-black py-3 rounded-2xl transition-all duration-200 shadow-lg shadow-[#073B35]/15"
                        >
                          Re-order
                        </button>
                      )}

                      <Link
                        to={`/customer-care?order_id=${order.id}`}
                        className="w-full border border-[#41D3BD]/45 bg-[#FFFFF2] text-[#073B35] hover:bg-[#D7F5EF] active:scale-[0.98] font-black py-3 rounded-2xl transition-all duration-200 text-center"
                      >
                        Need Help?
                      </Link>
                    </div>

                    <p className="text-[#51615D] text-xs mt-4 leading-relaxed">
                      Exact kitchen door/location is not shown publicly. Pickup
                      coordination happens through Nefo after confirmation.
                    </p>
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
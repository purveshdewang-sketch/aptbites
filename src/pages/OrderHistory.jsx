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

  function getStatusLabel(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "cancelled") return "Cancelled";
    return "Delivered";
  }

  function getStatusStyle(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "cancelled") {
      return "bg-red-900/40 text-red-300 border-red-500/20";
    }

    return "bg-green-900/40 text-green-300 border-green-500/20";
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

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <div>
            <p className="text-yellow-400 font-semibold tracking-wide uppercase text-sm">
              Order History
            </p>

            <h1 className="text-4xl sm:text-5xl font-black mt-3 tracking-tight">
              Past Orders
            </h1>

            <p className="text-gray-400 mt-4 max-w-2xl leading-relaxed">
              View your delivered and cancelled Nefo orders.
            </p>
          </div>

          {!user && (
            <div className="mt-10 bg-[#111111] border border-[#222] rounded-[2rem] p-8 text-center">
              <h2 className="text-2xl font-bold">Sign in to view history</h2>

              <Link
                to="/customer-login"
                className="inline-block mt-7 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-2xl"
              >
                Sign In
              </Link>
            </div>
          )}

          {user && loading && (
            <div className="mt-10 space-y-4">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="bg-[#111111] border border-[#222] rounded-3xl p-6 animate-pulse"
                >
                  <div className="h-5 bg-[#1a1a1a] rounded-full w-1/3" />
                  <div className="h-4 bg-[#1a1a1a] rounded-full w-2/3 mt-4" />
                </div>
              ))}
            </div>
          )}

          {user && errorMessage && (
            <div className="mt-10 bg-red-950/40 border border-red-500/50 text-red-300 rounded-3xl p-5">
              <p className="font-bold">Failed to load order history</p>
              <p className="text-sm mt-1">{errorMessage}</p>
            </div>
          )}

          {user && !loading && !errorMessage && orders.length === 0 && (
            <div className="mt-10 bg-[#111111] border border-[#222] rounded-[2rem] p-8 sm:p-10 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center text-4xl">
                📜
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-6">
                No order history yet
              </h2>

              <p className="text-gray-500 mt-3 max-w-md mx-auto">
                Delivered and cancelled orders will appear here.
              </p>

              <Link
                to="/orders"
                className="inline-block mt-7 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-6 py-3 rounded-2xl transition-all duration-200"
              >
                View Active Orders
              </Link>
            </div>
          )}

          {user && !loading && !errorMessage && orders.length > 0 && (
            <div className="mt-10 space-y-5">
              {orders.map((order) => {
                const orderStatus = normalizeStatus(order.status);
                const orderItems = getOrderItems(order);

                return (
                  <article
                    key={order.id}
                    className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <p className="text-gray-500 text-sm">
                          Order #{order.id}
                        </p>

                        <h2 className="text-2xl font-black mt-1">
                          ₹{order.total_amount}
                        </h2>

                        <p className="text-gray-400 text-sm mt-2">
                          {order.delivery_type} • {order.flat}
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

                    <div className="mt-5 bg-black/40 border border-[#222] rounded-3xl p-4 space-y-3">
                      {orderItems.map((item) => (
                        <div
                          key={`${order.id}-${item.id}`}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {item.name}
                            </p>

                            <p className="text-gray-500 text-sm">
                              Qty {item.quantity} × ₹{item.price}
                            </p>
                          </div>

                          <p className="text-yellow-400 font-bold shrink-0">
                            ₹
                            {Number(item.price || 0) *
                              Number(item.quantity || 0)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 bg-black/30 border border-[#222] rounded-2xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span>
                        <span>₹{order.subtotal_amount || 0}</span>
                      </div>

                      <div className="flex justify-between text-gray-400">
                        <span>Platform Fee</span>
                        <span>₹{order.platform_fee || 10}</span>
                      </div>

                      <div className="flex justify-between text-yellow-400 font-black border-t border-[#222] pt-2">
                        <span>Total</span>
                        <span>₹{order.total_amount || 0}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <p className="text-gray-500 text-sm mt-4">
                        Note: {order.notes}
                      </p>
                    )}

                    {orderStatus === "cancelled" ? (
                      <div className="mt-5 w-full border border-red-500/30 text-red-300 bg-red-950/20 font-black py-3 rounded-2xl text-center">
                        Cancelled
                      </div>
                    ) : (
                      <button
                        onClick={() => handleReorder(order)}
                        className="mt-5 w-full bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-black py-3 rounded-2xl transition-all duration-200"
                      >
                        Re-order
                      </button>
                    )}
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
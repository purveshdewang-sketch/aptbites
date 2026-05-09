import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Orders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  async function fetchOrders() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  function getStatusStyle(status) {
    if (status === "Completed") {
      return "bg-green-900/40 text-green-300 border-green-500/20";
    }

    if (status === "Cancelled") {
      return "bg-red-900/40 text-red-300 border-red-500/20";
    }

    return "bg-yellow-900/30 text-yellow-300 border-yellow-500/20";
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <div>
            <p className="text-yellow-400 font-semibold tracking-wide uppercase text-sm">
              Your Orders
            </p>

            <h1 className="text-4xl sm:text-5xl font-black mt-3 tracking-tight">
              Order History
            </h1>

            <p className="text-gray-400 mt-4 max-w-2xl leading-relaxed">
              Track your homemade food orders from your apartment community.
            </p>
          </div>

          {!user && (
            <div className="mt-10 bg-[#111111] border border-[#222] rounded-[2rem] p-8 text-center">
              <h2 className="text-2xl font-bold">
                Sign in to view orders
              </h2>

              <p className="text-gray-500 mt-3">
                Your order history is linked to your AptBites account.
              </p>

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
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-[#111111] border border-[#222] rounded-3xl p-6 animate-pulse"
                >
                  <div className="h-5 bg-[#1a1a1a] rounded-full w-1/3" />
                  <div className="h-4 bg-[#1a1a1a] rounded-full w-2/3 mt-4" />
                  <div className="h-14 bg-[#1a1a1a] rounded-2xl mt-5" />
                </div>
              ))}
            </div>
          )}

          {user && errorMessage && (
            <div className="mt-10 bg-red-950/40 border border-red-500/50 text-red-300 rounded-3xl p-5">
              <p className="font-bold">Failed to load orders</p>

              <p className="text-sm mt-1">{errorMessage}</p>

              <button
                type="button"
                onClick={fetchOrders}
                className="mt-4 bg-red-500 hover:bg-red-400 text-black font-bold px-5 py-3 rounded-2xl"
              >
                Retry
              </button>
            </div>
          )}

          {user &&
            !loading &&
            !errorMessage &&
            orders.length === 0 && (
              <div className="mt-10 bg-[#111111] border border-[#222] rounded-[2rem] p-8 sm:p-10 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center text-4xl">
                  🍲
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold mt-6">
                  No orders yet
                </h2>

                <p className="text-gray-500 mt-3 max-w-md mx-auto">
                  Once you place an order, your food history will appear here.
                </p>

                <Link
                  to="/marketplace"
                  className="inline-block mt-7 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-6 py-3 rounded-2xl transition-all duration-200"
                >
                  Explore Marketplace
                </Link>
              </div>
            )}

          {user &&
            !loading &&
            !errorMessage &&
            orders.length > 0 && (
              <div className="mt-10 space-y-5">
                {orders.map((order) => (
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
                        {order.status || "Pending"}
                      </span>
                    </div>

                    <div className="mt-5 bg-black/40 border border-[#222] rounded-3xl p-4 space-y-3">
                      {(order.items || []).map((item) => (
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
                            ₹{item.price * item.quantity}
                          </p>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-gray-500 text-sm mt-4">
                        Note: {order.notes}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
        </div>
      </main>
    </>
  );
}
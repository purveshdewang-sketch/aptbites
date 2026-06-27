import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#E8F4F1] bg-white/90 shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]";

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
      return "border-red-200 bg-red-50 text-red-600";
    }

    return "border-[#BDEFE6] bg-[#DFF8EF] text-[#087A51]";
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

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getShortOrderId(order) {
    const value = String(order.id || "");
    return value.length > 8 ? value.slice(0, 8).toUpperCase() : value;
  }

  function getPaymentLabel(order) {
    const status = String(order.payment_status || "").replaceAll("_", " ");

    if (!status) return "Payment submitted";

    return status.charAt(0).toUpperCase() + status.slice(1);
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

      for (let index = 0; index < quantity; index += 1) {
        addToCart({
          ...item,
          seller_id: order.seller_id,
          user_id: item.user_id || order.seller_id,
          quantity: 1,
        });
      }
    });

    navigate("/cart");
  }

  const deliveredOrdersCount = useMemo(() => {
    return orders.filter((order) => normalizeStatus(order.status) === "completed")
      .length;
  }, [orders]);

  const cancelledOrdersCount = useMemo(() => {
    return orders.filter((order) => normalizeStatus(order.status) === "cancelled")
      .length;
  }, [orders]);

  const totalSpent = useMemo(() => {
    return orders
      .filter((order) => normalizeStatus(order.status) === "completed")
      .reduce((total, order) => total + Number(order.total_amount || 0), 0);
  }, [orders]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-5 pb-28 text-[#111827]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D7F5EF] bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <section className={`mt-6 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 text-4xl">
              📜
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#111827]">
              Sign in to view history
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              Your completed, picked-up, and cancelled orders will appear here.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl border border-[#073B35] bg-[#073B35] py-4 text-center text-sm font-black text-white"
            >
              Sign In
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] px-4 py-4 pb-32 text-[#111827]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D7F5EF] bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
              Order History
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#073B35]">
              Past orders
              <span className="block text-[#111827]">and reorders</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              View delivered, picked-up, and cancelled Nefo orders.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatTile label="Delivered" value={deliveredOrdersCount} />
          <StatTile label="Cancelled" value={cancelledOrdersCount} muted />
          <StatTile label="Spent" value={`₹${totalSpent}`} strong />
        </section>

        {loading ? (
          <div className="mt-5 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`animate-pulse p-5 ${CARD}`}>
                <div className="h-5 w-1/3 rounded-full bg-[#D7F5EF]" />
                <div className="mt-4 h-4 w-2/3 rounded-full bg-[#D7F5EF]" />
                <div className="mt-5 h-24 rounded-2xl border border-[#D7F5EF] bg-[#FFFFF2]" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <div className="mt-5 rounded-[28px] border border-red-200 bg-red-50 p-5">
            <p className="font-black text-red-600">
              Failed to load order history
            </p>

            <p className="mt-1 text-sm font-semibold text-red-500">
              {errorMessage}
            </p>
          </div>
        ) : null}

        {!loading && !errorMessage && orders.length === 0 ? (
          <section className={`mt-5 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 text-4xl">
              📜
            </div>

            <h2 className="mt-5 text-2xl font-black text-[#111827]">
              No order history yet
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              Completed and cancelled orders will appear here.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                to="/orders"
                className="rounded-2xl border border-[#073B35] bg-[#073B35] py-4 text-center text-sm font-black text-white active:scale-95"
              >
                View Active Orders
              </Link>

              <Link
                to="/marketplace"
                className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-center text-sm font-black text-[#073B35] active:scale-95"
              >
                Explore Marketplace
              </Link>
            </div>
          </section>
        ) : null}

        {!loading && !errorMessage && orders.length > 0 ? (
          <section className="mt-5 space-y-4">
            {orders.map((order) => {
              const orderStatus = normalizeStatus(order.status);
              const orderItems = getOrderItems(order);
              const isCancelled = orderStatus === "cancelled";

              return (
                <article key={order.id} className={`overflow-hidden ${CARD}`}>
                  <div className="border-b border-[#E8F4F1] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-[#51615D]">
                          Order #{getShortOrderId(order)}
                        </p>

                        <h2 className="mt-1 text-3xl font-black text-[#073B35]">
                          ₹{order.total_amount || 0}
                        </h2>

                        <p className="mt-1 truncate text-sm font-semibold text-[#51615D]">
                          {order.delivery_type || "Delivery"} •{" "}
                          {order.flat || "Address not available"}
                        </p>

                        <p className="mt-2 text-xs font-bold text-[#8AA5A0]">
                          {getOrderDate(order)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-black text-[#111827]">
                          Items
                        </p>

                        <p className="text-xs font-bold text-[#51615D]">
                          {orderItems.length} item
                          {orderItems.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      {orderItems.length === 0 ? (
                        <p className="text-sm font-semibold text-[#51615D]">
                          No item details available for this order.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {orderItems.map((item) => (
                            <div
                              key={`${order.id}-${item.id || item.name}`}
                              className="flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-[#111827]">
                                  {item.name}
                                </p>

                                <p className="mt-0.5 text-xs font-semibold text-[#51615D]">
                                  Qty {item.quantity} × ₹{item.price}
                                </p>
                              </div>

                              <p className="shrink-0 text-sm font-black text-[#073B35]">
                                ₹
                                {Number(item.price || 0) *
                                  Number(item.quantity || 0)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4 space-y-3">
                      <SummaryRow
                        label="Subtotal"
                        value={`₹${order.subtotal_amount || 0}`}
                      />

                      {order.packing_charge !== undefined ? (
                        <SummaryRow
                          label="Packing"
                          value={`₹${order.packing_charge || 0}`}
                        />
                      ) : null}

                      <SummaryRow
                        label="Platform Fee"
                        value={`₹${order.platform_fee || 0}`}
                      />

                      <div className="flex items-center justify-between border-t border-[#D7F5EF] pt-3">
                        <p className="font-black text-[#073B35]">Total</p>
                        <p className="font-black text-[#073B35]">
                          ₹{order.total_amount || 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#BDEFE6] bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-[#51615D]">
                        Payment
                      </p>

                      <p className="mt-1 text-sm font-black text-[#111827]">
                        {getPaymentLabel(order)}
                      </p>

                      {order.payment_reference ? (
                        <p className="mt-1 truncate text-xs font-semibold text-[#51615D]">
                          Ref: {order.payment_reference}
                        </p>
                      ) : null}
                    </div>

                    {order.scheduled_order && order.scheduled_for ? (
                      <div className="mt-3 rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/12 p-4">
                        <p className="text-sm font-black text-[#073B35]">
                          Scheduled order
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#51615D]">
                          {new Date(order.scheduled_for).toLocaleString(
                            "en-IN",
                            {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </p>
                      </div>
                    ) : null}

                    {order.notes ? (
                      <p className="mt-3 rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4 text-sm font-semibold text-[#51615D]">
                        Note: {order.notes}
                      </p>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {isCancelled ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 py-3 text-center text-sm font-black text-red-600">
                          Cancelled
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="rounded-2xl border border-[#073B35] bg-[#073B35] py-3 text-sm font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.98]"
                        >
                          Re-order
                        </button>
                      )}

                      <Link
                        to={`/customer-care?order_id=${order.id}`}
                        className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-3 text-center text-sm font-black text-[#073B35] active:scale-[0.98]"
                      >
                        Need Help
                      </Link>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-[#51615D]">
                      Exact kitchen door/location is not shown publicly. Pickup
                      coordination happens through Nefo after confirmation.
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-[#51615D]">{label}</p>
      <p className="font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function StatTile({ label, value, strong = false, muted = false }) {
  return (
    <div className="rounded-[22px] border border-[#D7F5EF] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#7A8A86]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          muted ? "text-[#8AA5A0]" : strong ? "text-[#073B35]" : "text-[#111827]"
        }`}
      >
        {value}
      </p>
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
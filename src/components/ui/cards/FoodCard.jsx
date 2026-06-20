import { Link } from "react-router-dom";
import Badge from "./Badge";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";

export default function OrderCard({
  order,
  mode = "customer",
  onAccept,
  onReject,
  onComplete,
  onReadyForPickup,
  onCancel,
}) {
  if (!order) return null;

  const items = Array.isArray(order.items)
    ? order.items
    : typeof order.items === "string"
    ? JSON.parse(order.items || "[]")
    : [];

  const status = String(order.status || "confirmed").toLowerCase();
  const sellerResponse = String(order.seller_response || "pending").toLowerCase();

  const isSeller = mode === "seller";
  const isPending = sellerResponse === "pending";
  const isAccepted = sellerResponse === "accepted";
  const isPickup = String(order.delivery_type || "").toLowerCase().includes("pickup");

  function getBadgeColor() {
    if (status === "cancelled" || sellerResponse === "rejected") return "danger";
    if (status === "completed") return "success";
    if (isPending) return "warning";
    return "primary";
  }

  function getStatusText() {
    if (sellerResponse === "rejected") return "Rejected";
    if (status === "cancelled") return "Cancelled";
    if (status === "completed") return "Completed";
    if (order.ready_for_pickup) return "Ready";
    if (isPending) return "New";
    if (isAccepted) return "Accepted";
    return "Active";
  }

  return (
    <article className="bg-white border border-[#E8F4F1] rounded-3xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[#7A8A86] font-bold">Order #{order.id}</p>

          <h3 className="text-2xl font-black text-[#073B35] mt-1">
            ₹{order.total_amount}
          </h3>

          <p className="text-sm text-[#51615D] mt-1 truncate">
            {isSeller
              ? `${order.customer_name || "Customer"} • ${order.phone || ""}`
              : order.delivery_type || "Delivery"}
          </p>

          <p className="text-xs text-[#7A8A86] mt-1 truncate">
            {order.flat || "Address not available"}
          </p>
        </div>

        <Badge color={getBadgeColor()}>{getStatusText()}</Badge>
      </div>

      {items.length > 0 && (
        <div className="mt-4 bg-[#FFFFF2] border border-[#E8F4F1] rounded-2xl p-3 space-y-2">
          {items.slice(0, 3).map((item, index) => (
            <div
              key={`${order.id}-${item.id || index}`}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-black truncate">
                  {item.name || "Item"}
                </p>

                <p className="text-xs text-[#7A8A86]">
                  Qty {item.quantity || 1} × ₹{item.price || 0}
                </p>
              </div>

              <p className="text-sm font-black text-[#073B35] shrink-0">
                ₹{Number(item.price || 0) * Number(item.quantity || 1)}
              </p>
            </div>
          ))}

          {items.length > 3 && (
            <p className="text-xs text-[#7A8A86] font-bold">
              +{items.length - 3} more items
            </p>
          )}
        </div>
      )}

      <Link
        to={`/order-chat/${order.id}`}
        className="mt-4 flex items-center justify-between gap-3 w-full bg-[#EFFFFB] border border-[#41D3BD]/40 rounded-2xl p-3 active:scale-[0.99]"
      >
        <div>
          <p className="font-black text-[#073B35]">
            {isSeller ? "Chat with customer" : "Chat with kitchen"}
          </p>

          <p className="text-xs text-[#7A8A86]">
            Order-specific messages
          </p>
        </div>

        <span className="text-xl font-black text-[#073B35]">›</span>
      </Link>

      {isSeller && isPending && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <PrimaryButton onClick={() => onAccept?.(order.id)}>
            Accept
          </PrimaryButton>

          <button
            type="button"
            onClick={() => onReject?.(order.id)}
            className="h-12 rounded-2xl bg-red-500 text-white font-black active:scale-[0.98]"
          >
            Reject
          </button>
        </div>
      )}

      {isSeller && isAccepted && (
        <div className="mt-4 space-y-3">
          {isPickup && !order.ready_for_pickup && (
            <button
              type="button"
              onClick={() => onReadyForPickup?.(order.id)}
              className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-black active:scale-[0.98]"
            >
              Ready for Pickup
            </button>
          )}

          <PrimaryButton onClick={() => onComplete?.(order.id)}>
            Complete Order
          </PrimaryButton>
        </div>
      )}

      {!isSeller && status !== "completed" && status !== "cancelled" && (
        <div className="mt-4">
          <SecondaryButton onClick={() => onCancel?.(order.id)}>
            Cancel Order
          </SecondaryButton>
        </div>
      )}
    </article>
  );
}
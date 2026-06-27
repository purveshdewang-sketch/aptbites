import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const CARD =
  "rounded-[26px] border border-[#D7F5EF] bg-white/95 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_BADGE =
  "rounded-full border border-[#BDEFE6] bg-[#FFFFF2] font-black text-[#073B35]";

export default function FoodCard({ item }) {
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity } =
    useCart();

  const [showToast, setShowToast] = useState(false);

  const cartItem = cartItems.find((cartItem) => cartItem.id === item.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const stock = Number(item.stock || 0);
  const demandBadge = item.demand_badge || null;
  const demandLabel =
    typeof demandBadge === "string" ? demandBadge : demandBadge?.label;

  const kitchenName =
    item.seller_kitchen_name || item.seller || "Home Kitchen";

  const imageSrc = item.image || "/Nefo-logo.png";

  const kitchenIsClosed = item.seller_online === false;
  const deliveryAvailable = item.delivery_available !== false;
  const pickupAvailable = item.pickup_available !== false;
  const fulfillmentUnavailable = !deliveryAvailable && !pickupAvailable;

  const isLowStock = stock > 0 && stock <= 2;
  const isSoldOut = stock <= 0;
  const isBlocked = kitchenIsClosed || isSoldOut || fulfillmentUnavailable;

  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (kitchenIsClosed) {
      alert("This kitchen is closed right now.");
      return;
    }

    if (fulfillmentUnavailable) {
      alert("This kitchen is not taking delivery or pickup orders right now.");
      return;
    }

    if (isSoldOut) return;

    addToCart(item);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 1400);
  }

  function handleDecrease(event) {
    event.preventDefault();
    event.stopPropagation();
    decreaseQuantity(item.id);
  }

  function handleIncrease(event) {
    event.preventDefault();
    event.stopPropagation();

    if (quantity >= stock) {
      alert(`Only ${stock} available.`);
      return;
    }

    increaseQuantity(item.id);
  }

  function getAvailabilityText() {
    if (kitchenIsClosed) return "Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold out";
    if (isLowStock) return `Only ${stock} left`;
    return `${stock} left`;
  }

  function getAvailabilityClass() {
    if (kitchenIsClosed || fulfillmentUnavailable || isSoldOut || isLowStock) {
      return "text-red-500";
    }

    return "text-[#0B8F80]";
  }

  function getBlockedLabel() {
    if (kitchenIsClosed) return "Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold out";
    return "Unavailable";
  }

  function getButtonLabel() {
    if (kitchenIsClosed) return "Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold Out";
    return "ADD";
  }

  function FulfillmentBadges({ compact = false }) {
    if (fulfillmentUnavailable) {
      return (
        <span
          className={`rounded-full border border-red-200 bg-red-50 font-black text-red-600 ${
            compact ? "px-2 py-0.5 text-[9px]" : "px-3 py-1.5 text-[11px]"
          }`}
        >
          Not taking orders
        </span>
      );
    }

    return (
      <>
        {deliveryAvailable ? (
          <span
            className={`rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 font-black text-[#073B35] ${
              compact ? "px-2 py-0.5 text-[9px]" : "px-3 py-1.5 text-[11px]"
            }`}
          >
            🚚 Delivery
          </span>
        ) : null}

        {pickupAvailable ? (
          <span
            className={`${SOFT_BADGE} ${
              compact ? "px-2 py-0.5 text-[9px]" : "px-3 py-1.5 text-[11px]"
            }`}
          >
            🛍️ Pickup
          </span>
        ) : null}
      </>
    );
  }

  return (
    <>
      {showToast ? (
        <div className="fixed left-3 right-3 top-24 z-[999] rounded-[24px] border border-[#BDEFE6] bg-white p-4 shadow-2xl shadow-[#073B35]/20 sm:left-1/2 sm:right-auto sm:w-[340px] sm:-translate-x-1/2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/15 text-xl">
              ✅
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-black text-[#073B35]">Added to cart</p>

              <p className="mt-1 truncate text-sm font-semibold text-[#51615D]">
                {item.name} added successfully.
              </p>
            </div>
          </div>

          <Link
            to="/cart"
            className="mt-4 block rounded-2xl border border-[#073B35] bg-[#073B35] py-3 text-center font-black text-white"
          >
            View Cart
          </Link>
        </div>
      ) : null}

      <article
        className={`${CARD} overflow-hidden transition-all duration-300 ${
          kitchenIsClosed || fulfillmentUnavailable
            ? "border-red-200"
            : "hover:border-[#41D3BD] hover:shadow-xl hover:shadow-[#073B35]/10"
        }`}
      >
        <div className="sm:hidden">
          <Link to={`/food/${item.id}`} className="block p-2.5">
            <div className="flex gap-3">
              <div className="relative h-[116px] w-[116px] shrink-0 overflow-hidden rounded-[22px] border border-[#BDEFE6] bg-[#D7F5EF]">
                <img
                  src={imageSrc}
                  alt={item.name}
                  className={`h-full w-full object-cover ${
                    kitchenIsClosed || fulfillmentUnavailable
                      ? "grayscale opacity-45"
                      : ""
                  }`}
                />

                <div className="absolute left-2 top-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black shadow-sm ${
                      item.type === "Non-Veg"
                        ? "bg-red-500 text-white"
                        : "bg-[#41D3BD] text-[#073B35]"
                    }`}
                  >
                    {item.type || "Veg"}
                  </span>
                </div>

                {demandLabel &&
                !kitchenIsClosed &&
                !isSoldOut &&
                !fulfillmentUnavailable ? (
                  <div className="absolute bottom-2 left-2 right-2 rounded-xl border border-[#BDEFE6] bg-white/95 px-2 py-1 backdrop-blur">
                    <p className="truncate text-[9px] font-black text-[#0B8F80]">
                      🔥 {demandLabel}
                    </p>
                  </div>
                ) : null}

                {isBlocked ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/65 px-2 text-center">
                    <p className="text-[11px] font-black text-white">
                      {getBlockedLabel()}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3
                      className={`line-clamp-2 text-[15px] font-black leading-tight ${
                        kitchenIsClosed || fulfillmentUnavailable
                          ? "text-[#9AA7A3]"
                          : "text-[#111827]"
                      }`}
                    >
                      {item.name}
                    </h3>

                    <p className="mt-1 truncate text-[11px] font-semibold text-[#51615D]">
                      {kitchenName}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-lg font-black ${
                      kitchenIsClosed || fulfillmentUnavailable
                        ? "text-[#9AA7A3]"
                        : "text-[#073B35]"
                    }`}
                  >
                    ₹{item.price}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <FulfillmentBadges compact />
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <p className="truncate text-[11px] text-[#51615D]">
                    Ready{" "}
                    <span className="font-bold text-[#111827]">
                      {item.time || "Soon"}
                    </span>
                  </p>

                  <span className="text-[#B8D9D3]">•</span>

                  <p className={`text-[11px] font-black ${getAvailabilityClass()}`}>
                    {getAvailabilityText()}
                  </p>
                </div>

                {item.description ? (
                  <p className="mt-1.5 line-clamp-1 text-[11px] text-[#51615D]">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          </Link>

          <div className="flex justify-end px-2.5 pb-2.5">
            {quantity === 0 || isBlocked ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isBlocked}
                className={`h-10 min-w-[92px] rounded-2xl border px-3 text-xs font-black transition-all ${
                  isBlocked
                    ? "cursor-not-allowed border-red-100 bg-[#EAF7F4] text-[#9AA7A3]"
                    : "border-[#41D3BD] bg-[#41D3BD] text-[#073B35] shadow-lg shadow-[#41D3BD]/20 active:scale-95"
                }`}
              >
                {getButtonLabel()}
              </button>
            ) : (
              <div className="flex items-center overflow-hidden rounded-2xl border border-[#073B35] bg-[#073B35] font-black text-white shadow-lg shadow-[#073B35]/15">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="h-10 w-9 text-lg active:bg-[#0B5149]"
                >
                  −
                </button>

                <span className="flex h-10 min-w-9 items-center justify-center bg-[#41D3BD] text-xs text-[#073B35]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= stock}
                  className={`h-10 w-9 text-lg ${
                    quantity >= stock
                      ? "cursor-not-allowed opacity-40"
                      : "active:bg-[#0B5149]"
                  }`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:block">
          <Link to={`/food/${item.id}`} className="block">
            <div className="relative aspect-[4/3] overflow-hidden border-b border-[#D7F5EF] bg-[#D7F5EF]">
              <img
                src={imageSrc}
                alt={item.name}
                className={`h-full w-full object-cover transition-all duration-500 ${
                  kitchenIsClosed || fulfillmentUnavailable
                    ? "grayscale opacity-45"
                    : "hover:scale-105"
                }`}
              />

              <div className="absolute left-3 top-3 flex flex-wrap gap-2 pr-24">
                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${
                    item.type === "Non-Veg"
                      ? "bg-red-500 text-white"
                      : "bg-[#41D3BD] text-[#073B35]"
                  }`}
                >
                  {item.type || "Veg"}
                </span>

                {demandLabel &&
                !kitchenIsClosed &&
                !isSoldOut &&
                !fulfillmentUnavailable ? (
                  <span className="w-fit rounded-full border border-[#BDEFE6] bg-white/95 px-3 py-1.5 text-xs font-black text-[#073B35] shadow-sm">
                    🔥 {demandLabel}
                  </span>
                ) : null}
              </div>

              <div className="absolute right-3 top-3 z-20">
                {kitchenIsClosed ? (
                  <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    CLOSED
                  </span>
                ) : fulfillmentUnavailable ? (
                  <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    OFF
                  </span>
                ) : isSoldOut ? (
                  <span className="rounded-full bg-[#111827] px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    SOLD OUT
                  </span>
                ) : isLowStock ? (
                  <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    Only {stock} left
                  </span>
                ) : (
                  <span className="rounded-full border border-[#41D3BD]/35 bg-white/95 px-3 py-1.5 text-xs font-black text-[#073B35] shadow-sm">
                    Available
                  </span>
                )}
              </div>

              <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-2">
                <FulfillmentBadges />
              </div>

              {isBlocked ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 px-4 text-center">
                  <div className="rounded-2xl border border-[#BDEFE6] bg-white/95 px-5 py-4 font-black text-[#073B35] shadow-xl">
                    <p className="text-lg leading-tight">
                      {kitchenIsClosed
                        ? "Kitchen Closed"
                        : fulfillmentUnavailable
                        ? "Not Taking Orders"
                        : "Sold Out"}
                    </p>

                    <p className="mt-1 text-xs text-[#51615D]">
                      Ordering is temporarily unavailable
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4">
              <div className="min-h-[122px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className={`truncate text-xl font-black ${
                        kitchenIsClosed || fulfillmentUnavailable
                          ? "text-[#9AA7A3]"
                          : "text-[#111827]"
                      }`}
                    >
                      {item.name}
                    </h3>

                    <p className="mt-1 truncate text-sm text-[#51615D]">
                      Kitchen: {kitchenName}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-2xl font-black ${
                      kitchenIsClosed || fulfillmentUnavailable
                        ? "text-[#9AA7A3]"
                        : "text-[#073B35]"
                    }`}
                  >
                    ₹{item.price}
                  </p>
                </div>

                {item.description ? (
                  <p className="mt-3 line-clamp-2 text-sm text-[#51615D]">
                    {item.description}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <FulfillmentBadges />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[#51615D]">
                  Ready{" "}
                  <span className="font-bold text-[#111827]">
                    {item.time || "Soon"}
                  </span>
                </p>

                <p className={`text-sm font-black ${getAvailabilityClass()}`}>
                  {getAvailabilityText()}
                </p>
              </div>
            </div>
          </Link>

          <div className="px-4 pb-4">
            {quantity === 0 || isBlocked ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isBlocked}
                className={`w-full rounded-2xl border py-4 text-base font-black transition-all duration-200 ${
                  isBlocked
                    ? "cursor-not-allowed border-red-100 bg-[#EAF7F4] text-[#9AA7A3]"
                    : "border-[#073B35] bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.98]"
                }`}
              >
                {isBlocked ? getButtonLabel() : "+ Add to Cart"}
              </button>
            ) : (
              <div className="flex items-center justify-between overflow-hidden rounded-2xl border border-[#073B35] bg-[#073B35] font-black text-white shadow-lg shadow-[#073B35]/15">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="flex-1 py-4 text-xl hover:bg-[#0B5149]"
                >
                  −
                </button>

                <span className="min-w-[70px] bg-[#41D3BD] px-5 py-4 text-center text-lg text-[#073B35]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= stock}
                  className={`flex-1 py-4 text-xl ${
                    quantity >= stock
                      ? "cursor-not-allowed opacity-40"
                      : "hover:bg-[#0B5149]"
                  }`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
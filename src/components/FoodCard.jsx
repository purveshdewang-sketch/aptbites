import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function FoodCard({ item }) {
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity } = useCart();

  const [showToast, setShowToast] = useState(false);

  const cartItem = cartItems.find((cartItem) => cartItem.id === item.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const stock = Number(item.stock || 0);
  const demandBadge = item.demand_badge || null;

  const kitchenName = item.seller_kitchen_name || item.seller || "Home Kitchen";

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

    return "text-[#1A9F8D]";
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
          className={`bg-red-50 text-red-600 border border-red-100 font-black rounded-full ${
            compact ? "text-[9px] px-2 py-0.5" : "text-[11px] px-3 py-1.5"
          }`}
        >
          Not taking orders
        </span>
      );
    }

    return (
      <>
        {deliveryAvailable && (
          <span
            className={`bg-[#41D3BD]/12 text-[#073B35] border border-[#41D3BD]/25 font-black rounded-full ${
              compact ? "text-[9px] px-2 py-0.5" : "text-[11px] px-3 py-1.5"
            }`}
          >
            🚚 Delivery
          </span>
        )}

        {pickupAvailable && (
          <span
            className={`bg-[#FFFFF2] text-[#073B35] border border-[#D7F5EF] font-black rounded-full ${
              compact ? "text-[9px] px-2 py-0.5" : "text-[11px] px-3 py-1.5"
            }`}
          >
            🛍️ Pickup
          </span>
        )}
      </>
    );
  }

  return (
    <>
      {showToast && (
        <div className="fixed top-24 left-3 right-3 z-[999] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[340px] bg-white border border-[#D7F5EF] rounded-[1.5rem] p-4 shadow-2xl shadow-[#073B35]/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-xl">
              ✅
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[#073B35] font-black">Added to cart</p>

              <p className="text-[#51615D] text-sm mt-1 truncate">
                {item.name} added successfully.
              </p>
            </div>
          </div>

          <Link
            to="/cart"
            className="block text-center mt-4 bg-[#073B35] hover:bg-[#0B5149] text-white font-black py-3 rounded-2xl"
          >
            View Cart
          </Link>
        </div>
      )}

      <Link
        to={`/food/${item.id}`}
        className={`group block bg-white border rounded-[1.35rem] sm:rounded-[1.75rem] overflow-hidden transition-all duration-300 shadow-lg shadow-[#073B35]/5 ${
          kitchenIsClosed || fulfillmentUnavailable
            ? "border-red-200"
            : "border-[#D7F5EF] hover:border-[#41D3BD]/70 hover:shadow-xl hover:shadow-[#073B35]/10"
        }`}
      >
        <div className="sm:hidden p-2.5">
          <div className="flex gap-3">
            <div className="relative w-[116px] h-[116px] shrink-0 rounded-[1.25rem] overflow-hidden bg-[#D7F5EF]">
              <img
                src={item.image}
                alt={item.name}
                className={`w-full h-full object-cover ${
                  kitchenIsClosed || fulfillmentUnavailable ? "grayscale opacity-45" : ""
                }`}
              />

              <div className="absolute top-2 left-2">
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                    item.type === "Non-Veg"
                      ? "bg-red-500 text-white"
                      : "bg-[#41D3BD] text-[#073B35]"
                  }`}
                >
                  {item.type || "Veg"}
                </span>
              </div>

              {demandBadge &&
                !kitchenIsClosed &&
                !isSoldOut &&
                !fulfillmentUnavailable && (
                  <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur border border-[#D7F5EF] rounded-xl px-2 py-1">
                    <p className="text-[#1A9F8D] text-[9px] font-black truncate">
                      🔥 {demandBadge.label}
                    </p>
                  </div>
                )}

              {isBlocked && (
                <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-center px-2">
                  <p className="text-white text-[11px] font-black">
                    {getBlockedLabel()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3
                    className={`text-[15px] font-black leading-tight line-clamp-2 ${
                      kitchenIsClosed || fulfillmentUnavailable
                        ? "text-[#9AA7A3]"
                        : "text-[#111827]"
                    }`}
                  >
                    {item.name}
                  </h3>

                  <p className="text-[#51615D] text-[11px] mt-1 truncate">
                    {kitchenName}
                  </p>
                </div>

                <p
                  className={`font-black text-lg shrink-0 ${
                    kitchenIsClosed || fulfillmentUnavailable
                      ? "text-[#9AA7A3]"
                      : "text-[#073B35]"
                  }`}
                >
                  ₹{item.price}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                <FulfillmentBadges compact />
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <p className="text-[#51615D] text-[11px] truncate">
                  Ready{" "}
                  <span className="text-[#111827] font-bold">
                    {item.time || "Soon"}
                  </span>
                </p>

                <span className="text-[#B8D9D3]">•</span>

                <p className={`text-[11px] font-black ${getAvailabilityClass()}`}>
                  {getAvailabilityText()}
                </p>
              </div>

              {item.description && (
                <p className="text-[#51615D] text-[11px] mt-1.5 line-clamp-1">
                  {item.description}
                </p>
              )}

              <div className="flex justify-end mt-2.5">
                {quantity === 0 || isBlocked ? (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isBlocked}
                    className={`min-w-[78px] h-10 font-black px-3 rounded-2xl text-xs border transition-all ${
                      isBlocked
                        ? "bg-[#EAF7F4] text-[#9AA7A3] border-red-100 cursor-not-allowed"
                        : "bg-[#41D3BD] text-[#073B35] border-[#41D3BD] shadow-lg shadow-[#41D3BD]/20 active:scale-95"
                    }`}
                  >
                    {getButtonLabel()}
                  </button>
                ) : (
                  <div className="flex items-center overflow-hidden rounded-2xl bg-[#073B35] text-white font-black shadow-lg shadow-[#073B35]/15">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      className="w-9 h-10 text-lg active:bg-[#0B5149]"
                    >
                      −
                    </button>

                    <span className="min-w-9 h-10 flex items-center justify-center text-xs bg-[#41D3BD] text-[#073B35]">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={handleIncrease}
                      disabled={quantity >= stock}
                      className={`w-9 h-10 text-lg ${
                        quantity >= stock
                          ? "opacity-40 cursor-not-allowed"
                          : "active:bg-[#0B5149]"
                      }`}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#D7F5EF]">
            <img
              src={item.image}
              alt={item.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                kitchenIsClosed || fulfillmentUnavailable
                  ? "grayscale opacity-45"
                  : "group-hover:scale-105"
              }`}
            />

            <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-24">
              <span
                className={`w-fit text-xs font-black px-3 py-1.5 rounded-full shadow-sm ${
                  item.type === "Non-Veg"
                    ? "bg-red-500 text-white"
                    : "bg-[#41D3BD] text-[#073B35]"
                }`}
              >
                {item.type || "Veg"}
              </span>

              {demandBadge &&
                !kitchenIsClosed &&
                !isSoldOut &&
                !fulfillmentUnavailable && (
                  <span className="w-fit text-xs font-black px-3 py-1.5 rounded-full bg-white/95 text-[#073B35] border border-[#D7F5EF] shadow-sm">
                    🔥 {demandBadge.label}
                  </span>
                )}
            </div>

            <div className="absolute top-3 right-3 z-20">
              {kitchenIsClosed ? (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-600 text-white shadow-sm">
                  CLOSED
                </span>
              ) : fulfillmentUnavailable ? (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-600 text-white shadow-sm">
                  OFF
                </span>
              ) : isSoldOut ? (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#111827] text-white shadow-sm">
                  SOLD OUT
                </span>
              ) : isLowStock ? (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-500 text-white shadow-sm">
                  Only {stock} left
                </span>
              ) : (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-white/95 text-[#073B35] border border-[#41D3BD]/35 shadow-sm">
                  Available
                </span>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-2">
              <FulfillmentBadges />
            </div>

            {isBlocked && (
              <div className="absolute inset-0 z-10 bg-black/65 flex items-center justify-center px-4 text-center">
                <div className="bg-white/95 text-[#073B35] font-black px-5 py-4 rounded-2xl shadow-xl">
                  <p className="text-lg leading-tight">
                    {kitchenIsClosed
                      ? "Kitchen Closed"
                      : fulfillmentUnavailable
                      ? "Not Taking Orders"
                      : "Sold Out"}
                  </p>

                  <p className="text-[#51615D] text-xs mt-1">
                    Ordering is temporarily unavailable
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="min-h-[122px]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className={`text-xl font-black truncate ${
                      kitchenIsClosed || fulfillmentUnavailable
                        ? "text-[#9AA7A3]"
                        : "text-[#111827]"
                    }`}
                  >
                    {item.name}
                  </h3>

                  <p className="text-[#51615D] text-sm mt-1 truncate">
                    Kitchen: {kitchenName}
                  </p>
                </div>

                <p
                  className={`font-black text-2xl shrink-0 ${
                    kitchenIsClosed || fulfillmentUnavailable
                      ? "text-[#9AA7A3]"
                      : "text-[#073B35]"
                  }`}
                >
                  ₹{item.price}
                </p>
              </div>

              {item.description && (
                <p className="text-[#51615D] text-sm mt-3 line-clamp-2">
                  {item.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <FulfillmentBadges />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-4">
              <p className="text-[#51615D] text-sm">
                Ready{" "}
                <span className="text-[#111827] font-bold">
                  {item.time || "Soon"}
                </span>
              </p>

              <p className={`text-sm font-black ${getAvailabilityClass()}`}>
                {getAvailabilityText()}
              </p>
            </div>

            <div className="mt-5">
              {quantity === 0 || isBlocked ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isBlocked}
                  className={`w-full font-black py-4 rounded-2xl transition-all duration-200 text-base ${
                    isBlocked
                      ? "bg-[#EAF7F4] text-[#9AA7A3] cursor-not-allowed border border-red-100"
                      : "bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.98] text-white shadow-lg shadow-[#073B35]/15"
                  }`}
                >
                  {isBlocked ? getButtonLabel() : "+ Add to Cart"}
                </button>
              ) : (
                <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-[#073B35] text-white font-black shadow-lg shadow-[#073B35]/15">
                  <button
                    type="button"
                    onClick={handleDecrease}
                    className="flex-1 py-4 text-xl hover:bg-[#0B5149]"
                  >
                    −
                  </button>

                  <span className="px-5 py-4 bg-[#41D3BD] text-[#073B35] text-lg min-w-[70px] text-center">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={quantity >= stock}
                    className={`flex-1 py-4 text-xl ${
                      quantity >= stock
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-[#0B5149]"
                    }`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}
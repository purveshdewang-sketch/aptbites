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

  const kitchenName = item.seller || item.seller_kitchen_name || "Home Kitchen";

  const kitchenIsClosed = item.seller_online === false;
  const isLowStock = stock > 0 && stock <= 2;
  const isSoldOut = stock <= 0;
  const isBlocked = kitchenIsClosed || isSoldOut;

  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (kitchenIsClosed) {
      alert("This kitchen is closed right now.");
      return;
    }

    if (isSoldOut) return;

    addToCart(item);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 1600);
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

  return (
    <>
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] w-[92%] sm:w-[340px] bg-[#FFFFF2] border border-[#D7F5EF] rounded-[1.5rem] p-4 shadow-2xl shadow-[#073B35]/20">
          <p className="text-[#073B35] font-black">Added to cart</p>

          <p className="text-[#51615D] text-sm mt-1">
            {item.name} added successfully.
          </p>

          <Link
            to="/cart"
            className="block text-center mt-4 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black py-3 rounded-2xl"
          >
            View Cart
          </Link>
        </div>
      )}

      <Link
        to={`/food/${item.id}`}
        className={`group block bg-white border rounded-[1.5rem] overflow-hidden transition-all duration-300 shadow-lg shadow-[#073B35]/5 ${
          kitchenIsClosed
            ? "border-red-300"
            : "border-[#D7F5EF] hover:border-[#41D3BD]/70 hover:shadow-xl hover:shadow-[#41D3BD]/10"
        }`}
      >
        {/* Mobile layout */}
        <div className="sm:hidden p-4">
          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`w-fit text-[11px] font-black px-2.5 py-1 rounded-full ${
                    item.type === "Non-Veg"
                      ? "bg-red-500 text-white"
                      : "bg-[#41D3BD] text-[#073B35]"
                  }`}
                >
                  {item.type || "Veg"}
                </span>
              </div>

              <h3
                className={`text-lg font-black mt-3 leading-tight line-clamp-2 ${
                  kitchenIsClosed ? "text-[#9AA7A3]" : "text-[#111827]"
                }`}
              >
                {item.name}
              </h3>

              <p className="text-[#51615D] text-sm mt-1 truncate">
                Kitchen: {kitchenName}
              </p>

              <p
                className={`font-black text-2xl mt-3 ${
                  kitchenIsClosed ? "text-[#9AA7A3]" : "text-[#073B35]"
                }`}
              >
                ₹{item.price}
              </p>

              {demandBadge && !kitchenIsClosed && !isSoldOut && (
                <p className="text-[#1A9F8D] text-xs font-black mt-2">
                  📈 {demandBadge.label}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <p className="text-[#51615D] text-xs">
                  Ready:{" "}
                  <span className="text-[#111827] font-bold">
                    {item.time}
                  </span>
                </p>

                <span className="text-[#B8D9D3]">•</span>

                <p
                  className={`text-xs font-bold ${
                    kitchenIsClosed
                      ? "text-red-500"
                      : isSoldOut
                      ? "text-[#9AA7A3]"
                      : isLowStock
                      ? "text-red-500"
                      : "text-[#1A9F8D]"
                  }`}
                >
                  {kitchenIsClosed
                    ? "Closed"
                    : isSoldOut
                    ? "Sold Out"
                    : `${stock} left`}
                </p>
              </div>
            </div>

            <div className="w-32 shrink-0">
              <div className="relative w-32 h-32 rounded-3xl overflow-hidden bg-[#D7F5EF]">
                <img
                  src={item.image}
                  alt={item.name}
                  className={`w-full h-full object-cover ${
                    kitchenIsClosed ? "grayscale opacity-45" : ""
                  }`}
                />

                {kitchenIsClosed && (
                  <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-center px-2">
                    <p className="text-white text-xs font-black">CLOSED</p>
                  </div>
                )}

                {!kitchenIsClosed && isSoldOut && (
                  <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-center px-2">
                    <p className="text-white text-xs font-black">SOLD OUT</p>
                  </div>
                )}
              </div>

              <div className="-mt-5 relative z-10 px-2">
                {quantity === 0 || kitchenIsClosed ? (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isBlocked}
                    className={`w-full font-black py-2.5 rounded-xl text-sm border transition-all ${
                      isBlocked
                        ? "bg-[#EAF7F4] text-[#9AA7A3] border-red-200 cursor-not-allowed"
                        : "bg-[#41D3BD] text-[#073B35] border-[#41D3BD] shadow-lg shadow-[#41D3BD]/20"
                    }`}
                  >
                    ADD
                  </button>
                ) : (
                  <div className="flex items-center justify-between overflow-hidden rounded-xl bg-[#41D3BD] text-[#073B35] font-black shadow-lg shadow-[#41D3BD]/20 border border-[#41D3BD]">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      className="w-9 py-2 text-lg active:bg-[#55E4CF]"
                    >
                      −
                    </button>

                    <span className="min-w-8 text-center text-sm bg-[#55E4CF] py-2">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={handleIncrease}
                      disabled={quantity >= stock}
                      className={`w-9 py-2 text-lg ${
                        quantity >= stock
                          ? "opacity-40 cursor-not-allowed"
                          : "active:bg-[#55E4CF]"
                      }`}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {item.description && (
            <p className="text-[#51615D] text-sm mt-4 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Desktop / tablet layout */}
        <div className="hidden sm:block">
          <div className="relative aspect-square overflow-hidden bg-[#D7F5EF]">
            <img
              src={item.image}
              alt={item.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                kitchenIsClosed
                  ? "grayscale opacity-45"
                  : "group-hover:scale-105"
              }`}
            />

            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <span
                className={`w-fit text-xs font-black px-3 py-1.5 rounded-full ${
                  item.type === "Non-Veg"
                    ? "bg-red-500 text-white"
                    : "bg-[#41D3BD] text-[#073B35]"
                }`}
              >
                {item.type || "Veg"}
              </span>
            </div>

            <div className="absolute top-3 right-3 z-20">
              {kitchenIsClosed ? (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-600 text-white">
                  CLOSED
                </span>
              ) : isSoldOut ? (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#111827] text-white">
                  Sold Out
                </span>
              ) : isLowStock ? (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-500 text-white">
                  Only {stock} left
                </span>
              ) : (
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#FFFFF2]/95 text-[#073B35] border border-[#41D3BD]/35">
                  Available
                </span>
              )}
            </div>

            {demandBadge && !kitchenIsClosed && !isSoldOut && (
              <div className="absolute left-3 bottom-3 z-20 max-w-[82%] bg-[#FFFFF2]/95 backdrop-blur border border-[#D7F5EF] rounded-2xl px-3 py-2 shadow-xl">
                <p className="text-[#1A9F8D] text-xs font-black leading-tight">
                  📈 {demandBadge.label}
                </p>

                <p className="text-[#111827] text-[11px] font-bold mt-0.5">
                  {demandBadge.sublabel}
                </p>
              </div>
            )}

            {kitchenIsClosed && (
              <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center px-4 text-center">
                <div className="bg-red-600 text-white font-black px-5 py-4 rounded-2xl">
                  <p className="text-lg leading-tight">🔴 Kitchen Closed</p>
                  <p className="text-xs mt-1 opacity-90">
                    Ordering is temporarily unavailable
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className={`text-xl font-black truncate ${
                    kitchenIsClosed ? "text-[#9AA7A3]" : "text-[#111827]"
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
                  kitchenIsClosed ? "text-[#9AA7A3]" : "text-[#073B35]"
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

            <div className="flex items-center justify-between gap-3 mt-4">
              <p className="text-[#51615D] text-sm">
                Ready: <span className="text-[#111827]">{item.time}</span>
              </p>

              <p
                className={`text-sm font-bold ${
                  kitchenIsClosed
                    ? "text-red-500"
                    : isSoldOut
                    ? "text-[#9AA7A3]"
                    : isLowStock
                    ? "text-red-500"
                    : "text-[#1A9F8D]"
                }`}
              >
                {kitchenIsClosed
                  ? "Kitchen Closed"
                  : isSoldOut
                  ? "Unavailable"
                  : `${stock} left`}
              </p>
            </div>

            <div className="mt-5">
              {quantity === 0 || kitchenIsClosed ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isBlocked}
                  className={`w-full font-black py-4 rounded-2xl transition-all duration-200 text-base ${
                    isBlocked
                      ? "bg-[#EAF7F4] text-[#9AA7A3] cursor-not-allowed border border-red-200"
                      : "bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.98] text-[#073B35] shadow-lg shadow-[#41D3BD]/20"
                  }`}
                >
                  {kitchenIsClosed
                    ? "Kitchen Closed"
                    : isSoldOut
                    ? "Unavailable"
                    : "+ Add to Cart"}
                </button>
              ) : (
                <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-[#41D3BD] text-[#073B35] font-black shadow-lg shadow-[#41D3BD]/20">
                  <button
                    type="button"
                    onClick={handleDecrease}
                    className="flex-1 py-4 text-xl hover:bg-[#55E4CF]"
                  >
                    −
                  </button>

                  <span className="px-5 py-4 bg-[#55E4CF] text-lg min-w-[70px] text-center">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={quantity >= stock}
                    className={`flex-1 py-4 text-xl ${
                      quantity >= stock
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-[#55E4CF]"
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
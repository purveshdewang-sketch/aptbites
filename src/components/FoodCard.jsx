import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function FoodCard({ item }) {
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity } = useCart();

  const [showToast, setShowToast] = useState(false);

  const cartItem = cartItems.find((cartItem) => cartItem.id === item.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const stock = Number(item.stock || 0);
  const category = item.category || "Meals";
  const demandBadge = item.demand_badge || null;

  const sellerIsClosed = item.seller_online === false;
  const isLowStock = stock > 0 && stock <= 2;
  const isSoldOut = stock <= 0;
  const isBlocked = sellerIsClosed || isSoldOut;

  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (sellerIsClosed) {
      alert("Seller is closed right now.");
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999] w-[92%] sm:w-[340px] bg-white border border-[#EADCC8] rounded-[1.5rem] p-4 shadow-2xl shadow-[#315245]/20">
          <p className="text-[#315245] font-black">Added to cart</p>

          <p className="text-[#6B6258] text-sm mt-1">
            {item.name} added successfully.
          </p>

          <Link
            to="/cart"
            className="block text-center mt-4 bg-gradient-to-r from-[#315245] to-[#4D7A66] hover:from-[#29463B] hover:to-[#416B59] text-white font-black py-3 rounded-2xl"
          >
            View Cart
          </Link>
        </div>
      )}

      <Link
        to={`/food/${item.id}`}
        className={`group block bg-white/85 border rounded-[1.5rem] overflow-hidden transition-all duration-300 shadow-lg shadow-[#111827]/5 ${
          sellerIsClosed
            ? "border-red-300"
            : "border-[#EADCC8] hover:border-[#315245]/50 hover:shadow-xl hover:shadow-[#315245]/10"
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
                      : "bg-[#315245] text-white"
                  }`}
                >
                  {item.type}
                </span>

                <span className="w-fit text-[11px] font-black px-2.5 py-1 rounded-full bg-[#FFF7ED] text-[#B45309] border border-[#F59E0B]/25">
                  {category}
                </span>
              </div>

              <h3
                className={`text-lg font-black mt-3 leading-tight line-clamp-2 ${
                  sellerIsClosed ? "text-[#9A8F83]" : "text-[#111827]"
                }`}
              >
                {item.name}
              </h3>

              <p className="text-[#6B6258] text-sm mt-1 truncate">
                By {item.seller}
              </p>

              <p
                className={`font-black text-2xl mt-3 ${
                  sellerIsClosed ? "text-[#9A8F83]" : "text-[#315245]"
                }`}
              >
                ₹{item.price}
              </p>

              {demandBadge && !sellerIsClosed && !isSoldOut && (
                <p className="text-[#B45309] text-xs font-black mt-2">
                  📈 {demandBadge.label}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <p className="text-[#6B6258] text-xs">
                  Ready:{" "}
                  <span className="text-[#111827] font-bold">{item.time}</span>
                </p>

                <span className="text-[#C8BBAA]">•</span>

                <p
                  className={`text-xs font-bold ${
                    sellerIsClosed
                      ? "text-red-500"
                      : isSoldOut
                      ? "text-[#9A8F83]"
                      : isLowStock
                      ? "text-red-500"
                      : "text-[#4D7A66]"
                  }`}
                >
                  {sellerIsClosed
                    ? "Closed"
                    : isSoldOut
                    ? "Sold Out"
                    : `${stock} left`}
                </p>
              </div>
            </div>

            <div className="w-32 shrink-0">
              <div className="relative w-32 h-32 rounded-3xl overflow-hidden bg-[#F3E7D8]">
                <img
                  src={item.image}
                  alt={item.name}
                  className={`w-full h-full object-cover ${
                    sellerIsClosed ? "grayscale opacity-45" : ""
                  }`}
                />

                {sellerIsClosed && (
                  <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-center px-2">
                    <p className="text-white text-xs font-black">CLOSED</p>
                  </div>
                )}

                {!sellerIsClosed && isSoldOut && (
                  <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-center px-2">
                    <p className="text-white text-xs font-black">SOLD OUT</p>
                  </div>
                )}
              </div>

              <div className="-mt-5 relative z-10 px-2">
                {quantity === 0 || sellerIsClosed ? (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isBlocked}
                    className={`w-full font-black py-2.5 rounded-xl text-sm border transition-all ${
                      isBlocked
                        ? "bg-[#F3E7D8] text-[#9A8F83] border-red-200 cursor-not-allowed"
                        : "bg-gradient-to-r from-[#315245] to-[#4D7A66] text-white border-[#315245] shadow-lg shadow-[#315245]/20"
                    }`}
                  >
                    ADD
                  </button>
                ) : (
                  <div className="flex items-center justify-between overflow-hidden rounded-xl bg-[#315245] text-white font-black shadow-lg shadow-[#315245]/20 border border-[#315245]">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      className="w-9 py-2 text-lg active:bg-[#4D7A66]"
                    >
                      −
                    </button>

                    <span className="min-w-8 text-center text-sm bg-[#4D7A66] py-2">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={handleIncrease}
                      disabled={quantity >= stock}
                      className={`w-9 py-2 text-lg ${
                        quantity >= stock
                          ? "opacity-40 cursor-not-allowed"
                          : "active:bg-[#4D7A66]"
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
            <p className="text-[#6B6258] text-sm mt-4 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Desktop / tablet layout */}
        <div className="hidden sm:block">
          <div className="relative aspect-square overflow-hidden bg-[#F3E7D8]">
            <img
              src={item.image}
              alt={item.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                sellerIsClosed
                  ? "grayscale opacity-45"
                  : "group-hover:scale-105"
              }`}
            />

            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <span
                className={`w-fit text-xs font-black px-3 py-1.5 rounded-full ${
                  item.type === "Non-Veg"
                    ? "bg-red-500 text-white"
                    : "bg-[#315245] text-white"
                }`}
              >
                {item.type}
              </span>

              <span className="w-fit text-xs font-black px-3 py-1.5 rounded-full bg-white/90 text-[#B45309] border border-[#F59E0B]/25">
                {category}
              </span>
            </div>

            <div className="absolute top-3 right-3 z-20">
              {sellerIsClosed ? (
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
                <span className="text-xs font-black px-3 py-1.5 rounded-full bg-white/90 text-[#315245] border border-[#315245]/25">
                  Available
                </span>
              )}
            </div>

            {demandBadge && !sellerIsClosed && !isSoldOut && (
              <div className="absolute left-3 bottom-3 z-20 max-w-[82%] bg-white/95 backdrop-blur border border-[#EADCC8] rounded-2xl px-3 py-2 shadow-xl">
                <p className="text-[#B45309] text-xs font-black leading-tight">
                  📈 {demandBadge.label}
                </p>

                <p className="text-[#111827] text-[11px] font-bold mt-0.5">
                  {demandBadge.sublabel}
                </p>
              </div>
            )}

            {sellerIsClosed && (
              <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center px-4 text-center">
                <div className="bg-red-600 text-white font-black px-5 py-4 rounded-2xl">
                  <p className="text-lg leading-tight">🔴 Seller Closed</p>
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
                    sellerIsClosed ? "text-[#9A8F83]" : "text-[#111827]"
                  }`}
                >
                  {item.name}
                </h3>

                <p className="text-[#6B6258] text-sm mt-1 truncate">
                  By {item.seller}
                </p>
              </div>

              <p
                className={`font-black text-2xl shrink-0 ${
                  sellerIsClosed ? "text-[#9A8F83]" : "text-[#315245]"
                }`}
              >
                ₹{item.price}
              </p>
            </div>

            {item.description && (
              <p className="text-[#6B6258] text-sm mt-3 line-clamp-2">
                {item.description}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 mt-4">
              <p className="text-[#6B6258] text-sm">
                Ready: <span className="text-[#111827]">{item.time}</span>
              </p>

              <p
                className={`text-sm font-bold ${
                  sellerIsClosed
                    ? "text-red-500"
                    : isSoldOut
                    ? "text-[#9A8F83]"
                    : isLowStock
                    ? "text-red-500"
                    : "text-[#4D7A66]"
                }`}
              >
                {sellerIsClosed
                  ? "Seller Closed"
                  : isSoldOut
                  ? "Unavailable"
                  : `${stock} left`}
              </p>
            </div>

            <div className="mt-5">
              {quantity === 0 || sellerIsClosed ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isBlocked}
                  className={`w-full font-black py-4 rounded-2xl transition-all duration-200 text-base ${
                    isBlocked
                      ? "bg-[#F3E7D8] text-[#9A8F83] cursor-not-allowed border border-red-200"
                      : "bg-gradient-to-r from-[#315245] to-[#4D7A66] hover:from-[#29463B] hover:to-[#416B59] active:scale-[0.98] text-white shadow-lg shadow-[#315245]/20"
                  }`}
                >
                  {sellerIsClosed
                    ? "Seller Closed"
                    : isSoldOut
                    ? "Unavailable"
                    : "+ Add to Cart"}
                </button>
              ) : (
                <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-[#315245] text-white font-black shadow-lg shadow-[#315245]/20">
                  <button
                    type="button"
                    onClick={handleDecrease}
                    className="flex-1 py-4 text-xl hover:bg-[#4D7A66]"
                  >
                    −
                  </button>

                  <span className="px-5 py-4 bg-[#4D7A66] text-lg min-w-[70px] text-center">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={handleIncrease}
                    disabled={quantity >= stock}
                    className={`flex-1 py-4 text-xl ${
                      quantity >= stock
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-[#4D7A66]"
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
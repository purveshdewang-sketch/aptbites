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
  const soldCount = Number(item.sold_count || 0);
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
    }, 2200);
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[999] w-[92%] sm:w-[340px] bg-[#111111] border border-yellow-500/30 rounded-[1.75rem] p-4 shadow-2xl shadow-yellow-500/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-yellow-400 font-bold text-base">
                Added to cart
              </p>

              <p className="text-gray-400 text-sm mt-1">
                {item.name} added successfully.
              </p>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400">
              ✓
            </div>
          </div>

          <Link
            to="/cart"
            className="block text-center mt-4 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold py-3 rounded-2xl transition-all duration-200"
          >
            View Cart
          </Link>
        </div>
      )}

      <Link
        to={`/food/${item.id}`}
        className={`block group bg-[#111111] border rounded-[1.75rem] overflow-hidden transition-all duration-300 ${
          sellerIsClosed
            ? "border-red-500/60 shadow-lg shadow-red-500/10"
            : "border-[#222] hover:border-yellow-500/40 hover:-translate-y-1"
        }`}
      >
        <div className="relative aspect-square overflow-hidden bg-[#1a1a1a]">
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover transition-all duration-500 ${
              sellerIsClosed ? "grayscale opacity-45" : "group-hover:scale-105"
            }`}
          />

          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span
              className={`w-fit text-xs font-black px-3 py-1.5 rounded-full ${
                item.type === "Non-Veg"
                  ? "bg-red-500 text-white"
                  : "bg-green-500 text-black"
              }`}
            >
              {item.type}
            </span>

            <span className="w-fit text-xs font-black px-3 py-1.5 rounded-full bg-black/70 text-yellow-400 border border-yellow-500/20">
              {category}
            </span>
          </div>

          <div className="absolute top-3 right-3 z-20">
            {sellerIsClosed ? (
              <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-600 text-white shadow-lg shadow-red-500/30">
                CLOSED
              </span>
            ) : isSoldOut ? (
              <span className="text-xs font-black px-3 py-1.5 rounded-full bg-gray-800 text-gray-400">
                Sold Out
              </span>
            ) : isLowStock ? (
              <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-500 text-white">
                Only {stock} left
              </span>
            ) : (
              <span className="text-xs font-black px-3 py-1.5 rounded-full bg-black/70 text-yellow-400 border border-yellow-500/20">
                Available
              </span>
            )}
          </div>

          {demandBadge && !sellerIsClosed && !isSoldOut && (
            <div className="absolute left-3 bottom-3 z-20 max-w-[78%] bg-black/80 backdrop-blur border border-green-500/20 rounded-2xl px-3 py-2 shadow-xl">
              <p className="text-green-400 text-xs font-black leading-tight">
                📈 {demandBadge.label}
              </p>

              <p className="text-white text-[11px] font-bold mt-0.5">
                {demandBadge.sublabel}
              </p>
            </div>
          )}

          {sellerIsClosed && (
            <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center px-4 text-center">
              <div className="bg-red-600 text-white font-black px-5 py-4 rounded-2xl shadow-xl shadow-red-500/30">
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
                  sellerIsClosed ? "text-gray-400" : "text-white"
                }`}
              >
                {item.name}
              </h3>

              <p className="text-gray-500 text-sm mt-1 truncate">
                By {item.seller}
              </p>
            </div>

            <p
              className={`font-black text-2xl shrink-0 ${
                sellerIsClosed ? "text-gray-500" : "text-yellow-400"
              }`}
            >
              ₹{item.price}
            </p>
          </div>

          {soldCount > 0 && (
            <div className="text-white text-[11px] font-bold mt-0.5">
                  Trending in your area
            </div>
          )}

          {item.description && (
            <p className="text-gray-500 text-sm mt-3 line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 mt-4">
            <p className="text-gray-500 text-sm">
              Ready: <span className="text-gray-300">{item.time}</span>
            </p>

            <p
              className={`text-sm font-bold ${
                sellerIsClosed
                  ? "text-red-400"
                  : isSoldOut
                  ? "text-gray-600"
                  : isLowStock
                  ? "text-red-400"
                  : "text-gray-400"
              }`}
            >
              {sellerIsClosed
                ? "Seller Closed"
                : isSoldOut
                ? "Unavailable"
                : `${stock} left`}
            </p>
          </div>

          {sellerIsClosed && (
            <div className="mt-4 bg-red-600 text-white text-sm font-black px-4 py-3 rounded-2xl text-center shadow-lg shadow-red-500/20">
              🔴 Seller is closed right now
            </div>
          )}

          <div className="mt-5">
            {quantity === 0 || sellerIsClosed ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isBlocked}
                className={`w-full font-black py-4 rounded-2xl transition-all duration-200 shadow-lg text-base ${
                  isBlocked
                    ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-red-500/20"
                    : "bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black shadow-yellow-500/20"
                }`}
              >
                {sellerIsClosed
                  ? "Seller Closed"
                  : isSoldOut
                  ? "Unavailable"
                  : "+ Add to Cart"}
              </button>
            ) : (
              <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-yellow-500 text-black font-black shadow-lg shadow-yellow-500/20">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="flex-1 py-4 text-xl hover:bg-yellow-400 active:scale-95 transition-all duration-200"
                >
                  −
                </button>

                <span className="px-5 py-4 bg-yellow-400 text-lg min-w-[70px] text-center">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= stock}
                  className={`flex-1 py-4 text-xl transition-all duration-200 ${
                    quantity >= stock
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-yellow-400 active:scale-95"
                  }`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>
    </>
  );
}
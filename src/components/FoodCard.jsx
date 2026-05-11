import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function FoodCard({ item }) {
  const {
    cartItems,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const [showToast, setShowToast] = useState(false);

  const cartItem = cartItems.find(
    (cartItem) => cartItem.id === item.id
  );

  const quantity = cartItem ? cartItem.quantity : 0;

  const stock = Number(item.stock || 0);

  const isLowStock = stock > 0 && stock <= 2;
  const isSellingFast = stock > 2 && stock <= 5;
  const isSoldOut = stock <= 0;

  function handleAddToCart() {
    if (isSoldOut) return;

    addToCart(item);

    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2200);
  }

  return (
    <>
      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[999] w-[92%] sm:w-[340px] bg-[#111111] border border-yellow-500/30 rounded-[1.75rem] p-4 shadow-2xl shadow-yellow-500/20 animate-[fadeIn_.2s_ease]">
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

      {/* Card */}
      <div className="group bg-[#111111] border border-[#222] hover:border-yellow-500/30 rounded-[2rem] overflow-hidden shadow-xl hover:shadow-yellow-500/10 transition-all duration-300 hover:-translate-y-1">
        {/* Image */}
        <div className="relative overflow-hidden">
          <div className="aspect-square bg-[#161616] overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${
                isSoldOut ? "opacity-40 grayscale" : ""
              }`}
            />
          </div>

          {/* Food Type */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span
              className={`text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-md ${
                item.type === "Non-Veg"
                  ? "bg-red-900/60 text-red-300 border border-red-500/20"
                  : "bg-green-900/60 text-green-300 border border-green-500/20"
              }`}
            >
              {item.type || "Veg"}
            </span>
          </div>

          {/* Urgency Badge */}
          {!isSoldOut && (
            <div className="absolute top-4 right-4">
              {isLowStock ? (
                <span className="bg-red-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg">
                  🔥 Only {stock} left
                </span>
              ) : isSellingFast ? (
                <span className="bg-yellow-500 text-black text-[11px] font-black px-3 py-1 rounded-full shadow-lg">
                  Selling Fast
                </span>
              ) : null}
            </div>
          )}

          {/* Sold Out Overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="bg-red-500 text-white font-black px-5 py-3 rounded-2xl shadow-2xl">
                SOLD OUT
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {/* Name + Price */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-white font-black text-lg leading-tight truncate">
                {item.name}
              </h3>

              <p className="text-gray-500 text-sm mt-2 truncate">
                Homemade by {item.seller}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-yellow-400 font-black text-2xl">
                ₹{item.price}
              </p>

              <p className="text-[11px] text-gray-500 mt-1">
                per plate
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-5">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">
                Ready In
              </p>

              <p className="text-white text-sm font-bold mt-1">
                {item.time}
              </p>
            </div>

            <div className="text-right">
              <p className="text-gray-500 text-xs uppercase tracking-wide">
                Availability
              </p>

              <p
                className={`text-sm font-black mt-1 ${
                  isLowStock
                    ? "text-red-400"
                    : isSellingFast
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {isSoldOut
                  ? "Sold Out"
                  : isLowStock
                  ? `${stock} left`
                  : `${stock} available`}
              </p>
            </div>
          </div>

          {/* Add / Quantity */}
          <div className="mt-5">
            {quantity === 0 ? (
              <button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className={`w-full font-black py-4 rounded-2xl transition-all duration-200 shadow-lg text-base ${
                  isSoldOut
                    ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
                    : "bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black shadow-yellow-500/20"
                }`}
              >
                {isSoldOut ? "Unavailable" : "+ Add to Cart"}
              </button>
            ) : (
              <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-yellow-500 text-black font-black shadow-lg shadow-yellow-500/20">
                <button
                  onClick={() => decreaseQuantity(item.id)}
                  className="flex-1 py-4 text-xl hover:bg-yellow-400 active:scale-95 transition-all duration-200"
                >
                  −
                </button>

                <span className="px-5 py-4 bg-yellow-400 text-lg min-w-[70px] text-center">
                  {quantity}
                </span>

                <button
                  onClick={() => increaseQuantity(item.id)}
                  className="flex-1 py-4 text-xl hover:bg-yellow-400 active:scale-95 transition-all duration-200"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
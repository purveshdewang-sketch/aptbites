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

  function handleAddToCart() {
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
      <div className="group bg-[#111111] border border-[#222] hover:border-yellow-500/30 rounded-[1.75rem] overflow-hidden shadow-lg hover:shadow-yellow-500/10 transition-all duration-300">
        {/* Image */}
        <div className="relative overflow-hidden">
          <div className="bg-[#161616] p-3 sm:p-4 flex justify-center items-center h-44 sm:h-48">
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover rounded-2xl transition-all duration-500 group-hover:scale-105"
            />
          </div>

          <div className="absolute top-5 left-5 flex gap-2">
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
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {/* Name + Price */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">
                {item.name}
              </h3>

              <p className="text-gray-500 text-sm mt-2">
                Homemade by {item.seller}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-yellow-400 font-black text-xl">
                ₹{item.price}
              </p>

              <p className="text-[11px] text-gray-500 mt-1">
                per plate
              </p>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between mt-5 gap-3">
            <div>
              <p className="text-gray-500 text-xs">
                Ready in
              </p>

              <p className="text-white text-sm font-semibold mt-1">
                {item.time}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-yellow-900/20 border border-yellow-500/10 text-yellow-300 text-xs px-3 py-2 rounded-full whitespace-nowrap">
                {item.stock} left
              </span>

              {/* Add / Quantity */}
              {quantity === 0 ? (
                <button
                  onClick={handleAddToCart}
                  className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-4 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-yellow-500/20"
                >
                  + Add
                </button>
              ) : (
                <div className="flex items-center overflow-hidden rounded-2xl bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20">
                  <button
                    onClick={() => decreaseQuantity(item.id)}
                    className="px-3 py-2.5 hover:bg-yellow-400 active:scale-95 transition-all duration-200"
                  >
                    −
                  </button>

                  <span className="px-4 py-2.5 bg-yellow-400 text-sm">
                    {quantity}
                  </span>

                  <button
                    onClick={() => increaseQuantity(item.id)}
                    className="px-3 py-2.5 hover:bg-yellow-400 active:scale-95 transition-all duration-200"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
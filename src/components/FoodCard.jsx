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
    }, 2500);
  }

  return (
    <>
      {showToast && (
        <div className="fixed top-24 right-6 z-[999] w-[320px] bg-[#111111] border border-yellow-500/40 rounded-3xl p-5 shadow-2xl shadow-yellow-500/20 animate-[fadeIn_.2s_ease]">
          <p className="text-yellow-400 font-bold text-lg">
            Added to cart
          </p>

          <p className="text-gray-300 text-sm mt-1">
            {item.name} has been added successfully.
          </p>

          <Link
            to="/cart"
            className="block text-center mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-2xl transition-all duration-200"
          >
            View Cart
          </Link>
        </div>
      )}

      <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl overflow-hidden shadow-lg hover:shadow-yellow-500/10 transition-all duration-300 hover:scale-[1.02]">
        {/* Image */}
        <div className="bg-[#1a1a1a] p-4 flex justify-center items-center h-48">
          <img
            src={item.image}
            alt={item.name}
            className="h-36 w-full object-cover rounded-2xl"
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name + Price */}
          <div className="flex justify-between items-start">
            <h3 className="text-white font-semibold text-lg leading-tight">
              {item.name}
            </h3>

            <span className="text-yellow-400 font-bold text-lg">
              ₹{item.price}
            </span>
          </div>

          {/* Seller */}
          <p className="text-gray-400 text-sm mt-2">
            Homemade by {item.seller}
          </p>

          {/* ETA */}
          <p className="text-gray-500 text-xs mt-1">
            Ready in {item.time}
          </p>

          {/* Bottom Row */}
          <div className="flex justify-between items-center mt-4">
            {/* Tags */}
            <div className="flex gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  item.type === "Non-Veg"
                    ? "bg-red-900/40 text-red-400"
                    : "bg-green-900/40 text-green-400"
                }`}
              >
                {item.type || "Veg"}
              </span>

              <span className="bg-yellow-900/30 text-yellow-300 text-xs px-2 py-1 rounded-full">
                {item.stock} left
              </span>
            </div>

            {/* Quantity / Add */}
            {quantity === 0 ? (
              <button
                onClick={handleAddToCart}
                className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-semibold px-4 py-2 rounded-xl transition-all duration-200"
              >
                + Add
              </button>
            ) : (
              <div className="flex items-center overflow-hidden rounded-xl bg-yellow-500 text-black font-bold">
                <button
                  onClick={() => decreaseQuantity(item.id)}
                  className="px-3 py-2 hover:bg-yellow-400 transition-all duration-200"
                >
                  −
                </button>

                <span className="px-4 py-2 bg-yellow-400">
                  {quantity}
                </span>

                <button
                  onClick={() => increaseQuantity(item.id)}
                  className="px-3 py-2 hover:bg-yellow-400 transition-all duration-200"
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
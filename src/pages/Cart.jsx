import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const {
    cartItems,
    cartTotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-7 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                Your Cart
              </p>

              <h1 className="text-3xl sm:text-5xl font-black mt-2 tracking-tight">
                Ready to order?
              </h1>

              <p className="text-gray-500 mt-3 text-sm sm:text-base">
                Review your homemade food items before checkout.
              </p>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="shrink-0 border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-black px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
              >
                Clear
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="mt-10 bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center text-4xl">
                🛒
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-6">
                Your cart is empty
              </h2>

              <p className="text-gray-500 mt-3">
                Add some delicious homemade food to continue.
              </p>

              <Link
                to="/marketplace"
                className="inline-block mt-7 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-2xl transition-all"
              >
                Explore Food
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#111111] border border-[#222] rounded-[1.75rem] p-4 sm:p-5"
                  >
                    <div className="flex gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-bold leading-tight truncate">
                              {item.name}
                            </h2>

                            <p className="text-gray-500 text-sm mt-1 truncate">
                              By {item.seller}
                            </p>
                          </div>

                          <p className="text-yellow-400 text-lg sm:text-2xl font-black shrink-0">
                            ₹{item.price * item.quantity}
                          </p>
                        </div>

                        <p className="text-gray-500 text-xs mt-2">
                          ₹{item.price} per plate
                        </p>

                        <div className="flex items-center justify-between gap-3 mt-4">
                          <div className="flex items-center bg-black border border-[#333] rounded-2xl overflow-hidden">
                            <button
                              onClick={() => decreaseQuantity(item.id)}
                              className="w-10 h-10 text-yellow-400 hover:bg-[#1a1a1a] font-black text-xl"
                            >
                              −
                            </button>

                            <span className="w-11 h-10 border-x border-[#333] flex items-center justify-center font-black">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => increaseQuantity(item.id)}
                              className="w-10 h-10 text-yellow-400 hover:bg-[#1a1a1a] font-black text-xl"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-400 hover:text-red-300 text-sm font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Amount</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Taxes/delivery can be added later
                    </p>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-black text-yellow-400">
                    ₹{cartTotal}
                  </h2>
                </div>

                <Link
                  to="/checkout"
                  className="block text-center w-full mt-6 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black py-4 rounded-2xl text-base sm:text-lg transition-all duration-200 shadow-lg shadow-yellow-500/20"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  to="/marketplace"
                  className="block text-center w-full mt-3 border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 font-bold py-3 rounded-2xl transition-all"
                >
                  Add More Items
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
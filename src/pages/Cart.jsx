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

  const deliveryFee = cartItems.length > 0 ? 20 : 0;
  const platformFee = cartItems.length > 0 ? 5 : 0;

  const finalTotal = cartTotal + deliveryFee + platformFee;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-7 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
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

          {/* Empty State */}
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
              {/* Cart Items */}
              <div className="mt-8 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#111111] border border-[#222] hover:border-yellow-500/20 rounded-[2rem] p-4 sm:p-5 transition-all duration-300"
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="relative shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-3xl"
                        />

                        {Number(item.stock || 0) <= 2 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg">
                            HOT
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-black leading-tight truncate">
                              {item.name}
                            </h2>

                            <p className="text-gray-500 text-sm mt-1 truncate">
                              Homemade by {item.seller}
                            </p>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-bold px-3 py-1 rounded-full">
                                Ready in {item.time}
                              </span>

                              {Number(item.stock || 0) <= 2 && (
                                <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold px-3 py-1 rounded-full">
                                  🔥 Only {item.stock} left
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-yellow-400 text-xl sm:text-3xl font-black">
                              ₹{item.price * item.quantity}
                            </p>

                            <p className="text-gray-500 text-xs mt-1">
                              ₹{item.price} each
                            </p>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between gap-3 mt-5">
                          <div className="flex items-center bg-black border border-[#333] rounded-2xl overflow-hidden shadow-lg">
                            <button
                              onClick={() => decreaseQuantity(item.id)}
                              className="w-12 h-12 text-yellow-400 hover:bg-[#1a1a1a] font-black text-2xl transition-all"
                            >
                              −
                            </button>

                            <span className="w-14 h-12 border-x border-[#333] flex items-center justify-center font-black text-lg">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => increaseQuantity(item.id)}
                              className="w-12 h-12 text-yellow-400 hover:bg-[#1a1a1a] font-black text-2xl transition-all"
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

              {/* Checkout Summary */}
              <div className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-6 shadow-2xl mt-8">
                {/* Pricing */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Item Total
                    </span>

                    <span className="font-bold">
                      ₹{cartTotal}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Delivery Fee
                    </span>

                    <span className="font-bold">
                      ₹{deliveryFee}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Platform Fee
                    </span>

                    <span className="font-bold">
                      ₹{platformFee}
                    </span>
                  </div>

                  <div className="border-t border-[#222] pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">
                        Grand Total
                      </p>

                      <p className="text-yellow-400 text-3xl font-black mt-1">
                        ₹{finalTotal}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-green-400 text-xs font-bold">
                        Fresh homemade food
                      </p>

                      <p className="text-gray-500 text-xs mt-1">
                        Prepared inside your apartment
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <Link
                  to="/checkout"
                  className="block text-center w-full mt-6 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-black py-4 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-yellow-500/20"
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
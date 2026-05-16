import { useEffect, useState } from "react";
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

  const platformFee = cartItems.length > 0 ? 10 : 0;
  const finalTotal = cartTotal + platformFee;

  const [orderTiming, setOrderTiming] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "Nefo_cart_order_timing",
      JSON.stringify({
        orderTiming,
        scheduledDate,
        scheduledTime,
      })
    );
  }, [orderTiming, scheduledDate, scheduledTime]);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-7 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
                Your Cart
              </p>

              <h1 className="text-3xl sm:text-5xl font-black mt-2 tracking-tight text-[#111827]">
                Ready to order?
              </h1>

              <p className="text-[#51615D] mt-3 text-sm sm:text-base">
                Review your homemade food items before checkout.
              </p>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="shrink-0 border border-red-300 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
              >
                Clear
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="mt-10 bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-xl shadow-[#073B35]/5">
              <div className="w-20 h-20 mx-auto bg-[#41D3BD]/12 rounded-full flex items-center justify-center text-4xl">
                🛒
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-6 text-[#111827]">
                Your cart is empty
              </h2>

              <p className="text-[#51615D] mt-3">
                Add some delicious homemade food to continue.
              </p>

              <Link
                to="/marketplace"
                className="inline-block mt-7 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-[#41D3BD]/20"
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
                    className="bg-white/85 border border-[#D7F5EF] hover:border-[#41D3BD]/70 rounded-[2rem] p-4 sm:p-5 transition-all duration-300 shadow-lg shadow-[#073B35]/5"
                  >
                    <div className="flex gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-3xl bg-[#D7F5EF]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-black leading-tight truncate text-[#111827]">
                              {item.name}
                            </h2>

                            <p className="text-[#51615D] text-sm mt-1 truncate">
                              Homemade by {item.seller}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[#073B35] text-xl sm:text-3xl font-black">
                              ₹{item.price * item.quantity}
                            </p>

                            <p className="text-[#51615D] text-xs mt-1">
                              ₹{item.price} each
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-5">
                          <div className="flex items-center bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl overflow-hidden shadow-sm">
                            <button
                              onClick={() => decreaseQuantity(item.id)}
                              className="w-12 h-12 text-[#073B35] hover:bg-[#D7F5EF] font-black text-2xl transition-all"
                            >
                              −
                            </button>

                            <span className="w-14 h-12 border-x border-[#D7F5EF] flex items-center justify-center font-black text-lg text-[#111827]">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() => increaseQuantity(item.id)}
                              className="w-12 h-12 text-[#073B35] hover:bg-[#D7F5EF] font-black text-2xl transition-all"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-600 text-sm font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
                  Order Timing
                </p>

                <h2 className="text-2xl font-black mt-2 text-[#111827]">
                  Order now or schedule for later
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setOrderTiming("now")}
                    className={`text-left rounded-2xl p-4 border transition-all ${
                      orderTiming === "now"
                        ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD] shadow-lg shadow-[#41D3BD]/20"
                        : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/70"
                    }`}
                  >
                    <p className="font-black text-lg">⚡ Order Now</p>
                    <p className="text-sm mt-1 opacity-75">
                      Place the order immediately.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderTiming("scheduled")}
                    className={`text-left rounded-2xl p-4 border transition-all ${
                      orderTiming === "scheduled"
                        ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD] shadow-lg shadow-[#41D3BD]/20"
                        : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/70"
                    }`}
                  >
                    <p className="font-black text-lg">🕒 Schedule Later</p>
                    <p className="text-sm mt-1 opacity-75">
                      Choose date and time.
                    </p>
                  </button>
                </div>

                {orderTiming === "scheduled" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(event) => setScheduledDate(event.target.value)}
                      className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                    />

                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(event) => setScheduledTime(event.target.value)}
                      className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                    />
                  </div>
                )}
              </div>

              <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-2xl shadow-[#073B35]/5 mt-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#51615D]">Item Total</span>
                    <span className="font-bold text-[#111827]">₹{cartTotal}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#51615D]">Platform Fee</span>
                    <span className="font-bold text-[#111827]">
                      ₹{platformFee}
                    </span>
                  </div>

                  <div className="border-t border-[#D7F5EF] pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[#51615D] text-sm">Grand Total</p>
                      <p className="text-[#073B35] text-3xl font-black mt-1">
                        ₹{finalTotal}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[#1A9F8D] text-xs font-bold">
                        Fresh homemade food
                      </p>
                      <p className="text-[#51615D] text-xs mt-1">
                        Prepared inside your apartment
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  className="block text-center w-full mt-6 bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.98] text-[#073B35] font-black py-4 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  to="/marketplace"
                  className="block text-center w-full mt-3 border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] font-bold py-3 rounded-2xl transition-all"
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
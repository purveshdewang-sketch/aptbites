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

  function getKitchenName(item) {
    return item.seller || item.seller_kitchen_name || "Home Kitchen";
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-36 lg:pb-10">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden bg-white/85 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>🛒</span>
                  <span>Your Cart</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  Ready to order?
                </h1>

                <p className="text-[#51615D] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Review your homemade food items, choose timing, and proceed to
                  checkout.
                </p>
              </div>

              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="shrink-0 border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-2xl text-sm font-black transition-all duration-200"
                >
                  Clear
                </button>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3 max-w-xl">
                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 sm:p-4">
                  <p className="text-[#51615D] text-[10px] sm:text-xs font-bold uppercase">
                    Items
                  </p>
                  <p className="text-[#073B35] text-xl sm:text-2xl font-black mt-1">
                    {cartItems.length}
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 sm:p-4">
                  <p className="text-[#51615D] text-[10px] sm:text-xs font-bold uppercase">
                    Subtotal
                  </p>
                  <p className="text-[#111827] text-xl sm:text-2xl font-black mt-1">
                    ₹{cartTotal}
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 sm:p-4">
                  <p className="text-[#51615D] text-[10px] sm:text-xs font-bold uppercase">
                    Total
                  </p>
                  <p className="text-[#073B35] text-xl sm:text-2xl font-black mt-1">
                    ₹{finalTotal}
                  </p>
                </div>
              </div>
            )}
          </section>

          {cartItems.length === 0 ? (
            <section className="mt-8 bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-8 sm:p-10 text-center shadow-xl shadow-[#073B35]/5">
              <div className="w-24 h-24 mx-auto bg-[#41D3BD]/12 rounded-full flex items-center justify-center text-5xl">
                🛒
              </div>

              <h2 className="text-3xl sm:text-4xl font-black mt-6 text-[#111827]">
                Your cart is empty
              </h2>

              <p className="text-[#51615D] mt-3 max-w-md mx-auto">
                Add fresh homemade food from trusted community kitchens to
                continue.
              </p>

              <Link
                to="/marketplace"
                className="inline-block mt-7 bg-[#073B35] hover:bg-[#0B5149] text-white font-black px-7 py-4 rounded-2xl transition-all shadow-lg shadow-[#073B35]/15"
              >
                Explore Food
              </Link>
            </section>
          ) : (
            <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
              <section className="space-y-4">
                {cartItems.map((item) => {
                  const kitchenName = getKitchenName(item);
                  const lineTotal =
                    Number(item.price || 0) * Number(item.quantity || 1);

                  return (
                    <article
                      key={item.id}
                      className="bg-white/90 border border-[#D7F5EF] hover:border-[#41D3BD]/70 rounded-[2rem] p-3 sm:p-5 transition-all duration-300 shadow-lg shadow-[#073B35]/5"
                    >
                      <div className="flex gap-3 sm:gap-4">
                        <Link
                          to={`/food/${item.id}`}
                          className="relative shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[1.75rem] overflow-hidden bg-[#D7F5EF]"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover hover:scale-105 transition-all duration-500"
                          />

                          <div className="absolute top-2 left-2">
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm ${
                                item.type === "Non-Veg"
                                  ? "bg-red-500 text-white"
                                  : "bg-[#41D3BD] text-[#073B35]"
                              }`}
                            >
                              {item.type || "Veg"}
                            </span>
                          </div>
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link to={`/food/${item.id}`}>
                                <h2 className="text-lg sm:text-2xl font-black leading-tight truncate text-[#111827] hover:text-[#073B35]">
                                  {item.name}
                                </h2>
                              </Link>

                              <p className="text-[#51615D] text-xs sm:text-sm mt-1 truncate">
                                Kitchen: {kitchenName}
                              </p>

                              <p className="text-[#51615D] text-xs mt-2">
                                ₹{item.price} each
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-[#073B35] text-xl sm:text-3xl font-black">
                                ₹{lineTotal}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 mt-4 sm:mt-5">
                            <div className="flex items-center overflow-hidden rounded-2xl bg-[#073B35] text-white font-black shadow-lg shadow-[#073B35]/10">
                              <button
                                type="button"
                                onClick={() => decreaseQuantity(item.id)}
                                className="w-10 h-11 sm:w-12 sm:h-12 text-xl hover:bg-[#0B5149] transition-all"
                              >
                                −
                              </button>

                              <span className="w-11 h-11 sm:w-14 sm:h-12 bg-[#41D3BD] text-[#073B35] flex items-center justify-center font-black text-base sm:text-lg">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() => increaseQuantity(item.id)}
                                className="w-10 h-11 sm:w-12 sm:h-12 text-xl hover:bg-[#0B5149] transition-all"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-600 text-sm font-black"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                <Link
                  to="/marketplace"
                  className="block text-center w-full border border-[#D7F5EF] bg-white/90 hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] font-black py-4 rounded-2xl transition-all"
                >
                  + Add More Items
                </Link>
              </section>

              <aside className="space-y-5 lg:sticky lg:top-24 h-fit">
                <section className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Order Timing
                  </p>

                  <h2 className="text-2xl font-black mt-2 text-[#111827]">
                    When should we prepare it?
                  </h2>

                  <p className="text-[#51615D] text-sm mt-2 leading-relaxed">
                    Scheduled orders are confirmed at checkout only if the
                    kitchen accepts scheduling.
                  </p>

                  <div className="grid grid-cols-1 gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setOrderTiming("now")}
                      className={`text-left rounded-2xl p-4 border transition-all ${
                        orderTiming === "now"
                          ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                          : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/70"
                      }`}
                    >
                      <p className="font-black text-lg">⚡ Order Now</p>
                      <p
                        className={`text-sm mt-1 ${
                          orderTiming === "now"
                            ? "text-white/70"
                            : "text-[#51615D]"
                        }`}
                      >
                        Place the order immediately.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderTiming("scheduled")}
                      className={`text-left rounded-2xl p-4 border transition-all ${
                        orderTiming === "scheduled"
                          ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                          : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/70"
                      }`}
                    >
                      <p className="font-black text-lg">🕒 Schedule Later</p>
                      <p
                        className={`text-sm mt-1 ${
                          orderTiming === "scheduled"
                            ? "text-white/70"
                            : "text-[#51615D]"
                        }`}
                      >
                        Choose date and time.
                      </p>
                    </button>
                  </div>

                  {orderTiming === "scheduled" && (
                    <div className="grid grid-cols-1 gap-3 mt-4">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(event) =>
                          setScheduledDate(event.target.value)
                        }
                        className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                      />

                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(event) =>
                          setScheduledTime(event.target.value)
                        }
                        className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                      />
                    </div>
                  )}
                </section>

                <section className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-2xl shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Bill Summary
                  </p>

                  <h2 className="text-2xl font-black mt-2 text-[#111827]">
                    Payment total
                  </h2>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#51615D]">Item Total</span>
                      <span className="font-bold text-[#111827]">
                        ₹{cartTotal}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#51615D]">Platform Fee</span>
                      <span className="font-bold text-[#111827]">
                        ₹{platformFee}
                      </span>
                    </div>

                    <div className="border-t border-[#D7F5EF] pt-5 flex items-end justify-between">
                      <div>
                        <p className="text-[#51615D] text-sm">Grand Total</p>
                        <p className="text-[#51615D] text-xs mt-1">
                          Fresh homemade food
                        </p>
                      </div>

                      <p className="text-[#073B35] text-4xl font-black">
                        ₹{finalTotal}
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/checkout"
                    className="hidden lg:block text-center w-full mt-6 bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.98] text-white font-black py-4 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-[#073B35]/15"
                  >
                    Proceed to Checkout
                  </Link>

                  <p className="text-[#51615D] text-xs mt-4 leading-relaxed">
                    From your community. Exact kitchen door/location is not
                    shown publicly.
                  </p>
                </section>
              </aside>
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF] px-4 py-3">
            <div className="max-w-6xl mx-auto flex items-center gap-3">
              <div className="shrink-0 bg-white border border-[#D7F5EF] rounded-2xl px-4 py-3 text-left shadow-sm">
                <p className="text-[#51615D] text-[11px] font-bold uppercase">
                  Total
                </p>
                <p className="text-[#073B35] text-xl font-black">
                  ₹{finalTotal}
                </p>
              </div>

              <Link
                to="/checkout"
                className="flex-1 bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.99] text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-[#073B35]/15 text-center"
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    flat: "",
    deliveryType: "Doorstep delivery",
    notes: "",
  });

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handlePlaceOrder() {
    if (!formData.fullName || !formData.phone || !formData.flat) {
      alert("Please fill name, phone number, and flat details.");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setLoading(true);

    const orderPayload = {
      user_id: user?.id || null,
      customer_name: formData.fullName,
      phone: formData.phone,
      flat: formData.flat,
      delivery_type: formData.deliveryType,
      notes: formData.notes,
      total_amount: cartTotal,
      status: "Pending",
      items: cartItems,
    };

    const { error } = await supabase
      .from("orders")
      .insert([orderPayload]);

    setLoading(false);

    if (error) {
      alert(`Failed to place order: ${error.message}`);
      return;
    }

    setOrderPlaced(true);
    clearCart();
  }

  if (orderPlaced) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="max-w-xl w-full bg-[#111111] border border-[#222] rounded-[2rem] p-8 sm:p-10 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center text-4xl">
              ✅
            </div>

            <p className="text-yellow-400 font-semibold uppercase tracking-wide mt-6">
              Order Confirmed
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-4 leading-tight">
              Your order has been placed.
            </h1>

            <p className="text-gray-400 mt-5 leading-relaxed">
              The seller will prepare your homemade food and contact you if
              needed.
            </p>

            <Link
              to="/marketplace"
              className="block mt-8 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black py-4 rounded-2xl transition-all duration-200"
            >
              Back to Marketplace
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-7 sm:py-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
          <section className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-8">
            <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
              Checkout
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-3 tracking-tight">
              Delivery details
            </h1>

            <p className="text-gray-500 mt-4 text-sm sm:text-base leading-relaxed">
              Enter your apartment delivery details below.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Full Name
                </label>

                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Phone Number
                </label>

                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Apartment / Flat Details
                </label>

                <input
                  name="flat"
                  value={formData.flat}
                  onChange={handleChange}
                  className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                  placeholder="Tower B • Flat 1204"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Delivery Method
                </label>

                <select
                  name="deliveryType"
                  value={formData.deliveryType}
                  onChange={handleChange}
                  className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                >
                  <option>Doorstep delivery</option>
                  <option>Self pickup</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Notes for Seller
                </label>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="4"
                  className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all resize-none"
                  placeholder="Extra spicy, call before arrival, etc."
                />
              </div>
            </div>
          </section>

          <section className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-8 h-fit lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                  Order Summary
                </p>

                <h2 className="text-2xl sm:text-3xl font-black mt-2">
                  Your Food
                </h2>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-full font-semibold">
                {cartItems.length} items
              </div>
            </div>

            {cartItems.length === 0 ? (
              <div className="mt-8 bg-black/40 border border-[#222] rounded-3xl p-6 text-center">
                <p className="text-gray-500">
                  Your cart is empty.
                </p>
              </div>
            ) : (
              <div className="mt-7 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 bg-black/40 border border-[#222] rounded-3xl p-4"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-2xl object-cover"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold truncate">
                            {item.name}
                          </p>

                          <p className="text-gray-500 text-sm mt-1">
                            Qty {item.quantity}
                          </p>
                        </div>

                        <p className="font-black text-yellow-400 shrink-0">
                          ₹{item.price * item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 border-t border-[#222] pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">
                    Total Amount
                  </p>

                  <p className="text-gray-500 text-xs mt-1">
                    Inclusive of platform charges
                  </p>
                </div>

                <p className="text-3xl sm:text-4xl font-black text-yellow-400">
                  ₹{cartTotal}
                </p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full mt-7 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-yellow-500/20"
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>

              <Link
                to="/cart"
                className="block text-center mt-3 border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 font-bold py-3 rounded-2xl transition-all"
              >
                Back to Cart
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
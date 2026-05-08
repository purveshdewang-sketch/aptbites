import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();

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

        <main className="min-h-screen bg-black text-white px-6 py-10 flex items-center justify-center">
          <div className="max-w-xl w-full bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-10 text-center">
            <p className="text-yellow-400 font-semibold">
              Order Confirmed
            </p>

            <h1 className="text-4xl font-bold mt-4">
              Your order has been placed.
            </h1>

            <p className="text-gray-400 mt-4">
              The seller will prepare your homemade food and contact you if
              needed.
            </p>

            <Link
              to="/marketplace"
              className="block mt-8 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-2xl"
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

      <main className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8">
          <section className="bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-8">
            <p className="text-yellow-400 font-semibold">
              Checkout
            </p>

            <h1 className="text-4xl font-bold mt-2">
              Delivery details
            </h1>

            <div className="mt-8 space-y-4">
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500"
                placeholder="Full name"
              />

              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500"
                placeholder="Phone number"
              />

              <input
                name="flat"
                value={formData.flat}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500"
                placeholder="Apartment / Block / Flat No."
              />

              <select
                name="deliveryType"
                value={formData.deliveryType}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500"
              >
                <option>Doorstep delivery</option>
                <option>Self pickup</option>
              </select>

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500"
                placeholder="Order notes"
              />
            </div>
          </section>

          <section className="bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-8 h-fit">
            <h2 className="text-3xl font-bold text-yellow-400">
              Order Summary
            </h2>

            {cartItems.length === 0 ? (
              <p className="text-gray-500 mt-6">
                Your cart is empty.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 border-b border-[#222] pb-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.name}
                      </p>

                      <p className="text-gray-500 text-sm">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>

                    <p className="font-bold">
                      ₹{item.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8 text-xl">
              <p className="text-gray-400">Total</p>

              <p className="text-yellow-400 font-bold">
                ₹{cartTotal}
              </p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full mt-8 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-2xl"
            >
              {loading ? "Placing Order..." : "Place Order"}
            </button>
          </section>
        </div>
      </main>
    </>
  );
}
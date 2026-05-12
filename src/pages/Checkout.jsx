import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 10;

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const navigate = useNavigate();

  const subtotalAmount = Number(cartTotal || 0);
  const totalAmount = subtotalAmount + PLATFORM_FEE;

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    flat: "",
    deliveryType: "Doorstep delivery",
    notes: "",
  });

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, flat")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) return;

      setFormData((current) => ({
        ...current,
        fullName: data.full_name || "",
        phone: data.phone || "",
        flat: data.flat || "",
      }));
    }

    loadProfile();
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function getSellerIdFromCart() {
    if (!cartItems || cartItems.length === 0) return null;

    const sellerIds = cartItems
      .map((item) => item.user_id || item.seller_id)
      .filter(Boolean);

    const uniqueSellerIds = [...new Set(sellerIds)];

    if (uniqueSellerIds.length === 0) return null;

    if (uniqueSellerIds.length > 1) {
      return "MIXED_SELLERS";
    }

    return uniqueSellerIds[0];
  }

  async function handlePlaceOrder() {
    if (!user) {
      alert("Please login before placing your order.");
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.flat) {
      alert("Please fill name, phone number, and flat details.");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const sellerId = getSellerIdFromCart();

    if (sellerId === "MIXED_SELLERS") {
      alert("Please order from one seller at a time.");
      return;
    }

    if (!sellerId) {
      alert("Seller details missing. Please add dishes again.");
      return;
    }

    setLoading(true);

    const orderPayload = {
      user_id: user.id,
      seller_id: sellerId,
      customer_name: formData.fullName,
      phone: formData.phone,
      flat: formData.flat,
      delivery_type: formData.deliveryType,
      notes: formData.notes,
      subtotal_amount: subtotalAmount,
      platform_fee: PLATFORM_FEE,
      total_amount: totalAmount,
      status: "confirmed",
      items: cartItems,
    };

    const { error: stockError } = await supabase.rpc(
      "decrement_food_stock",
      {
        order_items: cartItems,
      }
    );

    if (stockError) {
      setLoading(false);
      alert(`Could not place order: ${stockError.message}`);
      return;
    }

    const { error } = await supabase
      .from("orders")
      .insert([orderPayload]);

    setLoading(false);

    if (error) {
      alert(`Failed to place order: ${error.message}`);
      return;
    }

    clearCart();
    setOrderPlaced(true);

    setTimeout(() => {
      navigate("/orders");
    }, 1500);
  }

  if (orderPlaced) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="max-w-xl w-full bg-[#111111] border border-[#222] rounded-[2rem] p-8 sm:p-10 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center text-5xl">
              🎉
            </div>

            <p className="text-yellow-400 font-semibold uppercase tracking-wide mt-6">
              Order Confirmed
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-4 leading-tight">
              Your food is now being prepared.
            </h1>

            <p className="text-gray-400 mt-5 leading-relaxed">
              Redirecting you to live order tracking.
            </p>

            <Link
              to="/orders"
              className="block mt-8 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black py-4 rounded-2xl transition-all duration-200"
            >
              Track My Order
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-7 sm:py-10 pb-40">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
          {/* LEFT */}
          <section className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-8">
            <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
              Checkout
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-3 tracking-tight">
              Delivery details
            </h1>

            <p className="text-gray-500 mt-4 text-sm sm:text-base leading-relaxed">
              Homemade food prepared inside your apartment community.
            </p>

            <div className="mt-8 space-y-4">
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                placeholder="Full Name"
              />

              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                placeholder="Phone Number"
              />

              <input
                name="flat"
                value={formData.flat}
                onChange={handleChange}
                className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                placeholder="Tower B • Flat 1204"
              />

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all resize-none"
                placeholder="Extra spicy, less oil, call before arrival..."
              />
            </div>
          </section>

          {/* RIGHT */}
          <section className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-8 h-fit lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
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

            <div className="mt-7 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-black/40 border border-[#222] rounded-3xl p-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-black truncate">
                          {item.name}
                        </p>

                        <p className="text-gray-500 text-sm mt-1">
                          Qty {item.quantity}
                        </p>
                      </div>

                      <p className="font-black text-yellow-400 shrink-0">
                        ₹
                        {Number(item.price || 0) *
                          Number(item.quantity || 1)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-[#222] pt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-400">Subtotal</p>

                <p className="font-bold text-white">
                  ₹{subtotalAmount}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-400">Platform Fee</p>

                <p className="font-bold text-yellow-400">
                  ₹{PLATFORM_FEE}
                </p>
              </div>

              <div className="border-t border-[#222] pt-5 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">
                    Total Amount
                  </p>

                  <p className="text-gray-500 text-xs mt-1">
                    Fresh homemade food
                  </p>
                </div>

                <p className="text-4xl font-black text-yellow-400">
                  ₹{totalAmount}
                </p>
              </div>

              <button
  type="button"
  onClick={async () => {
    const { data, error } = await supabase.functions.invoke(
      "create-payment-session",
      {
        body: {
          customer_name: "Test Customer",
          phone: "9999999999",
          flat: "A-101",
          delivery_type: "Delivery",
          items: [
            {
              id: 1,
              name: "Test Dish",
              price: 100,
              quantity: 1,
            },
          ],
          subtotal_amount: 100,
          platform_fee: 10,
          total_amount: 110,
          notes: "Test order",
          seller_id: "test-seller-id",
        },
      }
    );

    console.log("PAYMENT SESSION DATA:", data);
console.log("PAYMENT SESSION ERROR:", error);

if (error?.context) {
  const errorText = await error.context.text();
  console.log("PAYMENT SESSION ERROR BODY:", errorText);
  alert(errorText);
} else {
  alert(JSON.stringify(data));
}
  }}
  className="w-full bg-blue-500 text-white font-bold py-3 rounded-2xl mb-4"
>
  Test Payment Session
</button>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full mt-3 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-5 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-yellow-500/20"
              >
                {loading
                  ? "Confirming Order..."
                  : `Place Order • ₹${totalAmount}`}
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
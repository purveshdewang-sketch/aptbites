import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SellerLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    kitchenName: "",
    flat: "",
    phone: "",
    specialty: "",
    about: "",
    acceptScheduledOrders: true,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSellerLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const user = data?.user;

      if (!user) {
        setMessage("Seller login failed.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_seller")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setMessage("Could not verify seller account.");
        setLoading(false);
        return;
      }

      const profileRole = String(profile?.role || "").toLowerCase();

      const isApprovedSeller =
        profile?.is_seller === true ||
        profileRole === "seller" ||
        profileRole === "admin";

      if (!isApprovedSeller) {
        setMessage(
          "This account is not approved as a seller. Please ask the app owner to enable seller access."
        );
        setLoading(false);
        return;
      }

      const sellerProfilePayload = {
        id: user.id,
        email: user.email,
        role: profileRole || "seller",
        is_seller: true,
        seller_online: true,
        accept_scheduled_orders: formData.acceptScheduledOrders,
        full_name: formData.kitchenName,
        flat: formData.flat,
        phone: formData.phone,
        seller_kitchen_name: formData.kitchenName,
        seller_specialty: formData.specialty,
        seller_about: formData.about,
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(sellerProfilePayload);

      if (updateError) {
        setMessage(`Seller details could not be saved: ${updateError.message}`);
        setLoading(false);
        return;
      }

      localStorage.setItem(`Nefo_seller_access_${user.id}`, "yes");

      if (formData.kitchenName) {
        localStorage.setItem(
          `Nefo_seller_name_${user.id}`,
          formData.kitchenName
        );
      }

      navigate("/seller-dashboard");
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 sm:px-6 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-6 sm:p-8 shadow-2xl h-fit">
          <p className="text-yellow-400 font-semibold tracking-wide uppercase text-sm">
            Nefo Seller Portal
          </p>

          <h1 className="text-4xl sm:text-5xl font-black mt-3 leading-tight">
            Sell homemade food in your community.
          </h1>

          <p className="text-gray-400 mt-4 text-sm sm:text-base leading-relaxed">
            Sign in as an approved seller and tell customers what makes your
            kitchen special.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="bg-black border border-[#2a2a2a] rounded-2xl p-4">
              <p className="text-yellow-400 text-sm font-bold">Live Orders</p>
              <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                Receive and manage customer orders in real time.
              </p>
            </div>

            <div className="bg-black border border-[#2a2a2a] rounded-2xl p-4">
              <p className="text-yellow-400 text-sm font-bold">
                Kitchen Control
              </p>
              <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                Update dishes, stock, pickup readiness, and order completion.
              </p>
            </div>

            <div className="bg-black border border-[#2a2a2a] rounded-2xl p-4">
              <p className="text-yellow-400 text-sm font-bold">
                Seller Profile
              </p>
              <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                Share your kitchen name, flat, speciality, and short intro.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="block text-gray-500 hover:text-gray-300 text-sm mt-7 transition-all"
          >
            ← Back to home
          </Link>
        </section>

        <section className="bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-6 sm:p-8 shadow-2xl">
          <div>
            <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
              Seller Sign In
            </p>

            <h2 className="text-3xl sm:text-4xl font-black mt-2">
              Tell us about yourself
            </h2>

            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              These details will help customers identify your home kitchen.
            </p>
          </div>

          {message && (
            <div className="mt-6 bg-black border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
              {message}
            </div>
          )}

          <form onSubmit={handleSellerLogin} className="mt-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                placeholder="Seller Email"
              />

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                placeholder="Password"
              />
            </div>

            <div className="h-px bg-[#2a2a2a] my-2" />

            <input
              type="text"
              name="kitchenName"
              value={formData.kitchenName}
              onChange={handleChange}
              required
              className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
              placeholder="Kitchen / Seller Name e.g. Asha's Kitchen"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="flat"
                value={formData.flat}
                onChange={handleChange}
                required
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                placeholder="Tower / Flat e.g. B-1204"
              />

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
                placeholder="Phone Number"
              />
            </div>

            <input
              type="text"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              required
              className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all"
              placeholder="Food Specialty e.g. South Indian breakfast, sweets, tiffin"
            />

            <textarea
              name="about"
              value={formData.about}
              onChange={handleChange}
              rows="4"
              required
              className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all resize-none"
              placeholder="Tell customers about yourself, your cooking style, hygiene, or food story..."
            />

            <label className="flex items-start gap-3 bg-black border border-[#333] rounded-2xl p-4 cursor-pointer">
              <input
                type="checkbox"
                name="acceptScheduledOrders"
                checked={formData.acceptScheduledOrders}
                onChange={handleChange}
                className="mt-1 accent-yellow-500"
              />

              <div>
                <p className="text-white font-bold">
                  Accept scheduled orders
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Customers can choose date and time for later orders.
                </p>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="block w-full mt-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black py-4 rounded-2xl text-center transition-all duration-200"
            >
              {loading ? "Signing In..." : "Continue to Seller Dashboard"}
            </button>
          </form>

          <p className="text-gray-600 text-xs mt-5 leading-relaxed">
            Seller dashboard access is available only for accounts approved by
            the app owner.
          </p>
        </section>
      </div>
    </main>
  );
}
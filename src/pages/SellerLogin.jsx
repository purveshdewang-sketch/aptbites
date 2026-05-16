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
        email: formData.email.trim(),
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
        full_name: formData.kitchenName.trim(),
        flat: formData.flat.trim(),
        phone: formData.phone.trim(),
        seller_kitchen_name: formData.kitchenName.trim(),
        seller_specialty: formData.specialty.trim(),
        seller_about: formData.about.trim(),
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

      if (formData.kitchenName.trim()) {
        localStorage.setItem(
          `Nefo_seller_name_${user.id}`,
          formData.kitchenName.trim()
        );
      }

      navigate("/seller-dashboard");
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] flex items-center justify-center px-4 sm:px-6 py-10 overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#41D3BD]/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#41D3BD]/10 blur-[110px] rounded-full" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <section className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/10 h-fit">
          <div className="w-14 h-14 rounded-3xl bg-[#41D3BD] flex items-center justify-center shadow-lg shadow-[#41D3BD]/20">
            <span className="text-[#073B35] text-2xl font-black">N</span>
          </div>

          <p className="text-[#1A9F8D] font-semibold tracking-wide uppercase text-sm mt-6">
            Nefo Seller Portal
          </p>

          <h1 className="text-4xl sm:text-5xl font-black mt-3 leading-tight text-[#111827]">
            Sell homemade food in your community.
          </h1>

          <p className="text-[#51615D] mt-4 text-sm sm:text-base leading-relaxed">
            Sign in as an approved seller and tell customers what makes your
            kitchen special.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
              <p className="text-[#073B35] text-sm font-black">Live Orders</p>
              <p className="text-[#51615D] text-xs mt-2 leading-relaxed">
                Receive and manage customer orders in real time.
              </p>
            </div>

            <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
              <p className="text-[#073B35] text-sm font-black">
                Kitchen Control
              </p>
              <p className="text-[#51615D] text-xs mt-2 leading-relaxed">
                Update dishes, stock, pickup readiness, and order completion.
              </p>
            </div>

            <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
              <p className="text-[#073B35] text-sm font-black">
                Seller Profile
              </p>
              <p className="text-[#51615D] text-xs mt-2 leading-relaxed">
                Share your kitchen name, flat, speciality, and short intro.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="block text-[#51615D] hover:text-[#073B35] text-sm mt-7 transition-all font-semibold"
          >
            ← Back to home
          </Link>
        </section>

        <section className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/10">
          <div>
            <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
              Seller Sign In
            </p>

            <h2 className="text-3xl sm:text-4xl font-black mt-2 text-[#111827]">
              Tell us about yourself
            </h2>

            <p className="text-[#51615D] mt-3 text-sm leading-relaxed">
              These details will help customers identify your home kitchen.
            </p>
          </div>

          {message && (
            <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm text-[#073B35]">
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
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all"
                placeholder="Seller Email"
              />

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all"
                placeholder="Password"
              />
            </div>

            <div className="h-px bg-[#D7F5EF] my-2" />

            <input
              type="text"
              name="kitchenName"
              value={formData.kitchenName}
              onChange={handleChange}
              required
              className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all"
              placeholder="Kitchen / Seller Name e.g. Asha's Kitchen"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="flat"
                value={formData.flat}
                onChange={handleChange}
                required
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all"
                placeholder="Tower / Flat e.g. B-1204"
              />

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all"
                placeholder="Phone Number"
              />
            </div>

            <input
              type="text"
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              required
              className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all"
              placeholder="Food Specialty e.g. South Indian breakfast, sweets, tiffin"
            />

            <textarea
              name="about"
              value={formData.about}
              onChange={handleChange}
              rows="4"
              required
              className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all resize-none"
              placeholder="Tell customers about yourself, your cooking style, hygiene, or food story..."
            />

            <label className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 cursor-pointer">
              <input
                type="checkbox"
                name="acceptScheduledOrders"
                checked={formData.acceptScheduledOrders}
                onChange={handleChange}
                className="mt-1 accent-[#41D3BD]"
              />

              <div>
                <p className="text-[#111827] font-bold">
                  Accept scheduled orders
                </p>
                <p className="text-[#51615D] text-sm mt-1">
                  Customers can choose date and time for later orders.
                </p>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="block w-full mt-2 bg-[#41D3BD] hover:bg-[#55E4CF] disabled:opacity-50 text-[#073B35] font-black py-4 rounded-2xl text-center transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
            >
              {loading ? "Signing In..." : "Continue to Seller Dashboard"}
            </button>
          </form>

          <p className="text-[#51615D] text-xs mt-5 leading-relaxed">
            Seller dashboard access is available only for accounts approved by
            the app owner.
          </p>
        </section>
      </div>
    </main>
  );
}
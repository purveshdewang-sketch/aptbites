import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SellerLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const sellerAccessKey = `quickbites_seller_access_${user.id}`;
  localStorage.setItem(sellerAccessKey, "yes");
  localStorage.setItem(`quickbites_seller_access_${user.id}`, "yes");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
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
        .select("is_seller")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setMessage("Could not verify seller account.");
        setLoading(false);
        return;
      }

      if (!profile?.is_seller) {
        setMessage("This account is not approved as a seller.");
        setLoading(false);
        return;
      }

      navigate("/seller-dashboard");
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-8 shadow-2xl">

        {/* Header */}
        <div className="text-center">
          <p className="text-yellow-400 font-semibold tracking-wide">
            QuickBites Seller Portal
          </p>

          <h1 className="text-4xl font-bold mt-3">
            Seller Sign In
          </h1>

          <p className="text-gray-400 mt-3 text-sm leading-relaxed">
            Access your kitchen dashboard and manage live neighbourhood food orders.
          </p>
        </div>

        {/* Error Message */}
        {message && (
          <div className="mt-6 bg-black border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
            {message}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSellerLogin}
          className="mt-8 space-y-4"
        >
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

          <button
            type="submit"
            disabled={loading}
            className="block w-full mt-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-4 rounded-2xl text-center transition-all duration-200"
          >
            {loading ? "Signing In..." : "Continue as Seller"}
          </button>
        </form>

        {/* Seller Features */}
        <div className="mt-8 grid grid-cols-2 gap-3">

          <div className="bg-black border border-[#2a2a2a] rounded-2xl p-4">
            <p className="text-yellow-400 text-sm font-semibold">
              Live Orders
            </p>

            <p className="text-gray-500 text-xs mt-2">
              Manage realtime customer apartment orders instantly.
            </p>
          </div>

          <div className="bg-black border border-[#2a2a2a] rounded-2xl p-4">
            <p className="text-yellow-400 text-sm font-semibold">
              Kitchen Control
            </p>

            <p className="text-gray-500 text-xs mt-2">
              Update dish stock, status, and order progress live.
            </p>
          </div>

        </div>

        {/* Footer */}
        <Link
          to="/"
          className="block text-gray-500 hover:text-gray-300 text-sm mt-6 text-center transition-all"
        >
          ← Back to home
        </Link>

      </div>
    </main>
  );
}
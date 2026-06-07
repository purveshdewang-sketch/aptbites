import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function CustomerLogin() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    apartmentName: "",
    block: "",
    flatNo: "",
  });

  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function cleanPhone(phone) {
    return phone.replace(/\D/g, "");
  }

  function buildFlatAddress() {
    return [
      formData.apartmentName.trim(),
      formData.block.trim(),
      formData.flatNo.trim(),
    ]
      .filter(Boolean)
      .join(" ");
  }

  async function handleForgotPassword() {
    const email = formData.email.trim();

    if (!email) {
      setMessage("Please enter your email first, then click Forgot Password.");
      return;
    }

    setResettingPassword(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage(`Password reset failed: ${error.message}`);
      setResettingPassword(false);
      return;
    }

    setMessage("Password reset link sent to your email.");
    setResettingPassword(false);
  }

  async function handleAuth(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        if (
          !formData.fullName.trim() ||
          !formData.phone.trim() ||
          !formData.apartmentName.trim() ||
          !formData.flatNo.trim()
        ) {
          setMessage(
            "Please fill your name, phone, apartment name, and flat number."
          );

          setLoading(false);
          return;
        }

        const cleanedPhone = cleanPhone(formData.phone);

        if (cleanedPhone.length < 10) {
          setMessage("Please enter a valid phone number.");
          setLoading(false);
          return;
        }

        const flatAddress = buildFlatAddress();

        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName.trim(),
              phone: cleanedPhone,
              apartment_name: formData.apartmentName.trim(),
              block: formData.block.trim(),
              flat_no: formData.flatNo.trim(),
              flat: flatAddress,
              role: selectedRole,
            },
          },
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        const newUser = data?.user;

        if (newUser) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: newUser.id,
              full_name: formData.fullName.trim(),
              phone: cleanedPhone,
              email: formData.email.trim(),
              apartment_name: formData.apartmentName.trim(),
              block: formData.block.trim(),
              flat_no: formData.flatNo.trim(),
              flat: flatAddress,
              role: selectedRole,
              is_seller: selectedRole === "seller",
            });

          if (profileError) {
            setMessage(`Profile save failed: ${profileError.message}`);
            setLoading(false);
            return;
          }
        }

        if (selectedRole === "seller") {
          navigate("/seller-dashboard");
        } else {
          navigate("/marketplace");
        }
      } else {
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
          setMessage("Login failed.");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_seller")
          .eq("id", user.id)
          .maybeSingle();

        const profileRole = String(profile?.role || "").toLowerCase();

        const isSeller =
          profileRole === "seller" ||
          profileRole === "admin" ||
          profile?.is_seller === true;

        if (isSeller || selectedRole === "seller") {
          navigate("/seller-dashboard");
        } else {
          navigate("/marketplace");
        }
      }
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 sm:py-10 overflow-hidden">
      <div className="fixed top-0 right-0 w-80 h-80 bg-[#41D3BD]/20 blur-[110px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto min-h-[calc(100vh-5rem)] grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-center">
        <section className="hidden lg:block">
          <div className="relative overflow-hidden bg-[#073B35] rounded-[2.5rem] p-10 min-h-[680px] shadow-2xl shadow-[#073B35]/25">
            <div className="absolute -top-28 -right-28 w-96 h-96 bg-[#41D3BD]/25 rounded-full blur-[110px]" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 rounded-full blur-[100px]" />

            <div className="relative h-full flex flex-col justify-between min-h-[600px]">
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-3 bg-white/10 border border-white/10 rounded-3xl px-4 py-3 hover:bg-white/15 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FFFFF2] flex items-center justify-center overflow-hidden">
                    <img
                      src="/Nefo-logo.png"
                      alt="Nefo"
                      className="w-full h-full object-cover scale-[1.65]"
                    />
                  </div>

                  <div>
                    <p className="text-white font-black text-xl">Nefo</p>
                    <p className="text-[#D7F5EF] text-xs uppercase tracking-wide">
                      homemade nearby food
                    </p>
                  </div>
                </Link>

                <div className="mt-12">
                  <div className="inline-flex items-center gap-2 bg-[#41D3BD]/15 border border-[#41D3BD]/25 text-[#41D3BD] px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide">
                    <span>🌿</span>
                    <span>Community kitchens</span>
                  </div>

                  <h1 className="text-white text-6xl font-black mt-6 leading-[0.98] tracking-tight">
                    Fresh food,
                    <span className="block text-[#41D3BD]">
                      closer to home.
                    </span>
                  </h1>

                  <p className="text-[#D7F5EF] text-lg mt-6 leading-relaxed max-w-xl">
                    Sign in to order homemade food from trusted kitchens or
                    manage your own Nefo kitchen panel.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">🍲</p>
                  <p className="text-white font-black mt-3">Fresh</p>
                  <p className="text-white/60 text-xs mt-1">
                    Daily food drops
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">🏠</p>
                  <p className="text-white font-black mt-3">Local</p>
                  <p className="text-white/60 text-xs mt-1">
                    Nearby kitchens
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">🔒</p>
                  <p className="text-white font-black mt-3">Private</p>
                  <p className="text-white/60 text-xs mt-1">
                    Safe location flow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl mx-auto lg:max-w-none">
          <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl shadow-[#073B35]/10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FFFFF2] border border-[#D7F5EF] flex items-center justify-center overflow-hidden shadow-sm">
                  <img
                    src="/Nefo-logo.png"
                    alt="Nefo"
                    className="w-full h-full object-cover scale-[1.65]"
                  />
                </div>

                <div>
                  <p className="text-[#073B35] font-black text-xl">Nefo</p>
                  <p className="text-[#51615D] text-[10px] uppercase tracking-wide">
                    Login
                  </p>
                </div>
              </Link>

              <Link
                to="/"
                className="text-[#51615D] hover:text-[#073B35] text-sm font-black"
              >
                Home
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("customer");
                  setMessage("");
                }}
                className={`py-3 rounded-2xl font-black transition-all ${
                  selectedRole === "customer"
                    ? "bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15"
                    : "text-[#51615D] hover:bg-white"
                }`}
              >
                Customer
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole("seller");
                  setMessage("");
                }}
                className={`py-3 rounded-2xl font-black transition-all ${
                  selectedRole === "seller"
                    ? "bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15"
                    : "text-[#51615D] hover:bg-white"
                }`}
              >
                Seller
              </button>
            </div>

            <div>
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                {selectedRole === "seller"
                  ? "Kitchen access"
                  : "Customer access"}
              </p>

              <h1 className="text-3xl sm:text-4xl font-black mt-2 text-[#111827] leading-tight">
                {isSignUp
                  ? `Create ${
                      selectedRole === "seller" ? "seller" : "customer"
                    } account`
                  : "Welcome back"}
              </h1>

              <p className="text-[#51615D] mt-3 leading-relaxed">
                {selectedRole === "seller"
                  ? "Manage dishes, stock, scheduling, and realtime neighbourhood food orders."
                  : "Order homemade food from trusted kitchens inside your community."}
              </p>
            </div>

            {message && (
              <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35]">
                {message}
              </div>
            )}

            <form onSubmit={handleAuth} className="mt-7 space-y-4">
              {isSignUp && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Full name"
                    className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                  />

                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Phone number"
                    className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                  />
                </div>
              )}

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Email address"
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
              />

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Password"
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
              />

              {!isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resettingPassword}
                    className="text-[#1A9F8D] hover:text-[#073B35] text-sm font-black transition-all disabled:opacity-50"
                  >
                    {resettingPassword
                      ? "Sending reset link..."
                      : "Forgot Password?"}
                  </button>
                </div>
              )}

              {isSignUp && (
                <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                  <p className="text-[#073B35] font-black mb-4">
                    Apartment Address
                  </p>

                  <div className="space-y-4">
                    <input
                      name="apartmentName"
                      value={formData.apartmentName}
                      onChange={handleChange}
                      required
                      placeholder="Apartment name"
                      className="w-full bg-white/80 border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        name="block"
                        value={formData.block}
                        onChange={handleChange}
                        placeholder="Block / Tower"
                        className="bg-white/80 border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                      />

                      <input
                        name="flatNo"
                        value={formData.flatNo}
                        onChange={handleChange}
                        required
                        placeholder="Flat No."
                        className="bg-white/80 border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                      />
                    </div>
                  </div>

                  <p className="text-[#51615D] text-xs mt-4 leading-relaxed">
                    Address is used for order coordination. Kitchen/customer
                    door details are not shown publicly.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.99] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15"
              >
                {loading
                  ? "Please wait..."
                  : isSignUp
                  ? "Create Account"
                  : "Sign In"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage("");
              }}
              className="w-full mt-5 text-sm text-[#1A9F8D] hover:text-[#073B35] font-black"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "New here? Create an account"}
            </button>

            <Link
              to="/marketplace"
              className="block text-[#51615D] hover:text-[#073B35] text-sm mt-6 text-center font-bold"
            >
              Continue to Marketplace
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
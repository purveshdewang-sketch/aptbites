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
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] flex items-center justify-center px-4 sm:px-6 py-10 overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#41D3BD]/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#41D3BD]/10 blur-[110px] rounded-full" />

      <div className="relative w-full max-w-lg bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/10">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-3xl bg-[#41D3BD] flex items-center justify-center shadow-lg shadow-[#41D3BD]/20">
            <span className="text-[#073B35] text-2xl font-black">N</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setSelectedRole("customer");
              setMessage("");
            }}
            className={`py-3 rounded-2xl font-bold transition-all ${
              selectedRole === "customer"
                ? "bg-[#41D3BD] text-[#073B35] shadow-lg shadow-[#41D3BD]/20"
                : "bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D]"
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
            className={`py-3 rounded-2xl font-bold transition-all ${
              selectedRole === "seller"
                ? "bg-[#41D3BD] text-[#073B35] shadow-lg shadow-[#41D3BD]/20"
                : "bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D]"
            }`}
          >
            Seller
          </button>
        </div>

        <h1 className="text-3xl font-black text-center text-[#111827]">
          {isSignUp
            ? `Create ${
                selectedRole === "seller" ? "Seller" : "Customer"
              } Account`
            : "Welcome Back"}
        </h1>

        <p className="text-[#51615D] mt-3 text-center leading-relaxed">
          {selectedRole === "seller"
            ? "Manage dishes, stock, and realtime neighbourhood food orders."
            : "Order homemade food from your apartment community."}
        </p>

        {message && (
          <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm text-[#073B35]">
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
                className="text-[#1A9F8D] hover:text-[#073B35] text-sm font-bold transition-all disabled:opacity-50"
              >
                {resettingPassword
                  ? "Sending reset link..."
                  : "Forgot Password?"}
              </button>
            </div>
          )}

          {isSignUp && (
            <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
              <p className="text-[#073B35] font-bold mb-4">
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
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.99] disabled:opacity-50 text-[#073B35] font-black py-4 rounded-2xl shadow-lg shadow-[#41D3BD]/20"
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
          className="w-full mt-5 text-sm text-[#1A9F8D] hover:text-[#073B35] font-semibold"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "New here? Create an account"}
        </button>

        <Link to="/" className="block text-[#51615D] text-sm mt-6 text-center">
          Continue to Nefo
        </Link>
      </div>
    </main>
  );
}
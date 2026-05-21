import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function CustomerLogin() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");
  const [otpSent, setOtpSent] = useState(false);

  const [formData, setFormData] = useState({
    phone: "",
    otp: "",
    fullName: "",
    apartmentName: "",
    block: "",
    flatNo: "",
  });

  const [loading, setLoading] = useState(false);
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

  function formatPhoneForSupabase(phone) {
    const cleanedPhone = cleanPhone(phone);

    if (cleanedPhone.length === 10) {
      return `+91${cleanedPhone}`;
    }

    if (cleanedPhone.length === 12 && cleanedPhone.startsWith("91")) {
      return `+${cleanedPhone}`;
    }

    return phone.trim();
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

  function validateSignupDetails() {
    if (
      !formData.fullName.trim() ||
      !formData.phone.trim() ||
      !formData.apartmentName.trim() ||
      !formData.flatNo.trim()
    ) {
      setMessage("Please fill your name, phone, apartment name, and flat number.");
      return false;
    }

    const cleanedPhone = cleanPhone(formData.phone);

    if (cleanedPhone.length < 10) {
      setMessage("Please enter a valid phone number.");
      return false;
    }

    return true;
  }

  async function sendOtp(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (isSignUp && !validateSignupDetails()) {
        setLoading(false);
        return;
      }

      const phone = formatPhoneForSupabase(formData.phone);

      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setOtpSent(true);
      setMessage(`OTP sent to ${phone}.`);
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  async function verifyOtp(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const phone = formatPhoneForSupabase(formData.phone);

      if (!formData.otp.trim()) {
        setMessage("Please enter the OTP.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: formData.otp.trim(),
        type: "sms",
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const user = data?.user;

      if (!user) {
        setMessage("OTP verification failed.");
        setLoading(false);
        return;
      }

      const flatAddress = buildFlatAddress();
      const cleanedPhone = cleanPhone(formData.phone);

      if (isSignUp) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: formData.fullName.trim(),
          phone: cleanedPhone,
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

        if (selectedRole === "seller") {
          localStorage.setItem(`Nefo_seller_access_${user.id}`, "yes");
          navigate("/seller-login");
        } else {
          navigate("/marketplace");
        }

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
        localStorage.setItem(`Nefo_seller_access_${user.id}`, "yes");
        navigate("/seller-dashboard");
      } else {
        navigate("/marketplace");
      }
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  function resetOtpState() {
    setOtpSent(false);
    setMessage("");
    setFormData((current) => ({
      ...current,
      otp: "",
    }));
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
              resetOtpState();
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
              resetOtpState();
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
          {otpSent
            ? "Enter OTP"
            : isSignUp
            ? `Create ${selectedRole === "seller" ? "Seller" : "Customer"} Account`
            : "Welcome Back"}
        </h1>

        <p className="text-[#51615D] mt-3 text-center leading-relaxed">
          {otpSent
            ? "Enter the OTP sent to your phone number."
            : selectedRole === "seller"
            ? "Sign in with phone OTP to manage dishes, stock, and orders."
            : "Sign in with phone OTP to order homemade food nearby."}
        </p>

        {message && (
          <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm text-[#073B35]">
            {message}
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={sendOtp} className="mt-7 space-y-4">
            {isSignUp && (
              <input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Full name"
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
              />
            )}

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Phone number e.g. 9876543210"
              className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
            />

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
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-7 space-y-4">
            <input
              type="text"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              required
              inputMode="numeric"
              placeholder="Enter OTP"
              className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-center text-xl font-black tracking-[0.35em]"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.99] disabled:opacity-50 text-[#073B35] font-black py-4 rounded-2xl shadow-lg shadow-[#41D3BD]/20"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={sendOtp}
              disabled={loading}
              className="w-full border border-[#41D3BD]/45 bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#073B35] font-black py-4 rounded-2xl transition-all"
            >
              Resend OTP
            </button>

            <button
              type="button"
              onClick={resetOtpState}
              className="w-full text-[#1A9F8D] hover:text-[#073B35] text-sm font-bold"
            >
              Change phone number
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            resetOtpState();
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
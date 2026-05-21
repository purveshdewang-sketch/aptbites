import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SellerLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phone: "",
    otp: "",
    kitchenName: "",
    flat: "",
    specialty: "",
    about: "",
    acceptScheduledOrders: true,
  });

  const [otpSent, setOtpSent] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    setCheckingSession(true);
    setMessage("");

    const { data } = await supabase.auth.getUser();
    const loggedInUser = data?.user || null;

    if (!loggedInUser) {
      setCheckingSession(false);
      return;
    }

    const profileResult = await getSellerProfile(loggedInUser.id);

    if (!profileResult.ok) {
      setMessage(profileResult.message);
      setCheckingSession(false);
      return;
    }

    if (!profileResult.isApprovedSeller) {
      setMessage(
        "You are already signed in, but this account is not approved as a seller."
      );
      setCheckingSession(false);
      return;
    }

    setCurrentUser(loggedInUser);
    setSellerVerified(true);
    fillSellerForm(loggedInUser, profileResult.profile);
    setMessage("Review your seller details and continue to dashboard.");
    setCheckingSession(false);
  }

  async function getSellerProfile(userId) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "role, is_seller, full_name, phone, flat, seller_kitchen_name, seller_specialty, seller_about, accept_scheduled_orders"
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        message: "Could not verify seller account.",
        profile: null,
        isApprovedSeller: false,
      };
    }

    const profileRole = String(profile?.role || "").toLowerCase();

    const isApprovedSeller =
      profile?.is_seller === true ||
      profileRole === "seller" ||
      profileRole === "admin";

    return {
      ok: true,
      message: "",
      profile,
      isApprovedSeller,
    };
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

    if (phone.trim().startsWith("+")) {
      return phone.trim();
    }

    return `+${cleanedPhone}`;
  }

  function fillSellerForm(user, profile) {
    setFormData((current) => ({
      ...current,
      phone:
        profile?.phone ||
        user?.phone?.replace("+91", "") ||
        current.phone ||
        "",
      otp: "",
      kitchenName: profile?.seller_kitchen_name || profile?.full_name || "",
      flat: profile?.flat || "",
      specialty: profile?.seller_specialty || "",
      about: profile?.seller_about || "",
      acceptScheduledOrders: profile?.accept_scheduled_orders !== false,
    }));
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function sellerSetupFieldsAreValid() {
    return Boolean(
      formData.kitchenName.trim() &&
        formData.flat.trim() &&
        formData.phone.trim() &&
        formData.specialty.trim()
    );
  }

  async function sendOtp(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const cleanedPhone = cleanPhone(formData.phone);

      if (cleanedPhone.length < 10) {
        setMessage("Please enter a valid phone number.");
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

      const signedInUser = data?.user;

      if (!signedInUser) {
        setMessage("Seller OTP verification failed.");
        setLoading(false);
        return;
      }

      const profileResult = await getSellerProfile(signedInUser.id);

      if (!profileResult.ok) {
        setMessage(profileResult.message);
        setLoading(false);
        return;
      }

      if (!profileResult.isApprovedSeller) {
        setMessage(
          "This phone number is not approved as a seller. Please ask the app owner to enable seller access."
        );
        setLoading(false);
        return;
      }

      setCurrentUser(signedInUser);
      setSellerVerified(true);
      fillSellerForm(signedInUser, profileResult.profile);
      setOtpSent(false);
      setMessage("Seller verified. Review your details and continue.");
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  async function saveSellerDetails(user, existingProfile = null) {
    if (!sellerSetupFieldsAreValid()) {
      throw new Error(
        "Please fill kitchen name, flat, phone number, and food specialty."
      );
    }

    const existingRole = String(existingProfile?.role || "").toLowerCase();
    const finalRole = existingRole === "admin" ? "admin" : "seller";

    const sellerProfilePayload = {
      id: user.id,
      phone: cleanPhone(formData.phone),
      role: finalRole,
      is_seller: true,
      seller_online: true,
      accept_scheduled_orders: formData.acceptScheduledOrders,
      full_name: formData.kitchenName.trim(),
      flat: formData.flat.trim(),
      seller_kitchen_name: formData.kitchenName.trim(),
      seller_specialty: formData.specialty.trim(),
      seller_about: formData.about.trim(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(sellerProfilePayload);

    if (error) {
      throw new Error(`Seller details could not be saved: ${error.message}`);
    }

    localStorage.setItem(`Nefo_seller_access_${user.id}`, "yes");
    localStorage.setItem(
      `Nefo_seller_name_${user.id}`,
      formData.kitchenName.trim()
    );

    return true;
  }

  async function handleSellerContinue(event) {
    event.preventDefault();

    if (!currentUser || !sellerVerified) {
      setMessage("Please verify your seller phone number first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const profileResult = await getSellerProfile(currentUser.id);

      if (!profileResult.ok) {
        setMessage(profileResult.message);
        setLoading(false);
        return;
      }

      if (!profileResult.isApprovedSeller) {
        setMessage(
          "This account is not approved as a seller. Please ask the app owner to enable seller access."
        );
        setLoading(false);
        return;
      }

      await saveSellerDetails(currentUser, profileResult.profile);
      navigate("/seller-dashboard");
    } catch (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function handleUseAnotherAccount() {
    await supabase.auth.signOut();

    setCurrentUser(null);
    setSellerVerified(false);
    setOtpSent(false);
    setMessage("");

    setFormData({
      phone: "",
      otp: "",
      kitchenName: "",
      flat: "",
      specialty: "",
      about: "",
      acceptScheduledOrders: true,
    });
  }

  function resetOtpState() {
    setOtpSent(false);
    setMessage("");
    setFormData((current) => ({
      ...current,
      otp: "",
    }));
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] flex items-center justify-center px-4">
        <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-8 shadow-xl shadow-[#073B35]/5">
          <p className="text-[#51615D] font-bold">Checking seller account...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] flex items-center justify-center px-4 sm:px-6 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <section className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/5 h-fit">
          <div className="w-16 h-16 rounded-3xl bg-[#41D3BD] text-[#073B35] font-black text-2xl flex items-center justify-center shadow-lg shadow-[#41D3BD]/20 mb-7">
            N
          </div>

          <p className="text-[#1A9F8D] font-semibold tracking-wide uppercase text-sm">
            Nefo Seller Portal
          </p>

          <h1 className="text-4xl sm:text-5xl font-black mt-3 leading-tight text-[#111827]">
            Sell homemade food in your community.
          </h1>

          <p className="text-[#51615D] mt-4 text-sm sm:text-base leading-relaxed">
            Sign in with phone OTP as an approved seller, review your kitchen
            details, and continue to your dashboard.
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
            className="block text-[#51615D] hover:text-[#1A9F8D] text-sm mt-7 transition-all"
          >
            ← Back to home
          </Link>
        </section>

        <section className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/5">
          <div>
            <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
              Seller Sign In
            </p>

            <h2 className="text-3xl sm:text-4xl font-black mt-2 text-[#111827]">
              {currentUser
                ? "Review seller details"
                : otpSent
                ? "Enter OTP"
                : "Welcome back"}
            </h2>

            <p className="text-[#51615D] mt-3 text-sm leading-relaxed">
              {currentUser
                ? "Confirm or update your seller details before opening the dashboard."
                : otpSent
                ? "Enter the OTP sent to your registered seller phone number."
                : "Sign in with your approved seller phone number."}
            </p>
          </div>

          {message && (
            <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm text-[#073B35]">
              {message}
            </div>
          )}

          {!currentUser && !otpSent && (
            <form onSubmit={sendOtp} className="mt-7 space-y-4">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                placeholder="Seller phone number e.g. 9876543210"
              />

              <button
                type="submit"
                disabled={loading}
                className="block w-full mt-2 bg-[#41D3BD] hover:bg-[#55E4CF] disabled:opacity-50 text-[#073B35] font-black py-4 rounded-2xl text-center transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {!currentUser && otpSent && (
            <form onSubmit={verifyOtp} className="mt-7 space-y-4">
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                required
                inputMode="numeric"
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827] text-center text-xl font-black tracking-[0.35em]"
                placeholder="Enter OTP"
              />

              <button
                type="submit"
                disabled={loading}
                className="block w-full mt-2 bg-[#41D3BD] hover:bg-[#55E4CF] disabled:opacity-50 text-[#073B35] font-black py-4 rounded-2xl text-center transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
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

          {currentUser && sellerVerified && (
            <form onSubmit={handleSellerContinue} className="mt-7 space-y-4">
              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                <p className="text-[#073B35] font-black text-sm">
                  Signed in as seller
                </p>
                <p className="text-[#51615D] text-sm mt-1 truncate">
                  {currentUser.phone || formatPhoneForSupabase(formData.phone)}
                </p>

                <button
                  type="button"
                  onClick={handleUseAnotherAccount}
                  className="mt-3 text-[#1A9F8D] hover:text-[#073B35] text-sm font-bold"
                >
                  Use another account
                </button>
              </div>

              <input
                type="text"
                name="kitchenName"
                value={formData.kitchenName}
                onChange={handleChange}
                required
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                placeholder="Kitchen / Seller Name e.g. Asha's Kitchen"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="flat"
                  value={formData.flat}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                  placeholder="Tower / Flat e.g. B-1204"
                />

                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                  placeholder="Phone Number"
                />
              </div>

              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                required
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                placeholder="Food Specialty e.g. South Indian breakfast, sweets, tiffin"
              />

              <textarea
                name="about"
                value={formData.about}
                onChange={handleChange}
                rows="4"
                className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all resize-none text-[#111827]"
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
                {loading ? "Please wait..." : "Save and Continue to Dashboard"}
              </button>
            </form>
          )}

          <p className="text-[#8AA5A0] text-xs mt-5 leading-relaxed">
            Seller dashboard access is available only for phone numbers approved
            by the app owner.
          </p>
        </section>
      </div>
    </main>
  );
}
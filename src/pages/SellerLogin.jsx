import { useEffect, useState } from "react";
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

  const [currentUser, setCurrentUser] = useState(null);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
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
      setMessage(getSellerAccessMessage(profileResult.profile));
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
        "role, is_seller, seller_application_status, full_name, phone, flat, seller_kitchen_name, seller_specialty, seller_about, accept_scheduled_orders"
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
    const applicationStatus = String(
      profile?.seller_application_status || "not_applied"
    ).toLowerCase();

    const isAdmin = profileRole === "admin";

    const isApprovedSeller =
      profileRole === "seller" &&
      profile?.is_seller === true &&
      applicationStatus === "approved";

    return {
      ok: true,
      message: "",
      profile,
      isApprovedSeller: isAdmin || isApprovedSeller,
    };
  }

  function getSellerAccessMessage(profile) {
    const applicationStatus = String(
      profile?.seller_application_status || "not_applied"
    ).toLowerCase();

    if (applicationStatus === "pending") {
      return "Your seller application is under review. Please wait for owner approval.";
    }

    if (applicationStatus === "rejected") {
      return "Your seller application was rejected. Please open Seller Registration to review and re-apply.";
    }

    return "This account is not approved as a seller. Please apply to sell on Nefo first.";
  }

  function fillSellerForm(user, profile) {
    setFormData((current) => ({
      ...current,
      email: user?.email || current.email || "",
      password: "",
      kitchenName: profile?.seller_kitchen_name || profile?.full_name || "",
      flat: profile?.flat || "",
      phone: profile?.phone || "",
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

  async function saveSellerDetails(user, existingProfile = null) {
    if (!sellerSetupFieldsAreValid()) {
      throw new Error(
        "Please fill kitchen name, flat, phone number, and food specialty."
      );
    }

    const existingRole = String(existingProfile?.role || "").toLowerCase();
    const isAdmin = existingRole === "admin";

    const sellerProfilePayload = {
      id: user.id,
      email: user.email,
      role: isAdmin ? "admin" : "seller",
      is_seller: true,
      seller_online: true,
      seller_application_status: "approved",
      accept_scheduled_orders: formData.acceptScheduledOrders,
      full_name: formData.kitchenName.trim(),
      flat: formData.flat.trim(),
      phone: formData.phone.trim(),
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

    localStorage.setItem(
      `Nefo_seller_name_${user.id}`,
      formData.kitchenName.trim()
    );

    return true;
  }

  async function handleSellerLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (!currentUser) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        const signedInUser = data?.user;

        if (!signedInUser) {
          setMessage("Seller login failed.");
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
          setMessage(getSellerAccessMessage(profileResult.profile));
          setLoading(false);
          return;
        }

        setCurrentUser(signedInUser);
        setSellerVerified(true);
        fillSellerForm(signedInUser, profileResult.profile);

        setMessage("Seller login successful. Review your details and continue.");
        setLoading(false);
        return;
      }

      if (!sellerVerified) {
        setMessage("Seller account is not verified.");
        setLoading(false);
        return;
      }

      const profileResult = await getSellerProfile(currentUser.id);

      if (!profileResult.ok) {
        setMessage(profileResult.message);
        setLoading(false);
        return;
      }

      if (!profileResult.isApprovedSeller) {
        setMessage(getSellerAccessMessage(profileResult.profile));
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

  async function handleUseAnotherAccount() {
    await supabase.auth.signOut();

    setCurrentUser(null);
    setSellerVerified(false);
    setMessage("");

    setFormData({
      email: "",
      password: "",
      kitchenName: "",
      flat: "",
      phone: "",
      specialty: "",
      about: "",
      acceptScheduledOrders: true,
    });
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] flex items-center justify-center px-4">
        <div className="fixed top-0 right-0 w-80 h-80 bg-[#41D3BD]/20 blur-[110px] rounded-full pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 shadow-xl shadow-[#073B35]/5 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-3xl">
            👨‍🍳
          </div>

          <p className="text-[#51615D] font-bold mt-4">
            Checking seller account...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 sm:py-10 overflow-hidden">
      <div className="fixed top-0 right-0 w-80 h-80 bg-[#41D3BD]/20 blur-[110px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto min-h-[calc(100vh-5rem)] grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-center">
        <section className="hidden lg:block">
          <div className="relative overflow-hidden bg-[#073B35] rounded-[2.5rem] p-10 min-h-[720px] shadow-2xl shadow-[#073B35]/25">
            <div className="absolute -top-28 -right-28 w-96 h-96 bg-[#41D3BD]/25 rounded-full blur-[110px]" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 rounded-full blur-[100px]" />

            <div className="relative h-full flex flex-col justify-between min-h-[640px]">
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
                      kitchen partner
                    </p>
                  </div>
                </Link>

                <div className="mt-12">
                  <div className="inline-flex items-center gap-2 bg-[#41D3BD]/15 border border-[#41D3BD]/25 text-[#41D3BD] px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide">
                    <span>👨‍🍳</span>
                    <span>Seller portal</span>
                  </div>

                  <h1 className="text-white text-6xl font-black mt-6 leading-[0.98] tracking-tight">
                    Run your
                    <span className="block text-[#41D3BD]">
                      kitchen panel.
                    </span>
                  </h1>

                  <p className="text-[#D7F5EF] text-lg mt-6 leading-relaxed max-w-xl">
                    Sign in as an approved seller, manage dishes, control stock,
                    accept orders, and serve fresh homemade food to your
                    community.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">🛎️</p>
                  <p className="text-white font-black mt-3">Orders</p>
                  <p className="text-white/60 text-xs mt-1">Live requests</p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">🍲</p>
                  <p className="text-white font-black mt-3">Menu</p>
                  <p className="text-white/60 text-xs mt-1">Dish control</p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">📊</p>
                  <p className="text-white font-black mt-3">Sales</p>
                  <p className="text-white/60 text-xs mt-1">Basic analytics</p>
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
                    Seller Login
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

            <div>
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                Seller access
              </p>

              <h1 className="text-3xl sm:text-4xl font-black mt-2 text-[#111827] leading-tight">
                {currentUser ? "Review seller details" : "Welcome back"}
              </h1>

              <p className="text-[#51615D] mt-3 leading-relaxed">
                {currentUser
                  ? "Confirm or update your kitchen profile before opening the dashboard."
                  : "Sign in with your approved seller account to manage your kitchen."}
              </p>
            </div>

            {message && (
              <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35]">
                {message}
              </div>
            )}

            {!currentUser && message && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/seller-registration"
                  className="flex-1 text-center bg-[#41D3BD]/15 border border-[#41D3BD]/30 hover:bg-[#41D3BD]/25 text-[#073B35] font-black px-4 py-3 rounded-2xl transition-all"
                >
                  Open Seller Registration
                </Link>

                <Link
                  to="/customer-login"
                  className="flex-1 text-center bg-white border border-[#D7F5EF] hover:bg-[#FFFFF2] text-[#51615D] font-black px-4 py-3 rounded-2xl transition-all"
                >
                  Customer Login
                </Link>
              </div>
            )}

            <form onSubmit={handleSellerLogin} className="mt-7 space-y-4">
              {!currentUser && (
                <>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                    placeholder="Seller email"
                  />

                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                    placeholder="Password"
                  />

                  <div className="flex items-center justify-between gap-3">
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

                    <Link
                      to="/customer-login"
                      className="text-[#51615D] hover:text-[#073B35] text-sm font-bold"
                    >
                      Customer login
                    </Link>
                  </div>
                </>
              )}

              {currentUser && sellerVerified && (
                <>
                  <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                    <p className="text-[#073B35] font-black text-sm">
                      Signed in as seller
                    </p>

                    <p className="text-[#51615D] text-sm mt-1 truncate">
                      {currentUser.email}
                    </p>

                    <button
                      type="button"
                      onClick={handleUseAnotherAccount}
                      className="mt-3 text-[#1A9F8D] hover:text-[#073B35] text-sm font-black"
                    >
                      Use another account
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <input
                      type="text"
                      name="kitchenName"
                      value={formData.kitchenName}
                      onChange={handleChange}
                      required
                      className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all text-[#111827]"
                      placeholder="Kitchen name e.g. Asha's Kitchen"
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
                      placeholder="Food specialty e.g. South Indian breakfast, sweets, tiffin"
                    />

                    <textarea
                      name="about"
                      value={formData.about}
                      onChange={handleChange}
                      rows="4"
                      className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] transition-all resize-none text-[#111827]"
                      placeholder="Tell customers about your cooking style, hygiene, or food story..."
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
                        <p className="text-[#111827] font-black">
                          Accept scheduled orders
                        </p>

                        <p className="text-[#51615D] text-sm mt-1">
                          Customers can choose date and time for later orders.
                        </p>
                      </div>
                    </label>

                    <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
                      <p className="text-[#073B35] font-black text-sm">
                        Privacy note
                      </p>

                      <p className="text-[#51615D] text-xs mt-1 leading-relaxed">
                        Your flat is used for operational coordination. Exact
                        kitchen door/location should not be shown publicly to
                        customers.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="block w-full mt-2 bg-[#073B35] hover:bg-[#0B5149] disabled:opacity-50 text-white font-black py-4 rounded-2xl text-center transition-all duration-200 shadow-lg shadow-[#073B35]/15"
              >
                {loading
                  ? "Please wait..."
                  : currentUser
                  ? "Save and Continue to Dashboard"
                  : "Sign In"}
              </button>
            </form>

            <p className="text-[#8AA5A0] text-xs mt-5 leading-relaxed">
              Seller dashboard access is available only for accounts approved by
              the app owner.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
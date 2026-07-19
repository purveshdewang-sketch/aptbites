import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

export default function SellerLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    kitchenName: "",
    flat: "",
    doorNo: "",
    phone: "",
    specialty: "",
    about: "",
    acceptScheduledOrders: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sellerVerified, setSellerVerified] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    kitchenName: "",
    flat: "",
    doorNo: "",
    phone: "",
    specialty: "",
    general: "",
  });

  useEffect(() => {
    checkExistingSession();
  }, []);

  function clearErrors() {
    setErrors({
      email: "",
      password: "",
      kitchenName: "",
      flat: "",
      doorNo: "",
      phone: "",
      specialty: "",
      general: "",
    });
  }

  function setAuthError(errorMessage) {
    const cleanMessage = String(errorMessage || "").toLowerCase();

    if (
      cleanMessage.includes("invalid login credentials") ||
      cleanMessage.includes("invalid")
    ) {
      setErrors((current) => ({
        ...current,
        password: "Invalid seller email or password.",
      }));
      return;
    }

    if (cleanMessage.includes("email")) {
      setErrors((current) => ({
        ...current,
        email: errorMessage,
      }));
      return;
    }

    setErrors((current) => ({
      ...current,
      general: errorMessage || "Something went wrong. Please try again.",
    }));
  }

  async function checkExistingSession() {
    setCheckingSession(true);
    setMessage("");
    setResetMessage("");
    clearErrors();

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
        "role, is_seller, seller_application_status, full_name, phone, flat, seller_door_no, seller_kitchen_name, seller_specialty, seller_about, accept_scheduled_orders"
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

    return "This account is not approved as a seller. Please apply to sell on NeFo first.";
  }

  function fillSellerForm(user, profile) {
    setFormData((current) => ({
      ...current,
      email: user?.email || current.email || "",
      password: "",
      kitchenName: profile?.seller_kitchen_name || profile?.full_name || "",
      flat: profile?.flat || "",
      doorNo: profile?.seller_door_no || "",
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

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
      general: "",
    }));

    setMessage("");
  }

  function validateLoginFields() {
    const nextErrors = {
      email: "",
      password: "",
      kitchenName: "",
      flat: "",
      doorNo: "",
      phone: "",
      specialty: "",
      general: "",
    };

    if (!formData.email.trim()) {
      nextErrors.email = "Seller email is required.";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  }

  function validateSellerSetupFields() {
    const nextErrors = {
      email: "",
      password: "",
      kitchenName: "",
      flat: "",
      doorNo: "",
      phone: "",
      specialty: "",
      general: "",
    };

    if (!formData.kitchenName.trim()) {
      nextErrors.kitchenName = "Kitchen name is required.";
    }

    if (!formData.flat.trim()) {
      nextErrors.flat = "Tower / flat is required.";
    }

    if (!formData.doorNo.trim()) {
      nextErrors.doorNo = "Door number is required.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    }

    if (!formData.specialty.trim()) {
      nextErrors.specialty = "Food specialty is required.";
    }

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  }

  async function saveSellerDetails(user, existingProfile = null) {
    if (!validateSellerSetupFields()) {
      throw new Error(
        "Please fill kitchen name, tower/flat, door number, phone number, and food specialty."
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
      seller_door_no: formData.doorNo.trim(),
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
      `NeFo_seller_name_${user.id}`,
      formData.kitchenName.trim()
    );

    return true;
  }

  async function handleSellerLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setResetMessage("");
    clearErrors();

    try {
      if (!currentUser) {
        if (!validateLoginFields()) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) {
          setAuthError(error.message);
          setLoading(false);
          return;
        }

        const signedInUser = data?.user;

        if (!signedInUser) {
          setErrors((current) => ({
            ...current,
            general: "Seller login failed.",
          }));
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
        setErrors((current) => ({
          ...current,
          general: "Seller account is not verified.",
        }));
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
      setErrors((current) => ({
        ...current,
        general: error.message || "Something went wrong. Please try again.",
      }));
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    clearErrors();

    const email = formData.email.trim();

    if (!email) {
      setErrors((current) => ({
        ...current,
        email: "Please enter your email first, then tap Forgot Password.",
      }));
      return;
    }

    setResettingPassword(true);
    setResetMessage("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setResetMessage(`Password reset failed: ${error.message}`);
      setResettingPassword(false);
      return;
    }

    setResetMessage("Password reset link sent to your email.");
    setResettingPassword(false);
  }

  async function handleUseAnotherAccount() {
    await supabase.auth.signOut();

    setCurrentUser(null);
    setSellerVerified(false);
    setMessage("");
    setResetMessage("");
    clearErrors();

    setFormData({
      email: "",
      password: "",
      kitchenName: "",
      flat: "",
      doorNo: "",
      phone: "",
      specialty: "",
      about: "",
      acceptScheduledOrders: true,
    });
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 py-8 text-[#181411]">
        <div className={`w-full max-w-md p-8 text-center ${CARD}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-3xl">
            👨‍🍳
          </div>

          <p className="mt-4 font-bold text-[#6B6258]">
            Checking seller account...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-28 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EADFCE] bg-white/90 shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]">
              <img
                src="/NeFo-logo.png"
                alt="NeFo"
                className="h-full w-full scale-[1.65] object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xl font-black text-[#3F5128]">NeFo</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6B6258]">
                Seller Login
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="shrink-0 rounded-full border border-[#D8C9B3] bg-white px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95"
          >
            Home
          </Link>
        </header>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="relative overflow-hidden bg-[#3F5128] p-5 text-white">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#CF743D]/20" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                <span>👨‍🍳</span>
                <span>Seller portal</span>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight">
                Run your
                <span className="block text-[#F3C06E]">kitchen panel.</span>
              </h1>

              <p className="mt-4 text-sm font-semibold leading-relaxed text-white/75">
                Sign in as an approved seller, manage dishes, stock, orders, and
                scheduling.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <HeroTile icon="🛎️" title="Orders" />
                <HeroTile icon="🍲" title="Menu" />
                <HeroTile icon="📊" title="Sales" />
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Seller access
            </p>

            <h2 className="mt-2 text-3xl font-black leading-tight text-[#181411]">
              {currentUser ? "Review details" : "Welcome"}
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              {currentUser
                ? "Confirm or update your kitchen profile before opening the dashboard."
                : "Sign in with your approved seller account to manage your kitchen."}
            </p>

            {errors.general ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-700">
                  {errors.general}
                </p>
              </div>
            ) : null}

            {message ? (
              <div className="mt-5 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4">
                <p className="text-sm font-black text-[#3F5128]">{message}</p>
              </div>
            ) : null}

            {!currentUser && message ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Link
                  to="/seller-registration"
                  className="rounded-2xl border border-[#CF743D] bg-[#FFF0DF] px-4 py-3 text-center font-black text-[#3F5128]"
                >
                  Open Seller Registration
                </Link>

                <Link
                  to="/customer-login"
                  className="rounded-2xl border border-[#D8C9B3] bg-white px-4 py-3 text-center font-black text-[#6B6258]"
                >
                  Customer Login
                </Link>
              </div>
            ) : null}

            <form onSubmit={handleSellerLogin} className="mt-6 space-y-4">
              {!currentUser ? (
                <>
                  <Field label="Seller email" error={errors.email}>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`${INPUT} ${
                        errors.email ? "border-red-300" : ""
                      }`}
                      placeholder="Seller email"
                    />
                  </Field>

                  <Field label="Password" error={errors.password}>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className={`${INPUT} pr-20 ${
                          errors.password ? "border-red-300" : ""
                        }`}
                        placeholder="Password"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#CF743D]"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </Field>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={resettingPassword}
                      className="text-sm font-black text-[#CF743D] disabled:opacity-50"
                    >
                      {resettingPassword
                        ? "Sending reset link..."
                        : "Forgot Password?"}
                    </button>

                    <Link
                      to="/customer-login"
                      className="text-sm font-bold text-[#6B6258]"
                    >
                      Customer login
                    </Link>
                  </div>

                  {resetMessage ? (
                    <div className={`rounded-2xl border p-4 ${
                      resetMessage.toLowerCase().includes("failed")
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-[#D8C9B3] bg-[#FFFDF7] text-[#3F5128]"
                    }`}>
                      <p className="text-sm font-black">{resetMessage}</p>
                    </div>
                  ) : null}
                </>
              ) : null}

              {currentUser && sellerVerified ? (
                <>
                  <section className={`p-4 ${SOFT_CARD}`}>
                    <p className="text-sm font-black text-[#3F5128]">
                      Signed in as seller
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-[#6B6258]">
                      {currentUser.email}
                    </p>

                    <button
                      type="button"
                      onClick={handleUseAnotherAccount}
                      className="mt-3 text-sm font-black text-[#CF743D]"
                    >
                      Use another account
                    </button>
                  </section>

                  <Field label="Kitchen name" error={errors.kitchenName}>
                    <input
                      type="text"
                      name="kitchenName"
                      value={formData.kitchenName}
                      onChange={handleChange}
                      required
                      className={`${INPUT} ${
                        errors.kitchenName ? "border-red-300" : ""
                      }`}
                      placeholder="Kitchen name e.g. Asha's Kitchen"
                    />
                  </Field>

                  <Field label="Tower / Flat" error={errors.flat}>
                    <input
                      type="text"
                      name="flat"
                      value={formData.flat}
                      onChange={handleChange}
                      required
                      className={`${INPUT} ${
                        errors.flat ? "border-red-300" : ""
                      }`}
                      placeholder="Tower / Flat e.g. Block B"
                    />
                  </Field>

                  <Field label="Door No." error={errors.doorNo}>
                    <input
                      type="text"
                      name="doorNo"
                      value={formData.doorNo}
                      onChange={handleChange}
                      required
                      className={`${INPUT} ${
                        errors.doorNo ? "border-red-300" : ""
                      }`}
                      placeholder="Door No. e.g. 1204"
                    />
                  </Field>

                  <Field label="Phone number" error={errors.phone}>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className={`${INPUT} ${
                        errors.phone ? "border-red-300" : ""
                      }`}
                      placeholder="Phone Number"
                    />
                  </Field>

                  <Field label="Food specialty" error={errors.specialty}>
                    <input
                      type="text"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleChange}
                      required
                      className={`${INPUT} ${
                        errors.specialty ? "border-red-300" : ""
                      }`}
                      placeholder="Food specialty e.g. South Indian breakfast"
                    />
                  </Field>

                  <Field label="About kitchen">
                    <textarea
                      name="about"
                      value={formData.about}
                      onChange={handleChange}
                      rows="4"
                      className={`${INPUT} min-h-32 resize-none`}
                      placeholder="Tell customers about your cooking style..."
                    />
                  </Field>

                  <label className={`flex cursor-pointer items-start gap-3 p-4 ${SOFT_CARD}`}>
                    <input
                      type="checkbox"
                      name="acceptScheduledOrders"
                      checked={formData.acceptScheduledOrders}
                      onChange={handleChange}
                      className="mt-1 accent-[#CF743D]"
                    />

                    <div>
                      <p className="font-black text-[#181411]">
                        Accept scheduled orders
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#6B6258]">
                        Customers can choose date and time for later orders.
                      </p>
                    </div>
                  </label>

                  <div className="rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] p-4">
                    <p className="text-sm font-black text-[#3F5128]">
                      Location shown to customers
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#6B6258]">
                      Your tower/flat and door number may be shown on food cards
                      and food details so customers can identify the seller
                      kitchen.
                    </p>
                  </div>
                </>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="block w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.99] disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : currentUser
                  ? "Save and Continue to Dashboard"
                  : "Sign In"}
              </button>
            </form>

            <p className="mt-5 text-xs font-semibold leading-relaxed text-[#9A8E80]">
              Seller dashboard access is available only for accounts approved by
              the app owner.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
        {label}
      </span>

      {error ? (
        <p className="mb-2 text-sm font-black text-red-600">{error}</p>
      ) : null}

      {children}
    </label>
  );
}

function HeroTile({ icon, title }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center">
      <p className="text-2xl">{icon}</p>
      <p className="mt-2 text-xs font-black text-white">{title}</p>
    </div>
  );
}
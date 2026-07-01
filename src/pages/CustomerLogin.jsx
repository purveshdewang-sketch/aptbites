import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

export default function CustomerLogin() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);

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
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    apartmentName: "",
    flatNo: "",
    general: "",
  });

  function clearErrors() {
    setErrors({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      apartmentName: "",
      flatNo: "",
      general: "",
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
      general: "",
    }));

    setMessage("");
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

  function setLoginError(errorMessage) {
    const cleanMessage = String(errorMessage || "").toLowerCase();

    if (
      cleanMessage.includes("invalid login credentials") ||
      cleanMessage.includes("invalid")
    ) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        password: "Invalid email or password.",
      }));
      return;
    }

    if (cleanMessage.includes("email")) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: errorMessage,
      }));
      return;
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      general: errorMessage || "Something went wrong. Please try again.",
    }));
  }

  function validateSignUpFields() {
    const nextErrors = {
      email: "",
      password: "",
      fullName: "",
      phone: "",
      apartmentName: "",
      flatNo: "",
      general: "",
    };

    if (!formData.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (cleanPhone(formData.phone).length < 10) {
      nextErrors.phone = "Please enter a valid phone number.";
    }

    if (!formData.apartmentName.trim()) {
      nextErrors.apartmentName = "Apartment name is required.";
    }

    if (!formData.flatNo.trim()) {
      nextErrors.flatNo = "Flat number is required.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Email address is required.";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  }

  async function handleForgotPassword() {
    clearErrors();

    const email = formData.email.trim();

    if (!email) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: "Enter your email first, then tap Forgot Password.",
      }));
      return;
    }

    setResettingPassword(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: `Password reset failed: ${error.message}`,
      }));
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
    clearErrors();

    try {
      if (isSignUp) {
        if (!validateSignUpFields()) {
          setLoading(false);
          return;
        }

        const cleanedPhone = cleanPhone(formData.phone);
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
          setLoginError(error.message);
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
            setErrors((currentErrors) => ({
              ...currentErrors,
              general: `Profile save failed: ${profileError.message}`,
            }));
            setLoading(false);
            return;
          }
        }

        navigate(
          selectedRole === "seller" ? "/seller-dashboard" : "/marketplace"
        );
      } else {
        if (!formData.email.trim()) {
          setErrors((currentErrors) => ({
            ...currentErrors,
            email: "Email address is required.",
          }));
          setLoading(false);
          return;
        }

        if (!formData.password.trim()) {
          setErrors((currentErrors) => ({
            ...currentErrors,
            password: "Password is required.",
          }));
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) {
          setLoginError(error.message);
          setLoading(false);
          return;
        }

        const user = data?.user;

        if (!user) {
          setErrors((currentErrors) => ({
            ...currentErrors,
            general: "Login failed.",
          }));
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

        navigate(
          isSeller || selectedRole === "seller"
            ? "/seller-dashboard"
            : "/marketplace"
        );
      }
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        general: error.message || "Something went wrong. Please try again.",
      }));
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-28 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EADFCE] bg-white/90 shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]">
              <img
                src="/Nefo-logo.png"
                alt="Nefo"
                className="h-full w-full scale-[1.65] object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xl font-black text-[#3F5128]">Nefo</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-[#6B6258]">
                Homemade nearby food
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
                <span>🌿</span>
                <span>Community kitchens</span>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight">
                Fresh food,
                <span className="block text-[#F3C06E]">closer to home.</span>
              </h1>

              <p className="mt-4 text-sm font-semibold leading-relaxed text-white/75">
                Sign in to order homemade food or manage your Nefo kitchen panel.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <HeroTile icon="🍲" title="Fresh" />
                <HeroTile icon="🏠" title="Local" />
                <HeroTile icon="🔒" title="Private" />
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-2 rounded-3xl border border-[#D8C9B3] bg-[#FFFDF7] p-2">
              <RoleButton
                active={selectedRole === "customer"}
                onClick={() => {
                  setSelectedRole("customer");
                  setMessage("");
                  clearErrors();
                }}
                label="Customer"
              />

              <RoleButton
                active={selectedRole === "seller"}
                onClick={() => {
                  setSelectedRole("seller");
                  setMessage("");
                  clearErrors();
                }}
                label="Seller"
              />
            </div>

            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                {selectedRole === "seller"
                  ? "Kitchen access"
                  : "Customer access"}
              </p>

              <h2 className="mt-2 text-3xl font-black leading-tight text-[#181411]">
                {isSignUp
                  ? `Create ${
                      selectedRole === "seller" ? "seller" : "customer"
                    } account`
                  : "Welcome back"}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                {selectedRole === "seller"
                  ? "Manage dishes, stock, scheduling, and realtime neighbourhood orders."
                  : "Order homemade food from trusted kitchens inside your community."}
              </p>
            </div>

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

            <form onSubmit={handleAuth} className="mt-6 space-y-4">
              {isSignUp ? (
                <>
                  <Field label="Full name" error={errors.fullName}>
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      placeholder="Full name"
                      className={`${INPUT} ${
                        errors.fullName ? "border-red-300" : ""
                      }`}
                    />
                  </Field>

                  <Field label="Phone number" error={errors.phone}>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="Phone number"
                      className={`${INPUT} ${
                        errors.phone ? "border-red-300" : ""
                      }`}
                    />
                  </Field>
                </>
              ) : null}

              <Field label="Email address" error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Email address"
                  className={`${INPUT} ${errors.email ? "border-red-300" : ""}`}
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
                    placeholder="Password"
                    className={`${INPUT} pr-20 ${
                      errors.password ? "border-red-300" : ""
                    }`}
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

              {!isSignUp ? (
                <div className="flex justify-end">
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
                </div>
              ) : null}

              {isSignUp ? (
                <section className={`p-5 ${SOFT_CARD}`}>
                  <p className="mb-4 font-black text-[#3F5128]">
                    Apartment Address
                  </p>

                  <div className="space-y-4">
                    <Field
                      label="Apartment name"
                      error={errors.apartmentName}
                    >
                      <input
                        name="apartmentName"
                        value={formData.apartmentName}
                        onChange={handleChange}
                        required
                        placeholder="Apartment name"
                        className={`${INPUT} bg-white ${
                          errors.apartmentName ? "border-red-300" : ""
                        }`}
                      />
                    </Field>

                    <Field label="Block / Tower">
                      <input
                        name="block"
                        value={formData.block}
                        onChange={handleChange}
                        placeholder="Block / Tower"
                        className={`${INPUT} bg-white`}
                      />
                    </Field>

                    <Field label="Flat No." error={errors.flatNo}>
                      <input
                        name="flatNo"
                        value={formData.flatNo}
                        onChange={handleChange}
                        required
                        placeholder="Flat No."
                        className={`${INPUT} bg-white ${
                          errors.flatNo ? "border-red-300" : ""
                        }`}
                      />
                    </Field>
                  </div>

                  <p className="mt-4 text-xs font-semibold leading-relaxed text-[#6B6258]">
                    Address is used for order coordination. Kitchen/customer
                    door details are not shown publicly.
                  </p>
                </section>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.99] disabled:opacity-50"
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
                clearErrors();
              }}
              className="mt-5 w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-sm font-black text-[#3F5128] active:scale-95"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "New here? Create an account"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function RoleButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border py-3 text-sm font-black transition-all active:scale-95 ${
        active
          ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
          : "border-transparent bg-transparent text-[#6B6258]"
      }`}
    >
      {label}
    </button>
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
import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "../lib/supabaseClient";

const LOGO_SOURCES = [
  "/nefo-logo.png",
  "/NeFo-logo.png",
  "/Nefo-logo.png",
];

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

const NATIVE_RESET_REDIRECT_URL =
  "com.nefo.app://reset-password";

function createEmptyErrors() {
  return {
    email: "",
    password: "",
    fullName: "",
    phone: "",
    apartmentName: "",
    flatNo: "",
    general: "",
  };
}

function getPasswordResetRedirectUrl() {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_RESET_REDIRECT_URL;
  }

  return `${window.location.origin}/reset-password`;
}

function isEmailIdentifier(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "").trim()
  );
}

function normalizePhone(value) {
  let digits = String(value || "").replace(
    /\D/g,
    ""
  );

  if (
    digits.length === 12 &&
    digits.startsWith("91")
  ) {
    digits = digits.slice(2);
  }

  if (
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    digits = digits.slice(1);
  }

  return digits;
}

async function getFunctionErrorMessage(error) {
  try {
    const response = error?.context;

    if (
      response &&
      typeof response.json === "function"
    ) {
      const body = await response.json();

      return (
        body?.error ||
        body?.message ||
        error?.message
      );
    }
  } catch {
    // Use the standard function error below.
  }

  return (
    error?.message ||
    "Mobile login could not be completed."
  );
}

export default function CustomerLogin() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] =
    useState(false);

  const [
    selectedRole,
    setSelectedRole,
  ] = useState("customer");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
      fullName: "",
      phone: "",
      apartmentName: "",
      block: "",
      flatNo: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [
    resettingPassword,
    setResettingPassword,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [errors, setErrors] =
    useState(createEmptyErrors);

  function clearErrors() {
    setErrors(createEmptyErrors());
  }

  function handleChange(event) {
    const { name, value } =
      event.target;

    setFormData(
      (currentData) => ({
        ...currentData,
        [name]: value,
      })
    );

    setErrors(
      (currentErrors) => ({
        ...currentErrors,
        [name]: "",
        general: "",
      })
    );

    setMessage("");
  }

  function cleanPhone(phone) {
    return String(phone || "").replace(
      /\D/g,
      ""
    );
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
    const cleanMessage = String(
      errorMessage || ""
    ).toLowerCase();

    if (
      cleanMessage.includes(
        "invalid login credentials"
      ) ||
      cleanMessage.includes(
        "invalid email"
      ) ||
      cleanMessage.includes(
        "invalid mobile"
      ) ||
      cleanMessage.includes(
        "invalid phone"
      ) ||
      cleanMessage.includes(
        "invalid password"
      )
    ) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          password:
            "Invalid email/mobile number or password.",
        })
      );

      return;
    }

    if (
      cleanMessage.includes("email") ||
      cleanMessage.includes("mobile") ||
      cleanMessage.includes("phone")
    ) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          email:
            errorMessage ||
            "Please check your email or mobile number.",
        })
      );

      return;
    }

    setErrors(
      (currentErrors) => ({
        ...currentErrors,
        general:
          errorMessage ||
          "Something went wrong. Please try again.",
      })
    );
  }

  function validateSignUpFields() {
    const nextErrors =
      createEmptyErrors();

    if (!formData.fullName.trim()) {
      nextErrors.fullName =
        "Full name is required.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone =
        "Phone number is required.";
    } else if (
      cleanPhone(formData.phone)
        .length < 10
    ) {
      nextErrors.phone =
        "Please enter a valid phone number.";
    }

    if (
      !formData.apartmentName.trim()
    ) {
      nextErrors.apartmentName =
        "Apartment name is required.";
    }

    if (!formData.flatNo.trim()) {
      nextErrors.flatNo =
        "Door or flat number is required.";
    }

    if (!formData.email.trim()) {
      nextErrors.email =
        "Email address is required.";
    } else if (
      !isEmailIdentifier(
        formData.email
      )
    ) {
      nextErrors.email =
        "Please enter a valid email address.";
    }

    if (!formData.password.trim()) {
      nextErrors.password =
        "Password is required.";
    }

    setErrors(nextErrors);

    return !Object.values(
      nextErrors
    ).some(Boolean);
  }

  function validateLoginFields() {
    const nextErrors =
      createEmptyErrors();

    const identifier =
      formData.email.trim();

    if (!identifier) {
      nextErrors.email =
        "Email address or mobile number is required.";
    } else if (
      !isEmailIdentifier(
        identifier
      ) &&
      normalizePhone(
        identifier
      ).length !== 10
    ) {
      nextErrors.email =
        "Enter a valid email address or 10-digit mobile number.";
    }

    if (!formData.password.trim()) {
      nextErrors.password =
        "Password is required.";
    }

    setErrors(nextErrors);

    return !Object.values(
      nextErrors
    ).some(Boolean);
  }

  async function handleForgotPassword() {
    clearErrors();

    const identifier =
      formData.email.trim();

    if (!identifier) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          email:
            "Enter your registered email address first.",
        })
      );

      return;
    }

    if (
      !isEmailIdentifier(
        identifier
      )
    ) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          email:
            "Password reset requires your registered email address.",
        })
      );

      return;
    }

    setResettingPassword(true);
    setMessage("");

    const redirectTo =
      getPasswordResetRedirectUrl();

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        identifier.toLowerCase(),
        {
          redirectTo,
        }
      );

    if (error) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          email: `Password reset failed: ${error.message}`,
        })
      );

      setResettingPassword(false);
      return;
    }

    setMessage(
      "Password reset link sent. Open the newest link from your email."
    );

    setResettingPassword(false);
  }

  async function signInWithIdentifier() {
    const identifier =
      formData.email.trim();

    const password =
      formData.password;

    if (
      isEmailIdentifier(
        identifier
      )
    ) {
      return supabase.auth.signInWithPassword(
        {
          email:
            identifier.toLowerCase(),
          password,
        }
      );
    }

    const normalizedPhone =
      normalizePhone(identifier);

    const {
      data: functionData,
      error: functionError,
    } =
      await supabase.functions.invoke(
        "phone-login",
        {
          body: {
            phone:
              normalizedPhone,
            password,
          },
        }
      );

    if (functionError) {
      const errorMessage =
        await getFunctionErrorMessage(
          functionError
        );

      return {
        data: null,
        error: new Error(
          errorMessage
        ),
      };
    }

    const accessToken =
      functionData?.access_token;

    const refreshToken =
      functionData?.refresh_token;

    if (
      !accessToken ||
      !refreshToken
    ) {
      return {
        data: null,
        error: new Error(
          "Mobile login could not create a session."
        ),
      };
    }

    return supabase.auth.setSession({
      access_token:
        accessToken,
      refresh_token:
        refreshToken,
    });
  }

  async function handleSuccessfulLogin(
    loggedInUser
  ) {
    if (
      selectedRole === "customer"
    ) {
      navigate("/", {
        replace: true,
      });

      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "role, is_seller, seller_application_status"
      )
      .eq("id", loggedInUser.id)
      .maybeSingle();

    if (profileError) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          general:
            "Seller access could not be verified.",
        })
      );

      return;
    }

    const profileRole = String(
      profile?.role || ""
    ).toLowerCase();

    const applicationStatus =
      String(
        profile?.seller_application_status ||
          "not_applied"
      ).toLowerCase();

    const isAdmin =
      profileRole === "admin";

    const isApprovedSeller =
      profileRole === "seller" &&
      profile?.is_seller ===
        true &&
      applicationStatus ===
        "approved";

    if (
      isAdmin ||
      isApprovedSeller
    ) {
      navigate(
        "/seller-dashboard",
        {
          replace: true,
        }
      );

      return;
    }

    navigate(
      "/seller-registration",
      {
        replace: true,
      }
    );
  }

  async function handleAuth(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    clearErrors();

    try {
      if (isSignUp) {
        if (
          !validateSignUpFields()
        ) {
          setLoading(false);
          return;
        }

        const cleanedPhone =
          cleanPhone(
            formData.phone
          );

        const flatAddress =
          buildFlatAddress();

        const {
          data,
          error,
        } =
          await supabase.auth.signUp(
            {
              email:
                formData.email
                  .trim()
                  .toLowerCase(),

              password:
                formData.password,

              options: {
                data: {
                  full_name:
                    formData.fullName.trim(),

                  phone:
                    cleanedPhone,

                  apartment_name:
                    formData.apartmentName.trim(),

                  block:
                    formData.block.trim(),

                  flat_no:
                    formData.flatNo.trim(),

                  flat:
                    flatAddress,

                  role:
                    selectedRole,
                },
              },
            }
          );

        if (error) {
          setLoginError(
            error.message
          );

          setLoading(false);
          return;
        }

        const newUser =
          data?.user;

        if (newUser) {
          const {
            error:
              profileError,
          } = await supabase
            .from("profiles")
            .upsert({
              id: newUser.id,

              full_name:
                formData.fullName.trim(),

              phone:
                cleanedPhone,

              email:
                formData.email
                  .trim()
                  .toLowerCase(),

              apartment_name:
                formData.apartmentName.trim(),

              block:
                formData.block.trim(),

              flat_no:
                formData.flatNo.trim(),

              flat:
                flatAddress,

              role:
                selectedRole,

              is_seller:
                selectedRole ===
                "seller",
            });

          if (profileError) {
            setErrors(
              (currentErrors) => ({
                ...currentErrors,
                general: `Profile save failed: ${profileError.message}`,
              })
            );

            setLoading(false);
            return;
          }
        }

        if (
          selectedRole ===
          "seller"
        ) {
          navigate(
            "/seller-registration",
            {
              replace: true,
            }
          );
        } else {
          navigate("/", {
            replace: true,
          });
        }

        setLoading(false);
        return;
      }

      if (
        !validateLoginFields()
      ) {
        setLoading(false);
        return;
      }

      const { data, error } =
        await signInWithIdentifier();

      if (error) {
        setLoginError(
          error.message
        );

        setLoading(false);
        return;
      }

      const loggedInUser =
        data?.user ||
        data?.session?.user;

      if (!loggedInUser) {
        setErrors(
          (currentErrors) => ({
            ...currentErrors,
            general:
              "Login failed. Please try again.",
          })
        );

        setLoading(false);
        return;
      }

      await handleSuccessfulLogin(
        loggedInUser
      );
    } catch (error) {
      setErrors(
        (currentErrors) => ({
          ...currentErrors,
          general:
            error?.message ||
            "Something went wrong. Please try again.",
        })
      );
    }

    setLoading(false);
  }

  function switchRole(nextRole) {
    setSelectedRole(nextRole);
    setMessage("");
    clearErrors();
  }

  function toggleSignUpMode() {
    setIsSignUp(
      (currentValue) =>
        !currentValue
    );

    setMessage("");
    clearErrors();
  }

  const identifierLabel =
    isSignUp
      ? "Email address"
      : "Email address or mobile number";

  const identifierPlaceholder =
    isSignUp
      ? "Email address"
      : "Email or mobile number";

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-3 py-3 pb-28 text-[#181411] sm:px-4 sm:py-5">
      <div className="mx-auto w-full max-w-md">
        <header>
          <Link
            to="/"
            className="flex w-full items-center gap-3 rounded-[26px] border border-[#EADFCE] bg-[#FFFDF7]/95 px-3 py-3 shadow-[6px_6px_18px_rgba(63,81,40,0.07),-6px_-6px_18px_rgba(255,255,255,0.95)] transition-transform active:scale-[0.99] sm:gap-4 sm:px-4"
            aria-label="Go to NeFo home"
          >
            <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-[#D8C9B3] bg-[#FFF8EC] p-1.5">
              <BrandLogo />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[25px] font-black leading-none tracking-tight text-[#3F5128]">
                  NeFo
                </p>

                <span className="h-2 w-2 rounded-full bg-[#CF743D]" />
              </div>

              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#6B6258] sm:text-[11px]">
                Neighbour Food
              </p>

              <p className="mt-1 truncate text-[9px] font-bold text-[#9A8E80] sm:text-[10px]">
                Homemade food from
                kitchens near you
              </p>
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white text-[#3F5128]">
              <ChevronRightIcon />
            </div>
          </Link>
        </header>

        <section
          className={`mt-4 overflow-hidden ${CARD}`}
        >
          <div className="relative overflow-hidden bg-[#3F5128] p-5 text-white sm:p-6">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />

            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#CF743D]/20" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                Community kitchens
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight">
                Fresh food,

                <span className="block text-[#F3C06E]">
                  closer to home.
                </span>
              </h1>

              <p className="mt-4 text-sm font-semibold leading-relaxed text-white/75">
                Sign in to order
                homemade food or manage
                your NeFo kitchen panel.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <HeroTile
                  icon="🍲"
                  title="Fresh"
                />

                <HeroTile
                  icon="🏠"
                  title="Local"
                />
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-2 rounded-3xl border border-[#D8C9B3] bg-[#FFFDF7] p-2">
              <RoleButton
                active={
                  selectedRole ===
                  "customer"
                }
                onClick={() =>
                  switchRole(
                    "customer"
                  )
                }
                label="Customer"
              />

              <RoleButton
                active={
                  selectedRole ===
                  "seller"
                }
                onClick={() =>
                  switchRole(
                    "seller"
                  )
                }
                label="Seller"
              />
            </div>

            <div className="mt-6">
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                {selectedRole ===
                "seller"
                  ? "Kitchen access"
                  : "Customer access"}
              </p>

              <h2 className="mt-2 text-3xl font-black leading-tight text-[#181411]">
                {isSignUp
                  ? `Create ${
                      selectedRole ===
                      "seller"
                        ? "seller"
                        : "customer"
                    } account`
                  : "Welcome"}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                {selectedRole ===
                "seller"
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
                <p className="text-sm font-black text-[#3F5128]">
                  {message}
                </p>
              </div>
            ) : null}

            <form
              onSubmit={handleAuth}
              className="mt-6 space-y-4"
            >
              {isSignUp ? (
                <>
                  <Field
                    label="Full name"
                    error={
                      errors.fullName
                    }
                  >
                    <input
                      name="fullName"
                      value={
                        formData.fullName
                      }
                      onChange={
                        handleChange
                      }
                      required
                      autoComplete="name"
                      placeholder="Full name"
                      className={`${INPUT} ${
                        errors.fullName
                          ? "border-red-300"
                          : ""
                      }`}
                    />
                  </Field>

                  <Field
                    label="Phone number"
                    error={
                      errors.phone
                    }
                  >
                    <input
                      name="phone"
                      value={
                        formData.phone
                      }
                      onChange={
                        handleChange
                      }
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Phone number"
                      className={`${INPUT} ${
                        errors.phone
                          ? "border-red-300"
                          : ""
                      }`}
                    />
                  </Field>
                </>
              ) : null}

              <Field
                label={
                  identifierLabel
                }
                error={errors.email}
              >
                <input
                  type={
                    isSignUp
                      ? "email"
                      : "text"
                  }
                  name="email"
                  value={
                    formData.email
                  }
                  onChange={
                    handleChange
                  }
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  autoComplete={
                    isSignUp
                      ? "email"
                      : "username"
                  }
                  placeholder={
                    identifierPlaceholder
                  }
                  className={`${INPUT} ${
                    errors.email
                      ? "border-red-300"
                      : ""
                  }`}
                />
              </Field>

              <Field
                label="Password"
                error={
                  errors.password
                }
              >
                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    value={
                      formData.password
                    }
                    onChange={
                      handleChange
                    }
                    required
                    autoComplete={
                      isSignUp
                        ? "new-password"
                        : "current-password"
                    }
                    placeholder="Password"
                    className={`${INPUT} pr-20 ${
                      errors.password
                        ? "border-red-300"
                        : ""
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#CF743D]"
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>
              </Field>

              {!isSignUp ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={
                      handleForgotPassword
                    }
                    disabled={
                      resettingPassword
                    }
                    className="text-sm font-black text-[#CF743D] disabled:opacity-50"
                  >
                    {resettingPassword
                      ? "Sending reset link..."
                      : "Forgot Password?"}
                  </button>
                </div>
              ) : null}

              {isSignUp ? (
                <section
                  className={`p-5 ${SOFT_CARD}`}
                >
                  <p className="mb-4 font-black text-[#3F5128]">
                    Apartment Address
                  </p>

                  <div className="space-y-4">
                    <Field
                      label="Apartment name"
                      error={
                        errors.apartmentName
                      }
                    >
                      <input
                        name="apartmentName"
                        value={
                          formData.apartmentName
                        }
                        onChange={
                          handleChange
                        }
                        required
                        autoComplete="organization"
                        placeholder="Apartment name"
                        className={`${INPUT} bg-white ${
                          errors.apartmentName
                            ? "border-red-300"
                            : ""
                        }`}
                      />
                    </Field>

                    <div className="rounded-[20px] border border-[#EADFCE] bg-white/70 p-3">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#3F5128]">
                        Block and door
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Block / Tower">
                          <input
                            name="block"
                            value={
                              formData.block
                            }
                            onChange={
                              handleChange
                            }
                            placeholder="Block"
                            className={`${INPUT} bg-white px-3`}
                          />
                        </Field>

                        <Field
                          label="Door / Flat No."
                          error={
                            errors.flatNo
                          }
                        >
                          <input
                            name="flatNo"
                            value={
                              formData.flatNo
                            }
                            onChange={
                              handleChange
                            }
                            required
                            placeholder="Door No."
                            className={`${INPUT} bg-white px-3 ${
                              errors.flatNo
                                ? "border-red-300"
                                : ""
                            }`}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-xs font-semibold leading-relaxed text-[#6B6258]">
                    Address is used for
                    order coordination.
                    Kitchen/customer door
                    details are not shown
                    publicly.
                  </p>
                </section>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
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
              onClick={
                toggleSignUpMode
              }
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

function BrandLogo() {
  const [
    sourceIndex,
    setSourceIndex,
  ] = useState(0);

  const [
    useFallback,
    setUseFallback,
  ] = useState(false);

  function handleImageError() {
    if (
      sourceIndex <
      LOGO_SOURCES.length - 1
    ) {
      setSourceIndex(
        (currentIndex) =>
          currentIndex + 1
      );

      return;
    }

    setUseFallback(true);
  }

  if (useFallback) {
    return <NeFoLogoMark />;
  }

  return (
    <img
      key={
        LOGO_SOURCES[
          sourceIndex
        ]
      }
      src={
        LOGO_SOURCES[
          sourceIndex
        ]
      }
      alt=""
      aria-hidden="true"
      onError={
        handleImageError
      }
      className="h-full w-full object-contain"
    />
  );
}

function NeFoLogoMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      aria-hidden="true"
    >
      <path
        d="M48 8C31 20 19 34 18 53v22c0 10 6 17 15 19V56c0-9 5-17 13-22l22 24c7 7 10 15 9 27 9-5 14-14 14-26C91 34 75 17 61 7c1 18 8 26 17 38 8 11 9 25 5 36 1-15-5-25-14-34L49 25c2-6 2-11-1-17Z"
        fill="#3F5128"
      />

      <path
        d="M58 26c12 11 21 23 24 38 2 9 0 17-4 23-1-13-6-23-15-31L46 38c5-4 9-8 12-12Z"
        fill="#DB824B"
      />

      <ellipse
        cx="62"
        cy="40"
        rx="2.2"
        ry="4.5"
        fill="#FFF8EC"
      />

      <ellipse
        cx="70"
        cy="49"
        rx="2.2"
        ry="4.5"
        transform="rotate(30 70 49)"
        fill="#FFF8EC"
      />

      <ellipse
        cx="61"
        cy="55"
        rx="2.2"
        ry="4.5"
        fill="#FFF8EC"
      />

      <ellipse
        cx="72"
        cy="62"
        rx="4.5"
        ry="2.2"
        transform="rotate(-15 72 62)"
        fill="#FFF8EC"
      />

      <rect
        x="38"
        y="67"
        width="8"
        height="8"
        rx="1.8"
        fill="#D89A32"
      />

      <rect
        x="49"
        y="67"
        width="8"
        height="8"
        rx="1.8"
        fill="#D89A32"
      />

      <rect
        x="38"
        y="78"
        width="8"
        height="8"
        rx="1.8"
        fill="#D89A32"
      />

      <rect
        x="49"
        y="78"
        width="8"
        height="8"
        rx="1.8"
        fill="#D89A32"
      />
    </svg>
  );
}

function RoleButton({
  active,
  onClick,
  label,
}) {
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

function HeroTile({
  icon,
  title,
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center">
      <p className="text-3xl">
        {icon}
      </p>

      <p className="mt-2 text-sm font-black text-white">
        {title}
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
        {label}
      </span>

      {error ? (
        <p className="mb-2 text-sm font-black text-red-600">
          {error}
        </p>
      ) : null}

      {children}
    </label>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
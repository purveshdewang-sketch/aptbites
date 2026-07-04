import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { Capacitor } from "@capacitor/core";
import { supabase } from "../lib/supabaseClient";

const RECOVERY_STORAGE_KEY =
  "Nefo_password_recovery_url";

const NATIVE_RESET_REDIRECT_URL =
  "com.nefo.app://reset-password";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

function getPasswordResetRedirectUrl() {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_RESET_REDIRECT_URL;
  }

  return `${window.location.origin}/reset-password`;
}

function getStoredRecoveryUrl() {
  try {
    return (
      sessionStorage.getItem(
        RECOVERY_STORAGE_KEY
      ) || ""
    );
  } catch {
    return "";
  }
}

function removeStoredRecoveryUrl() {
  try {
    sessionStorage.removeItem(
      RECOVERY_STORAGE_KEY
    );
  } catch {
    // Storage may be unavailable.
  }
}

function parseRecoveryUrl(rawUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    parsedUrl = new URL(
      rawUrl,
      window.location.origin
    );
  }

  const queryParams =
    parsedUrl.searchParams;

  const cleanHash =
    parsedUrl.hash.startsWith("#")
      ? parsedUrl.hash.slice(1)
      : parsedUrl.hash;

  const hashParams =
    new URLSearchParams(
      cleanHash
    );

  return {
    queryParams,
    hashParams,
  };
}

function decodeUrlMessage(value) {
  if (!value) return "";

  try {
    return decodeURIComponent(
      value
    ).replaceAll("+", " ");
  } catch {
    return String(value).replaceAll(
      "+",
      " "
    );
  }
}

export default function ResetPassword() {
  const navigate = useNavigate();

  const [mode, setMode] =
    useState("request");

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errors, setErrors] =
    useState({
      email: "",
      password: "",
      confirmPassword: "",
      general: "",
    });

  useEffect(() => {
    function handleNativeRecoveryLink(
      event
    ) {
      const recoveryUrl =
        event?.detail?.url || "";

      checkResetSession(
        recoveryUrl
      );
    }

    window.addEventListener(
      "Nefo_password_recovery_link",
      handleNativeRecoveryLink
    );

    checkResetSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (
            event ===
              "PASSWORD_RECOVERY" ||
            session?.user
          ) {
            setMode("update");

            setCheckingSession(
              false
            );
          }
        }
      );

    return () => {
      window.removeEventListener(
        "Nefo_password_recovery_link",
        handleNativeRecoveryLink
      );

      subscription.unsubscribe();
    };
  }, []);

  function clearErrors() {
    setErrors({
      email: "",
      password: "",
      confirmPassword: "",
      general: "",
    });
  }

  function cleanRecoveryUrl() {
    const cleanUrl =
      `${window.location.origin}${window.location.pathname}`;

    window.history.replaceState(
      {},
      document.title,
      cleanUrl
    );
  }

  async function checkResetSession(
    explicitRecoveryUrl = ""
  ) {
    setCheckingSession(true);
    setMessage("");
    clearErrors();

    try {
      const recoveryUrl =
        explicitRecoveryUrl ||
        getStoredRecoveryUrl() ||
        window.location.href;

      const {
        queryParams,
        hashParams,
      } = parseRecoveryUrl(
        recoveryUrl
      );

      const urlError =
        queryParams.get(
          "error_description"
        ) ||
        queryParams.get(
          "error"
        ) ||
        hashParams.get(
          "error_description"
        ) ||
        hashParams.get(
          "error"
        );

      if (urlError) {
        removeStoredRecoveryUrl();

        setMode("request");

        setErrors(
          (current) => ({
            ...current,
            general:
              decodeUrlMessage(
                urlError
              ),
          })
        );

        setCheckingSession(false);
        return;
      }

      const code =
        queryParams.get("code");

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(
            code
          );

        if (error) {
          removeStoredRecoveryUrl();

          setMode("request");

          setErrors(
            (current) => ({
              ...current,
              general:
                `Reset link could not be verified: ${error.message}`,
            })
          );

          setCheckingSession(false);
          return;
        }

        removeStoredRecoveryUrl();
        cleanRecoveryUrl();
        setMode("update");
        setCheckingSession(false);
        return;
      }

      const accessToken =
        hashParams.get(
          "access_token"
        );

      const refreshToken =
        hashParams.get(
          "refresh_token"
        );

      const type =
        hashParams.get("type");

      if (
        accessToken &&
        refreshToken
      ) {
        const { error } =
          await supabase.auth.setSession(
            {
              access_token:
                accessToken,

              refresh_token:
                refreshToken,
            }
          );

        if (error) {
          removeStoredRecoveryUrl();

          setMode("request");

          setErrors(
            (current) => ({
              ...current,
              general:
                `Reset session could not be opened: ${error.message}`,
            })
          );

          setCheckingSession(false);
          return;
        }

        removeStoredRecoveryUrl();
        cleanRecoveryUrl();

        if (
          type === "recovery" ||
          type === null
        ) {
          setMode("update");
        }

        setCheckingSession(false);
        return;
      }

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (session?.user) {
        setMode("update");
      } else {
        setMode("request");
      }
    } catch (error) {
      removeStoredRecoveryUrl();

      setMode("request");

      setErrors(
        (current) => ({
          ...current,

          general:
            error?.message ||
            "Could not check the reset link. Please request a new one.",
        })
      );
    }

    setCheckingSession(false);
  }

  async function handleSendResetLink(
    event
  ) {
    event.preventDefault();

    setMessage("");
    clearErrors();

    if (!email.trim()) {
      setErrors(
        (current) => ({
          ...current,
          email:
            "Please enter your registered email address.",
        })
      );

      return;
    }

    setSaving(true);

    const redirectTo =
      getPasswordResetRedirectUrl();

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo,
        }
      );

    if (error) {
      setErrors(
        (current) => ({
          ...current,
          email:
            `Could not send reset link: ${error.message}`,
        })
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Password reset link sent. Open the newest reset email on this device."
    );

    setSaving(false);
  }

  async function handleUpdatePassword(
    event
  ) {
    event.preventDefault();

    setMessage("");
    clearErrors();

    const nextErrors = {
      email: "",
      password: "",
      confirmPassword: "",
      general: "",
    };

    if (!password) {
      nextErrors.password =
        "Please enter your new password.";
    } else if (
      password.length < 6
    ) {
      nextErrors.password =
        "Password must be at least 6 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword =
        "Please confirm your new password.";
    } else if (
      password !==
      confirmPassword
    ) {
      nextErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(nextErrors);

    if (
      Object.values(
        nextErrors
      ).some(Boolean)
    ) {
      return;
    }

    setSaving(true);

    const { error } =
      await supabase.auth.updateUser(
        {
          password,
        }
      );

    if (error) {
      setErrors(
        (current) => ({
          ...current,
          general:
            `Password reset failed: ${error.message}`,
        })
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Password updated successfully. Redirecting to sign in..."
    );

    window.setTimeout(
      async () => {
        await supabase.auth.signOut();

        navigate(
          "/customer-login",
          {
            replace: true,
          }
        );
      },
      1200
    );
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 py-8 text-[#181411]">
        <div
          className={`w-full max-w-md p-8 text-center ${CARD}`}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-3xl">
            🔐
          </div>

          <p className="mt-4 font-bold text-[#6B6258]">
            Checking reset link...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-28 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EADFCE] bg-white/90 shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]">
              <img
                src="/Nefo-logo.png"
                alt="Nefo"
                className="h-full w-full scale-[1.65] object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black text-[#3F5128]">
                Nefo
              </p>

              <p className="text-[10px] font-black uppercase tracking-wide text-[#6B6258]">
                Password Reset
              </p>
            </div>
          </Link>

          <Link
            to="/customer-login"
            className="shrink-0 rounded-full border border-[#D8C9B3] bg-white px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95"
          >
            Sign In
          </Link>
        </header>

        <section
          className={`mt-5 overflow-hidden ${CARD}`}
        >
          <div className="relative overflow-hidden bg-[#3F5128] p-5 text-white">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />

            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#CF743D]/20" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                <span>🔐</span>
                <span>Password help</span>
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight">
                Reset your

                <span className="block text-[#F3C06E]">
                  password safely.
                </span>
              </h1>

              <p className="mt-4 text-sm font-semibold leading-relaxed text-white/75">
                Request a secure reset
                link by email, then
                create a fresh password
                for your Nefo account.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <HeroTile
                  icon="📩"
                  title="Email"
                />

                <HeroTile
                  icon="🔒"
                  title="Secure"
                />

                <HeroTile
                  icon="✅"
                  title="Done"
                />
              </div>
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Account security
            </p>

            <h2 className="mt-2 text-3xl font-black leading-tight text-[#181411]">
              {mode === "request"
                ? "Forgot password?"
                : "Create new password"}
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              {mode === "request"
                ? "Enter your registered email address. We will send a secure password reset link."
                : "Enter your new password below. Use at least 6 characters."}
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
                <p className="text-sm font-black text-[#3F5128]">
                  {message}
                </p>
              </div>
            ) : null}

            {mode === "request" ? (
              <form
                onSubmit={
                  handleSendResetLink
                }
                className="mt-6 space-y-4"
              >
                <Field
                  label="Registered email address"
                  error={errors.email}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(
                      event
                    ) => {
                      setEmail(
                        event.target.value
                      );

                      setErrors(
                        (current) => ({
                          ...current,
                          email: "",
                        })
                      );

                      setMessage("");
                    }}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Registered email address"
                    className={`${INPUT} ${
                      errors.email
                        ? "border-red-300"
                        : ""
                    }`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {saving
                    ? "Sending..."
                    : "Send Reset Link"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={
                  handleUpdatePassword
                }
                className="mt-6 space-y-4"
              >
                <Field
                  label="New password"
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
                      value={password}
                      onChange={(
                        event
                      ) => {
                        setPassword(
                          event.target.value
                        );

                        setErrors(
                          (current) => ({
                            ...current,
                            password: "",
                            confirmPassword:
                              "",
                          })
                        );

                        setMessage("");
                      }}
                      required
                      autoComplete="new-password"
                      placeholder="New password"
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

                <Field
                  label="Confirm new password"
                  error={
                    errors.confirmPassword
                  }
                >
                  <div className="relative">
                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        confirmPassword
                      }
                      onChange={(
                        event
                      ) => {
                        setConfirmPassword(
                          event.target.value
                        );

                        setErrors(
                          (current) => ({
                            ...current,
                            confirmPassword:
                              "",
                          })
                        );

                        setMessage("");
                      }}
                      required
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      className={`${INPUT} pr-20 ${
                        errors.confirmPassword
                          ? "border-red-300"
                          : ""
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) =>
                            !current
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#CF743D]"
                    >
                      {showConfirmPassword
                        ? "Hide"
                        : "Show"}
                    </button>
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {saving
                    ? "Updating..."
                    : "Update Password"}
                </button>
              </form>
            )}

            <section
              className={`mt-5 p-4 ${SOFT_CARD}`}
            >
              <p className="text-sm font-black text-[#3F5128]">
                {mode === "request"
                  ? "Check your email"
                  : "After update"}
              </p>

              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#6B6258]">
                {mode === "request"
                  ? "Open the newest reset email on the Android phone where Nefo is installed."
                  : "You will be signed out automatically. Sign in again with your new password."}
              </p>
            </section>

            <div className="mt-5 grid grid-cols-1 gap-3">
              {mode === "update" ? (
                <button
                  type="button"
                  onClick={() => {
                    removeStoredRecoveryUrl();
                    setMode("request");
                    setPassword("");
                    setConfirmPassword("");
                    setMessage("");
                    clearErrors();
                  }}
                  className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 font-black text-[#3F5128] active:scale-95"
                >
                  Send New Link
                </button>
              ) : null}

              <Link
                to="/customer-login"
                className="block rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
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

function HeroTile({
  icon,
  title,
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center">
      <p className="text-2xl">
        {icon}
      </p>

      <p className="mt-2 text-xs font-black text-white">
        {title}
      </p>
    </div>
  );
}
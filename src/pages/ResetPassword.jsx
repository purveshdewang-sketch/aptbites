import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#BDEFE6] bg-[#FFFFF2] shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] px-4 py-4 text-base font-semibold text-[#111827] outline-none placeholder:text-[#8AA5A0] focus:border-[#41D3BD] focus:bg-white";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    general: "",
  });

  useEffect(() => {
    checkResetSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session?.user) {
        setMode("update");
      }
    });

    return () => {
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

  async function checkResetSession() {
    setCheckingSession(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setMode("update");
    } else {
      setMode("request");
    }

    setCheckingSession(false);
  }

  async function handleSendResetLink(event) {
    event.preventDefault();

    setMessage("");
    clearErrors();

    if (!email.trim()) {
      setErrors((current) => ({
        ...current,
        email: "Please enter your registered email address.",
      }));
      return;
    }

    setSaving(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setErrors((current) => ({
        ...current,
        email: `Could not send reset link: ${error.message}`,
      }));
      setSaving(false);
      return;
    }

    setMessage(
      "Password reset link sent. Please check your email and open the reset link."
    );
    setSaving(false);
  }

  async function handleUpdatePassword(event) {
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
      nextErrors.password = "Please enter your new password.";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrors((current) => ({
        ...current,
        general: `Password reset failed: ${error.message}`,
      }));
      setSaving(false);
      return;
    }

    setMessage("Password updated successfully. Redirecting to sign in...");

    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate("/customer-login");
    }, 1200);
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFFF2] px-4 py-8 text-[#111827]">
        <div className={`w-full max-w-md p-8 text-center ${CARD}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 text-3xl">
            🔐
          </div>

          <p className="mt-4 font-bold text-[#51615D]">
            Checking reset link...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] px-4 py-4 pb-28 text-[#111827]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D7F5EF] bg-white/90 shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]">
              <img
                src="/Nefo-logo.png"
                alt="Nefo"
                className="h-full w-full scale-[1.65] object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black text-[#073B35]">
                Nefo
              </p>
              <p className="text-[10px] font-black uppercase tracking-wide text-[#51615D]">
                Password Reset
              </p>
            </div>
          </Link>

          <Link
            to="/customer-login"
            className="shrink-0 rounded-full border border-[#BDEFE6] bg-white px-4 py-2 text-xs font-black text-[#073B35] active:scale-95"
          >
            Sign In
          </Link>
        </header>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="bg-[#073B35] p-5 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#41D3BD]">
              <span>🔐</span>
              <span>Password help</span>
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight">
              Reset your
              <span className="block text-[#41D3BD]">password safely.</span>
            </h1>

            <p className="mt-4 text-sm font-semibold leading-relaxed text-[#D7F5EF]">
              Request a secure reset link by email, then create a fresh
              password for your Nefo account.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <HeroTile icon="📩" title="Email" />
              <HeroTile icon="🔒" title="Secure" />
              <HeroTile icon="✅" title="Done" />
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
              Account security
            </p>

            <h2 className="mt-2 text-3xl font-black leading-tight text-[#111827]">
              {mode === "request"
                ? "Forgot password?"
                : "Create new password"}
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
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
              <div className="mt-5 rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4">
                <p className="text-sm font-black text-[#073B35]">{message}</p>
              </div>
            ) : null}

            {mode === "request" ? (
              <form onSubmit={handleSendResetLink} className="mt-6 space-y-4">
                <Field label="Registered email address" error={errors.email}>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrors((current) => ({ ...current, email: "" }));
                      setMessage("");
                    }}
                    required
                    placeholder="Registered email address"
                    className={`${INPUT} ${errors.email ? "border-red-300" : ""}`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl border border-[#073B35] bg-[#073B35] py-4 font-black text-white shadow-lg shadow-[#073B35]/15 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {saving ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
                <Field label="New password" error={errors.password}>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          password: "",
                          confirmPassword: "",
                        }));
                        setMessage("");
                      }}
                      required
                      placeholder="New password"
                      className={`${INPUT} pr-20 ${
                        errors.password ? "border-red-300" : ""
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#0B8F80]"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>

                <Field
                  label="Confirm new password"
                  error={errors.confirmPassword}
                >
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          confirmPassword: "",
                        }));
                        setMessage("");
                      }}
                      required
                      placeholder="Confirm new password"
                      className={`${INPUT} pr-20 ${
                        errors.confirmPassword ? "border-red-300" : ""
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#0B8F80]"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl border border-[#073B35] bg-[#073B35] py-4 font-black text-white shadow-lg shadow-[#073B35]/15 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}

            <section className={`mt-5 p-4 ${SOFT_CARD}`}>
              <p className="text-sm font-black text-[#073B35]">
                {mode === "request" ? "Check your email" : "After update"}
              </p>

              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#51615D]">
                {mode === "request"
                  ? "Open the reset link from the same device if possible. If you do not see it, check spam or promotions."
                  : "You will be signed out automatically. Sign in again with your new password."}
              </p>
            </section>

            <div className="mt-5 grid grid-cols-1 gap-3">
              {mode === "update" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("request");
                    setPassword("");
                    setConfirmPassword("");
                    setMessage("");
                    clearErrors();
                  }}
                  className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 font-black text-[#073B35] active:scale-95"
                >
                  Send New Link
                </button>
              ) : null}

              <Link
                to="/customer-login"
                className="block rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-center text-sm font-black text-[#073B35] active:scale-95"
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

function Field({ label, error, children }) {
  return (
    <label className="block">
      {error ? (
        <p className="mb-2 text-sm font-black text-red-600">{error}</p>
      ) : null}

      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#51615D]">
        {label}
      </span>

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
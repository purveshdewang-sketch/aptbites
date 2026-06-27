import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] px-4 py-4 text-base font-semibold text-[#111827] outline-none placeholder:text-[#8AA5A0] focus:border-[#41D3BD] focus:bg-white";

export default function SellerGate({ children }) {
  const { user } = useAuth();

  const unlockKey = user
    ? `Nefo_seller_unlocked_${user.id}`
    : "Nefo_seller_unlocked";

  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem(unlockKey) === "yes"
  );

  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });

  useEffect(() => {
    if (user?.email) setEmail(user.email);

    const currentUnlockKey = user
      ? `Nefo_seller_unlocked_${user.id}`
      : "Nefo_seller_unlocked";

    setUnlocked(sessionStorage.getItem(currentUnlockKey) === "yes");
  }, [user]);

  function clearErrors() {
    setErrors({
      email: "",
      password: "",
      general: "",
    });
  }

  async function handleSellerUnlock(event) {
    event.preventDefault();

    setChecking(true);
    setMessage("");
    clearErrors();

    const cleanEmail = email.trim();

    const nextErrors = {
      email: "",
      password: "",
      general: "",
    };

    if (!cleanEmail) {
      nextErrors.email = "Please enter your seller email.";
    }

    if (!password) {
      nextErrors.password = "Please enter your seller password.";
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setChecking(false);
      return;
    }

    try {
      const {
        data: loginData,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        setErrors((current) => ({
          ...current,
          general: "Seller verification failed. Check email and password.",
        }));
        setChecking(false);
        return;
      }

      const verifiedUser = loginData?.user;

      if (!verifiedUser?.id) {
        setErrors((current) => ({
          ...current,
          general: "Could not verify seller session. Please sign in again.",
        }));
        setChecking(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_seller, seller_application_status")
        .eq("id", verifiedUser.id)
        .maybeSingle();

      if (profileError) {
        setErrors((current) => ({
          ...current,
          general: "Could not verify seller profile.",
        }));
        setChecking(false);
        return;
      }

      const profileRole = String(profile?.role || "").toLowerCase();
      const applicationStatus = String(
        profile?.seller_application_status || "not_applied"
      ).toLowerCase();

      const sellerAllowed =
        profileRole === "admin" ||
        (profileRole === "seller" &&
          profile?.is_seller === true &&
          applicationStatus === "approved");

      if (!sellerAllowed) {
        setErrors((current) => ({
          ...current,
          general: "This account is not approved as a seller.",
        }));
        setChecking(false);
        return;
      }

      sessionStorage.setItem(`Nefo_seller_unlocked_${verifiedUser.id}`, "yes");
      setUnlocked(true);
      setMessage("Seller dashboard unlocked.");
    } catch (error) {
      setErrors((current) => ({
        ...current,
        general: error.message || "Something went wrong. Please try again.",
      }));
    }

    setChecking(false);
  }

  if (unlocked) {
    return children;
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
                Seller Security
              </p>
            </div>
          </Link>

          <Link
            to="/marketplace"
            className="shrink-0 rounded-full border border-[#BDEFE6] bg-white px-4 py-2 text-xs font-black text-[#073B35] active:scale-95"
          >
            Home
          </Link>
        </header>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="bg-[#073B35] p-5 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#41D3BD]">
              <span>🔒</span>
              <span>Seller verification</span>
            </div>

            <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight">
              Unlock Seller
              <span className="block text-[#41D3BD]">Dashboard.</span>
            </h1>

            <p className="mt-4 text-sm font-semibold leading-relaxed text-[#D7F5EF]">
              Re-enter your approved seller email and password to access kitchen
              controls.
            </p>
          </div>

          <div className="p-5">
            {errors.general ? (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-600">
                  {errors.general}
                </p>
              </div>
            ) : null}

            {message ? (
              <div className="mb-5 rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/12 p-4">
                <p className="text-sm font-black text-[#073B35]">{message}</p>
              </div>
            ) : null}

            <form onSubmit={handleSellerUnlock} className="space-y-4">
              <Field label="Seller email" error={errors.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors((current) => ({ ...current, email: "" }));
                    setMessage("");
                  }}
                  required
                  placeholder="Seller email"
                  className={`${INPUT} ${errors.email ? "border-red-300" : ""}`}
                />
              </Field>

              <Field label="Seller password" error={errors.password}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({ ...current, password: "" }));
                    setMessage("");
                  }}
                  required
                  placeholder="Seller password"
                  className={`${INPUT} ${
                    errors.password ? "border-red-300" : ""
                  }`}
                />
              </Field>

              <button
                type="submit"
                disabled={checking}
                className="w-full rounded-2xl border border-[#073B35] bg-[#073B35] py-4 font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.99] disabled:opacity-50"
              >
                {checking ? "Verifying..." : "Unlock Seller Dashboard"}
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4">
              <p className="text-sm font-black text-[#073B35]">
                Approved sellers only
              </p>

              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#51615D]">
                Access is allowed only if the account is approved as a seller or
                admin in the profile table.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <Link
                to="/seller-registration"
                className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-center text-sm font-black text-[#073B35] active:scale-95"
              >
                Seller Registration
              </Link>

              <Link
                to="/customer-login"
                className="rounded-2xl border border-[#BDEFE6] bg-white py-4 text-center text-sm font-black text-[#51615D] active:scale-95"
              >
                Sign in with another account
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
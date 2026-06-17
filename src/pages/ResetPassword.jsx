import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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

    if (!email.trim()) {
      setMessage("Please enter your registered email address.");
      return;
    }

    setSaving(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setMessage(`Could not send reset link: ${error.message}`);
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

    if (!password || !confirmPassword) {
      setMessage("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(`Password reset failed: ${error.message}`);
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
      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-8 flex items-center justify-center">
        <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-xl shadow-[#073B35]/5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-3xl">
            🔐
          </div>

          <p className="text-[#51615D] font-bold mt-4">
            Checking reset link...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-3 sm:px-6 py-5 sm:py-10 overflow-hidden">
      <div className="fixed top-0 right-0 w-80 h-80 bg-[#41D3BD]/20 blur-[110px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto min-h-[calc(100vh-2.5rem)] grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-center">
        <section className="hidden lg:block">
          <div className="relative overflow-hidden bg-[#073B35] rounded-[2.5rem] p-10 min-h-[620px] shadow-2xl shadow-[#073B35]/25">
            <div className="absolute -top-28 -right-28 w-96 h-96 bg-[#41D3BD]/25 rounded-full blur-[110px]" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 rounded-full blur-[100px]" />

            <div className="relative h-full flex flex-col justify-between min-h-[540px]">
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
                      Secure account
                    </p>
                  </div>
                </Link>

                <div className="mt-12">
                  <div className="inline-flex items-center gap-2 bg-[#41D3BD]/15 border border-[#41D3BD]/25 text-[#41D3BD] px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide">
                    <span>🔐</span>
                    <span>Password help</span>
                  </div>

                  <h1 className="text-white text-6xl font-black mt-6 leading-[0.98] tracking-tight">
                    Reset your
                    <span className="block text-[#41D3BD]">password safely.</span>
                  </h1>

                  <p className="text-[#D7F5EF] text-lg mt-6 leading-relaxed max-w-xl">
                    Request a secure reset link by email, then create a fresh
                    password for your Nefo account.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">📩</p>
                  <p className="text-white font-black mt-3">Email</p>
                  <p className="text-white/60 text-xs mt-1">Reset link</p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">🔒</p>
                  <p className="text-white font-black mt-3">Secure</p>
                  <p className="text-white/60 text-xs mt-1">New password</p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">✅</p>
                  <p className="text-white font-black mt-3">Done</p>
                  <p className="text-white/60 text-xs mt-1">Login again</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl mx-auto lg:max-w-none">
          <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl shadow-[#073B35]/10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <Link to="/" className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-[#FFFFF2] border border-[#D7F5EF] flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                  <img
                    src="/Nefo-logo.png"
                    alt="Nefo"
                    className="w-full h-full object-cover scale-[1.65]"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[#073B35] font-black text-xl truncate">
                    Nefo
                  </p>
                  <p className="text-[#51615D] text-[10px] uppercase tracking-wide">
                    Password Reset
                  </p>
                </div>
              </Link>

              <Link
                to="/customer-login"
                className="text-[#51615D] hover:text-[#073B35] text-sm font-black shrink-0"
              >
                Sign In
              </Link>
            </div>

            <div>
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                Account security
              </p>

              <h1 className="text-3xl sm:text-4xl font-black mt-2 text-[#111827] leading-tight">
                {mode === "request"
                  ? "Forgot password?"
                  : "Create new password"}
              </h1>

              <p className="text-[#51615D] mt-3 leading-relaxed text-sm sm:text-base">
                {mode === "request"
                  ? "Enter your registered email address. We will send a secure password reset link."
                  : "Enter your new password below. Use at least 6 characters."}
              </p>
            </div>

            {message && (
              <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35]">
                {message}
              </div>
            )}

            {mode === "request" ? (
              <form onSubmit={handleSendResetLink} className="mt-7 space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="Registered email address"
                  className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.99] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
                >
                  {saving ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleUpdatePassword} className="mt-7 space-y-4">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="New password"
                  className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  placeholder="Confirm new password"
                  className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] text-[#111827]"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.99] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}

            <div className="mt-6 bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
              <p className="text-[#073B35] font-black text-sm">
                {mode === "request" ? "Check your email" : "After update"}
              </p>

              <p className="text-[#51615D] text-xs mt-1 leading-relaxed">
                {mode === "request"
                  ? "Open the reset link from the same device if possible. If you do not see it, check spam or promotions."
                  : "You will be signed out automatically. Sign in again with your new password."}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {mode === "update" && (
                <button
                  type="button"
                  onClick={() => setMode("request")}
                  className="flex-1 border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#073B35] font-black py-3 rounded-2xl transition-all"
                >
                  Send New Link
                </button>
              )}

              <Link
                to="/customer-login"
                className="flex-1 block text-center bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] text-sm font-black py-3 rounded-2xl transition-all"
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
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleResetPassword(event) {
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

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 sm:py-10 overflow-hidden">
      <div className="fixed top-0 right-0 w-80 h-80 bg-[#41D3BD]/20 blur-[110px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-[#41D3BD]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto min-h-[calc(100vh-5rem)] grid lg:grid-cols-[0.95fr_1.05fr] gap-6 lg:gap-8 items-center">
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
                      secure account
                    </p>
                  </div>
                </Link>

                <div className="mt-12">
                  <div className="inline-flex items-center gap-2 bg-[#41D3BD]/15 border border-[#41D3BD]/25 text-[#41D3BD] px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide">
                    <span>🔐</span>
                    <span>Password reset</span>
                  </div>

                  <h1 className="text-white text-6xl font-black mt-6 leading-[0.98] tracking-tight">
                    Create a
                    <span className="block text-[#41D3BD]">
                      new password.
                    </span>
                  </h1>

                  <p className="text-[#D7F5EF] text-lg mt-6 leading-relaxed max-w-xl">
                    Set a fresh password for your Nefo account. After the update,
                    you will be signed out and sent back to login.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">🔒</p>
                  <p className="text-white font-black mt-3">Secure</p>
                  <p className="text-white/60 text-xs mt-1">
                    Account access
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">⚡</p>
                  <p className="text-white font-black mt-3">Fast</p>
                  <p className="text-white/60 text-xs mt-1">
                    Quick update
                  </p>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-3xl p-4">
                  <p className="text-[#41D3BD] text-2xl">✅</p>
                  <p className="text-white font-black mt-3">Simple</p>
                  <p className="text-white/60 text-xs mt-1">
                    Login again
                  </p>
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
                    Reset Password
                  </p>
                </div>
              </Link>

              <Link
                to="/customer-login"
                className="text-[#51615D] hover:text-[#073B35] text-sm font-black"
              >
                Sign In
              </Link>
            </div>

            <div>
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                Account security
              </p>

              <h1 className="text-3xl sm:text-4xl font-black mt-2 text-[#111827] leading-tight">
                Create new password
              </h1>

              <p className="text-[#51615D] mt-3 leading-relaxed">
                Enter a new password for your Nefo account. Use at least 6
                characters.
              </p>
            </div>

            {message && (
              <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35]">
                {message}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="mt-7 space-y-4">
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

            <div className="mt-6 bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
              <p className="text-[#073B35] font-black text-sm">
                After update
              </p>

              <p className="text-[#51615D] text-xs mt-1 leading-relaxed">
                You will be signed out automatically. Sign in again with your
                new password.
              </p>
            </div>

            <Link
              to="/customer-login"
              className="block text-[#51615D] hover:text-[#073B35] text-sm mt-6 text-center font-bold"
            >
              Back to Sign In
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
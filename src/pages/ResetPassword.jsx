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
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] flex items-center justify-center px-4 sm:px-6 py-10 overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#41D3BD]/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#41D3BD]/10 blur-[110px] rounded-full" />

      <div className="relative w-full max-w-md bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/10">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-3xl bg-[#41D3BD] flex items-center justify-center shadow-lg shadow-[#41D3BD]/20">
            <span className="text-[#073B35] text-2xl font-black">N</span>
          </div>
        </div>

        <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm text-center">
          Reset Password
        </p>

        <h1 className="text-3xl font-black text-center text-[#111827] mt-2">
          Create new password
        </h1>

        <p className="text-[#51615D] mt-3 text-center leading-relaxed">
          Enter a new password for your Nefo account.
        </p>

        {message && (
          <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm text-[#073B35]">
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
            className="w-full bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.99] disabled:opacity-50 text-[#073B35] font-black py-4 rounded-2xl shadow-lg shadow-[#41D3BD]/20"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>

        <Link
          to="/customer-login"
          className="block text-[#51615D] hover:text-[#1A9F8D] text-sm mt-6 text-center"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
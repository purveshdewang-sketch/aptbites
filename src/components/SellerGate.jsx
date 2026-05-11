import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function SellerGate({ children }) {
  const { user } = useAuth();

  const unlockKey = user
    ? `quickbites_seller_unlocked_${user.id}`
    : "quickbites_seller_unlocked";

  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem(unlockKey) === "yes"
  );

  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleSellerUnlock(event) {
    event.preventDefault();
    setChecking(true);
    setMessage("");

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setMessage("Seller verification failed. Check email and password.");
        setChecking(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_seller")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setMessage("Could not verify seller profile.");
        setChecking(false);
        return;
      }

      if (!profile?.is_seller) {
        setMessage("This account is not approved as a seller.");
        setChecking(false);
        return;
      }

      sessionStorage.setItem(unlockKey, "yes");
      setUnlocked(true);
    } catch (error) {
      setMessage(error.message);
    }

    setChecking(false);
  }

  if (unlocked) {
    return children;
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-6 sm:p-8 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-yellow-500 flex items-center justify-center text-black text-3xl font-black">
          🔒
        </div>

        <h1 className="text-3xl font-black text-center mt-6">
          Unlock Seller Dashboard
        </h1>

        <p className="text-gray-400 text-center mt-3 leading-relaxed">
          Re-enter your seller email and password to access kitchen controls.
        </p>

        {message && (
          <div className="mt-5 bg-black border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
            {message}
          </div>
        )}

        <form onSubmit={handleSellerUnlock} className="mt-7 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="Seller email"
            className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500"
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="Seller password"
            className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500"
          />

          <button
            type="submit"
            disabled={checking}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 active:scale-[0.99] text-black font-black py-4 rounded-2xl"
          >
            {checking ? "Verifying..." : "Unlock Seller Dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}
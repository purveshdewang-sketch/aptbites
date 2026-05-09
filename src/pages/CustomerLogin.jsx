import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function CustomerLogin() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleAuth(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage(
            "Account created successfully. You are now signed in."
          );

          navigate("/marketplace");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          navigate("/marketplace");
        }
      }
    } catch (error) {
      setMessage(error.message);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 sm:px-6 py-10 overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/10 blur-[100px] rounded-full" />

      <div className="relative w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-3xl bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="text-black text-2xl font-black">
              A
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-center">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h1>

        <p className="text-gray-400 mt-3 text-center leading-relaxed">
          {isSignUp
            ? "Create your AptBites account to order and explore homemade food."
            : "Sign in to continue ordering homemade food from your apartment community."}
        </p>

        {message && (
          <div className="mt-5 bg-black border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
            {message}
          </div>
        )}

        <form
          onSubmit={handleAuth}
          className="mt-7 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Email Address
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
              className="w-full bg-black border border-[#333] rounded-2xl px-4 py-4 outline-none focus:border-yellow-500 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.99] disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-yellow-500/10"
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
          }}
          className="w-full mt-5 text-sm text-yellow-400 hover:text-yellow-300 transition-all"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "New here? Create an account"}
        </button>

        <Link
          to="/"
          className="block text-gray-500 hover:text-gray-400 text-sm mt-6 text-center transition-all"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
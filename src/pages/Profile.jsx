import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Profile() {
  const { user, signOut } = useAuth();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    flat: "",
    seller_kitchen_name: "",
    seller_specialty: "",
    seller_about: "",
    accept_scheduled_orders: true,
  });

  const [role, setRole] = useState("customer");
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [user]);

  async function fetchProfile() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "role, is_seller, full_name, phone, flat, seller_kitchen_name, seller_specialty, seller_about, accept_scheduled_orders"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setMessage(`Could not load profile: ${error.message}`);
      setLoading(false);
      return;
    }

    const profileRole = String(data?.role || user?.user_metadata?.role || "customer").toLowerCase();
    const sellerAllowed =
      profileRole === "seller" ||
      profileRole === "admin" ||
      data?.is_seller === true;

    setRole(profileRole);
    setIsSeller(sellerAllowed);

    setFormData({
      full_name: data?.full_name || user?.user_metadata?.full_name || "",
      phone: data?.phone || user?.phone || user?.user_metadata?.phone || "",
      flat: data?.flat || user?.user_metadata?.flat || "",
      seller_kitchen_name: data?.seller_kitchen_name || "",
      seller_specialty: data?.seller_specialty || "",
      seller_about: data?.seller_about || "",
      accept_scheduled_orders: data?.accept_scheduled_orders !== false,
    });

    setLoading(false);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!user) return;

    setSaving(true);
    setMessage("");

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: formData.full_name,
      phone: formData.phone,
      flat: formData.flat,
    };

    if (isSeller) {
      profilePayload.seller_kitchen_name = formData.seller_kitchen_name;
      profilePayload.seller_specialty = formData.seller_specialty;
      profilePayload.seller_about = formData.seller_about;
      profilePayload.accept_scheduled_orders =
        formData.accept_scheduled_orders;
    }

    const { error } = await supabase.from("profiles").upsert(profilePayload);

    if (error) {
      setMessage(`Could not save profile: ${error.message}`);
      setSaving(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: formData.full_name,
        phone: formData.phone,
        flat: formData.flat,
      },
    });

    setMessage("Profile updated successfully.");
    setSaving(false);
  }

  async function handlePasswordReset() {
    if (!user?.email) {
      setMessage("Email not available for password reset.");
      return;
    }

    setResettingPassword(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/profile`;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo,
    });

    if (error) {
      setMessage(`Password reset failed: ${error.message}`);
      setResettingPassword(false);
      return;
    }

    setMessage("Password reset link sent to your email.");
    setResettingPassword(false);
  }

  async function handleLogout() {
    await signOut();
    window.location.href = "/";
  }

  if (!user) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-10 flex items-center justify-center">
          <div className="max-w-md w-full bg-[#111] border border-[#222] rounded-[2rem] p-8 text-center">
            <h1 className="text-3xl font-black">Sign in required</h1>

            <p className="text-gray-500 mt-3">
              Please sign in to view your profile.
            </p>

            <Link
              to="/customer-login"
              className="block mt-7 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl"
            >
              Sign In
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-7 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <div>
            <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
              My Profile
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-2">
              Account details
            </h1>

            <p className="text-gray-500 mt-3">
              Edit your contact details, address, and seller profile.
            </p>
          </div>

          {message && (
            <div className="mt-6 bg-[#111] border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
              {message}
            </div>
          )}

          {loading ? (
            <div className="mt-8 bg-[#111] border border-[#222] rounded-3xl p-8">
              <p className="text-gray-500 font-bold">Loading profile...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_0.75fr] gap-6 mt-8">
              <form
                onSubmit={handleSaveProfile}
                className="bg-[#111] border border-[#222] rounded-[2rem] p-5 sm:p-7"
              >
                <h2 className="text-2xl font-black">Basic Details</h2>

                <div className="mt-5 space-y-4">
                  <input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500"
                    placeholder="Full Name"
                  />

                  <input
                    value={user.email || ""}
                    disabled
                    readOnly
                    className="w-full bg-[#111] border border-[#333] rounded-2xl px-5 py-4 outline-none text-gray-500 cursor-not-allowed"
                    placeholder="Email"
                  />

                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500"
                    placeholder="Phone Number"
                  />

                  <input
                    name="flat"
                    value={formData.flat}
                    onChange={handleChange}
                    className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500"
                    placeholder="Tower / Flat e.g. B-1204"
                  />
                </div>

                {isSeller && (
                  <div className="mt-8 border-t border-[#222] pt-6">
                    <h2 className="text-2xl font-black">Seller Details</h2>

                    <div className="mt-5 space-y-4">
                      <input
                        name="seller_kitchen_name"
                        value={formData.seller_kitchen_name}
                        onChange={handleChange}
                        className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500"
                        placeholder="Kitchen / Seller Name"
                      />

                      <input
                        name="seller_specialty"
                        value={formData.seller_specialty}
                        onChange={handleChange}
                        className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500"
                        placeholder="Food Specialty"
                      />

                      <textarea
                        name="seller_about"
                        value={formData.seller_about}
                        onChange={handleChange}
                        rows="4"
                        className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 resize-none"
                        placeholder="Tell customers about your kitchen..."
                      />

                      <label className="flex items-start gap-3 bg-black border border-[#333] rounded-2xl p-4 cursor-pointer">
                        <input
                          type="checkbox"
                          name="accept_scheduled_orders"
                          checked={formData.accept_scheduled_orders}
                          onChange={handleChange}
                          className="mt-1 accent-yellow-500"
                        />

                        <div>
                          <p className="text-white font-bold">
                            Accept scheduled orders
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            Customers can choose date and time for later orders.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-7 w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black py-4 rounded-2xl"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </form>

              <aside className="space-y-5">
                <div className="bg-[#111] border border-[#222] rounded-[2rem] p-5 sm:p-6">
                  <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                    Account Type
                  </p>

                  <h2 className="text-2xl font-black mt-2 capitalize">
                    {role || "customer"}
                  </h2>

                  <p className="text-gray-500 text-sm mt-3">
                    {isSeller
                      ? "You have seller dashboard access."
                      : "You are using a customer account."}
                  </p>

                  {!isSeller && (
                    <p className="text-gray-500 text-sm mt-3">
                      To sell food, use “Switch to Seller Account” from the profile menu.
                    </p>
                  )}
                </div>

                <div className="bg-[#111] border border-[#222] rounded-[2rem] p-5 sm:p-6">
                  <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                    Password
                  </p>

                  <h2 className="text-2xl font-black mt-2">Reset password</h2>

                  <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                    We will send a secure password reset link to your registered email.
                  </p>

                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resettingPassword}
                    className="mt-5 w-full border border-yellow-500/60 text-yellow-400 hover:bg-yellow-500 hover:text-black disabled:opacity-50 font-black py-4 rounded-2xl transition-all"
                  >
                    {resettingPassword ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>

                <div className="bg-[#111] border border-[#222] rounded-[2rem] p-5 sm:p-6">
                  <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                    Session
                  </p>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 w-full bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-black font-black py-4 rounded-2xl transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
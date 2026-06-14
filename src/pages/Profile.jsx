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
    delivery_available: true,
    pickup_available: true,
    bank_account_holder: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_upi_id: "",
  });

  const [originalFormData, setOriginalFormData] = useState(null);

  const [role, setRole] = useState("customer");
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState("");

  const profileChanged =
    originalFormData &&
    JSON.stringify(formData) !== JSON.stringify(originalFormData);

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

    const defaultProfile = {
      full_name: user?.user_metadata?.full_name || "",
      phone: user?.phone || user?.user_metadata?.phone || "",
      flat: user?.user_metadata?.flat || "",
      seller_kitchen_name: "",
      seller_specialty: "",
      seller_about: "",
      accept_scheduled_orders: true,
      delivery_available: true,
      pickup_available: true,
      bank_account_holder: "",
      bank_name: "",
      bank_account_number: "",
      bank_ifsc: "",
      bank_upi_id: "",
    };

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "role, is_seller, full_name, phone, flat, seller_kitchen_name, seller_specialty, seller_about, accept_scheduled_orders, delivery_available, pickup_available, seller_application_status, bank_account_holder, bank_name, bank_account_number, bank_ifsc, bank_upi_id"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setMessage(`Could not load profile: ${error.message}`);
      setFormData(defaultProfile);
      setOriginalFormData(defaultProfile);
      setLoading(false);
      return;
    }

    const profileRole = String(
      data?.role || user?.user_metadata?.role || "customer"
    ).toLowerCase();

    const applicationStatus = String(
      data?.seller_application_status || "not_applied"
    ).toLowerCase();

    const sellerAllowed =
      profileRole === "admin" ||
      (profileRole === "seller" &&
        data?.is_seller === true &&
        applicationStatus === "approved");

    setRole(profileRole || "customer");
    setIsSeller(sellerAllowed);

    const loadedProfile = {
      full_name: data?.full_name || user?.user_metadata?.full_name || "",
      phone: data?.phone || user?.phone || user?.user_metadata?.phone || "",
      flat: data?.flat || user?.user_metadata?.flat || "",
      seller_kitchen_name: data?.seller_kitchen_name || "",
      seller_specialty: data?.seller_specialty || "",
      seller_about: data?.seller_about || "",
      accept_scheduled_orders: data?.accept_scheduled_orders !== false,
      delivery_available: data?.delivery_available !== false,
      pickup_available: data?.pickup_available !== false,
      bank_account_holder: data?.bank_account_holder || "",
      bank_name: data?.bank_name || "",
      bank_account_number: data?.bank_account_number || "",
      bank_ifsc: data?.bank_ifsc || "",
      bank_upi_id: data?.bank_upi_id || "",
    };

    setFormData(loadedProfile);
    setOriginalFormData(loadedProfile);

    setLoading(false);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (
      type === "checkbox" &&
      name === "delivery_available" &&
      checked === false &&
      formData.pickup_available === false
    ) {
      setMessage("At least one option must stay ON: Delivery or Self Pickup.");
      return;
    }

    if (
      type === "checkbox" &&
      name === "pickup_available" &&
      checked === false &&
      formData.delivery_available === false
    ) {
      setMessage("At least one option must stay ON: Delivery or Self Pickup.");
      return;
    }

    const nextValue = name === "bank_ifsc" ? value.toUpperCase() : value;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === "checkbox" ? checked : nextValue,
    }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!user) return;

    if (!profileChanged) {
      setMessage("No profile changes to save.");
      return;
    }

    if (
      isSeller &&
      formData.delivery_available === false &&
      formData.pickup_available === false
    ) {
      setMessage("At least one option must stay ON: Delivery or Self Pickup.");
      return;
    }

    setSaving(true);
    setMessage("");

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: formData.full_name,
      phone: formData.phone,
      flat: formData.flat,
      role,
      is_seller: isSeller,
      bank_account_holder: formData.bank_account_holder,
      bank_name: formData.bank_name,
      bank_account_number: formData.bank_account_number,
      bank_ifsc: formData.bank_ifsc,
      bank_upi_id: formData.bank_upi_id,
    };

    if (isSeller) {
      profilePayload.seller_kitchen_name = formData.seller_kitchen_name;
      profilePayload.seller_specialty = formData.seller_specialty;
      profilePayload.seller_about = formData.seller_about;
      profilePayload.accept_scheduled_orders = formData.accept_scheduled_orders;
      profilePayload.delivery_available = formData.delivery_available;
      profilePayload.pickup_available = formData.pickup_available;
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
        role,
      },
    });

    const savedProfile = {
      full_name: formData.full_name,
      phone: formData.phone,
      flat: formData.flat,
      seller_kitchen_name: formData.seller_kitchen_name,
      seller_specialty: formData.seller_specialty,
      seller_about: formData.seller_about,
      accept_scheduled_orders: formData.accept_scheduled_orders,
      delivery_available: formData.delivery_available,
      pickup_available: formData.pickup_available,
      bank_account_holder: formData.bank_account_holder,
      bank_name: formData.bank_name,
      bank_account_number: formData.bank_account_number,
      bank_ifsc: formData.bank_ifsc,
      bank_upi_id: formData.bank_upi_id,
    };

    setOriginalFormData(savedProfile);
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

  function getInitial() {
    if (formData.full_name) return formData.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "N";
  }

  if (!user) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-10 flex items-center justify-center">
          <div className="max-w-md w-full bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-xl shadow-[#073B35]/5">
            <div className="w-24 h-24 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-5xl">
              👤
            </div>

            <h1 className="text-3xl font-black mt-6 text-[#111827]">
              Sign in required
            </h1>

            <p className="text-[#51615D] mt-3">
              Please sign in to view your profile.
            </p>

            <Link
              to="/customer-login"
              className="block mt-7 bg-[#073B35] hover:bg-[#0B5149] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15"
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

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-36 sm:pb-24">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>👤</span>
                  <span>My Profile</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  Account
                  <span className="block text-[#111827]">details</span>
                </h1>

                <p className="text-[#51615D] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Manage your contact details, address, password, seller
                  profile, and payout details.
                </p>
              </div>

              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4 min-w-[180px]">
                <p className="text-[#51615D] text-xs font-bold uppercase">
                  Account Type
                </p>

                <p className="text-[#073B35] text-2xl font-black mt-1 capitalize">
                  {role || "customer"}
                </p>
              </div>
            </div>
          </section>

          {message && (
            <div className="mt-5 bg-white/90 border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35] shadow-sm">
              {message}
            </div>
          )}

          {loading ? (
            <div className="mt-6 bg-white/90 border border-[#D7F5EF] rounded-3xl p-8 shadow-lg shadow-[#073B35]/5">
              <p className="text-[#51615D] font-bold">Loading profile...</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_0.75fr] gap-5 sm:gap-6 mt-6">
              <section className="space-y-5">
                <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-[#073B35] text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-[#073B35]/15">
                      {getInitial()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[#111827] font-black text-xl truncate">
                        {formData.full_name || "Nefo User"}
                      </p>

                      <p className="text-[#51615D] text-sm truncate mt-1">
                        {user.email}
                      </p>

                      <div className="mt-2 inline-flex items-center rounded-full bg-[#41D3BD]/12 border border-[#41D3BD]/25 px-3 py-1">
                        <span className="text-[#073B35] text-xs font-black capitalize">
                          {isSeller
                            ? "Seller access enabled"
                            : "Customer account"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  id="profile-form"
                  onSubmit={handleSaveProfile}
                  className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5"
                >
                  <div>
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                      Basic Details
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                      Personal information
                    </h2>

                    <p className="text-[#51615D] text-sm mt-2">
                      These details are used for order coordination.
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                        Full Name
                      </label>

                      <input
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                        placeholder="Full Name"
                      />
                    </div>

                    <div>
                      <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                        Email
                      </label>

                      <input
                        value={user.email || ""}
                        disabled
                        readOnly
                        className="w-full bg-[#EAF7F4] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none text-[#51615D] cursor-not-allowed text-base"
                        placeholder="Email"
                      />
                    </div>

                    <div>
                      <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                        Phone Number
                      </label>

                      <input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                        placeholder="Phone Number"
                      />
                    </div>

                    <div>
                      <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                        Tower / Flat
                      </label>

                      <input
                        name="flat"
                        value={formData.flat}
                        onChange={handleChange}
                        className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                        placeholder="Tower / Flat e.g. B-1204"
                      />
                    </div>
                  </div>

                  {isSeller && (
                    <div className="mt-8 border-t border-[#D7F5EF] pt-6">
                      <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                        Payout Details
                      </p>

                      <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                        Bank account
                      </h2>

                      <p className="text-[#51615D] text-sm mt-2">
                        These details are used only for seller payouts and
                        settlements.
                      </p>

                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            Account Holder Name
                          </label>

                          <input
                            name="bank_account_holder"
                            value={formData.bank_account_holder}
                            onChange={handleChange}
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                            placeholder="Account Holder Name"
                          />
                        </div>

                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            Bank Name
                          </label>

                          <input
                            name="bank_name"
                            value={formData.bank_name}
                            onChange={handleChange}
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                            placeholder="Bank Name"
                          />
                        </div>

                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            Account Number
                          </label>

                          <input
                            name="bank_account_number"
                            value={formData.bank_account_number}
                            onChange={handleChange}
                            inputMode="numeric"
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                            placeholder="Account Number"
                          />
                        </div>

                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            IFSC Code
                          </label>

                          <input
                            name="bank_ifsc"
                            value={formData.bank_ifsc}
                            onChange={handleChange}
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base uppercase"
                            placeholder="IFSC Code"
                          />
                        </div>

                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            UPI ID Optional
                          </label>

                          <input
                            name="bank_upi_id"
                            value={formData.bank_upi_id}
                            onChange={handleChange}
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                            placeholder="yourupi@bank"
                          />
                        </div>

                        <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
                          <p className="text-[#073B35] font-black text-sm">
                            Secure information
                          </p>

                          <p className="text-[#51615D] text-xs mt-1 leading-relaxed">
                            Bank details are never shown to customers. They are
                            used only for seller payouts by Nefo admin or
                            accounting.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isSeller && (
                    <div className="mt-8 border-t border-[#D7F5EF] pt-6">
                      <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                        Seller Details
                      </p>

                      <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                        Kitchen profile
                      </h2>

                      <p className="text-[#51615D] text-sm mt-2">
                        These details help customers understand your kitchen.
                      </p>

                      <div className="mt-6 space-y-4">
                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            Kitchen / Seller Name
                          </label>

                          <input
                            name="seller_kitchen_name"
                            value={formData.seller_kitchen_name}
                            onChange={handleChange}
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                            placeholder="Kitchen / Seller Name"
                          />
                        </div>

                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            Food Specialty
                          </label>

                          <input
                            name="seller_specialty"
                            value={formData.seller_specialty}
                            onChange={handleChange}
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] text-[#111827] text-base"
                            placeholder="Food Specialty"
                          />
                        </div>

                        <div>
                          <label className="block text-[#51615D] text-xs font-black uppercase tracking-wide mb-2">
                            About Your Kitchen
                          </label>

                          <textarea
                            name="seller_about"
                            value={formData.seller_about}
                            onChange={handleChange}
                            rows="4"
                            className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] resize-none text-[#111827] text-base"
                            placeholder="Tell customers about your kitchen..."
                          />
                        </div>

                        <label className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 cursor-pointer">
                          <input
                            type="checkbox"
                            name="accept_scheduled_orders"
                            checked={formData.accept_scheduled_orders}
                            onChange={handleChange}
                            className="mt-1 accent-[#41D3BD]"
                          />

                          <div>
                            <p className="text-[#111827] font-black">
                              Accept scheduled orders
                            </p>

                            <p className="text-[#51615D] text-sm mt-1">
                              Customers can choose date and time for later
                              orders.
                            </p>
                          </div>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 cursor-pointer">
                            <input
                              type="checkbox"
                              name="delivery_available"
                              checked={formData.delivery_available}
                              onChange={handleChange}
                              className="mt-1 accent-[#41D3BD]"
                            />

                            <div>
                              <p className="text-[#111827] font-black">
                                Delivery available
                              </p>

                              <p className="text-[#51615D] text-sm mt-1">
                                Customers can choose doorstep delivery.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 cursor-pointer">
                            <input
                              type="checkbox"
                              name="pickup_available"
                              checked={formData.pickup_available}
                              onChange={handleChange}
                              className="mt-1 accent-[#41D3BD]"
                            />

                            <div>
                              <p className="text-[#111827] font-black">
                                Self pickup available
                              </p>

                              <p className="text-[#51615D] text-sm mt-1">
                                Customers can choose self pickup.
                              </p>
                            </div>
                          </label>
                        </div>

                        <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
                          <p className="text-[#073B35] font-black text-sm">
                            Privacy note
                          </p>

                          <p className="text-[#51615D] text-xs mt-1 leading-relaxed">
                            Exact kitchen door/location should not be shown
                            publicly to customers.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !profileChanged}
                    className={`hidden sm:block mt-7 w-full font-black py-4 rounded-2xl transition-all ${
                      profileChanged
                        ? "bg-[#073B35] hover:bg-[#0B5149] text-white shadow-lg shadow-[#073B35]/15"
                        : "bg-[#D7F5EF] text-[#8AA5A0] cursor-not-allowed"
                    } disabled:opacity-60`}
                  >
                    {saving
                      ? "Saving..."
                      : profileChanged
                      ? "Save Profile"
                      : "No Changes"}
                  </button>
                </form>
              </section>

              <aside className="space-y-5">
                <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Account Type
                  </p>

                  <h2 className="text-2xl font-black mt-2 capitalize text-[#111827]">
                    {role || "customer"}
                  </h2>

                  <p className="text-[#51615D] text-sm mt-3 leading-relaxed">
                    {isSeller
                      ? "You have seller dashboard access."
                      : "You are using a customer account."}
                  </p>

                  {isSeller ? (
                    <>
                      <Link
                        to="/seller-dashboard"
                        className="block mt-5 bg-[#073B35] hover:bg-[#0B5149] text-white text-center font-black py-3 rounded-2xl transition-all"
                      >
                        Open Seller Dashboard
                      </Link>

                      <Link
                        to="/seller-helper"
                        className="block mt-3 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] text-center font-black py-3 rounded-2xl transition-all"
                      >
                        Seller Assistant
                      </Link>
                    </>
                  ) : (
                    <p className="text-[#51615D] text-sm mt-3 leading-relaxed">
                      To sell food, use “Apply to Sell on Nefo” from the profile
                      menu.
                    </p>
                  )}
                </div>

                {isSeller && (
                  <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                      Payout Status
                    </p>

                    <h2 className="text-2xl font-black mt-2 text-[#111827]">
                      Bank details
                    </h2>

                    <div className="mt-4 space-y-3 text-sm font-bold">
                      <div className="flex items-center justify-between bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 gap-3">
                        <span className="text-[#51615D]">Account Holder</span>
                        <span className="text-[#073B35] text-right truncate max-w-[150px]">
                          {formData.bank_account_holder || "Not added"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 gap-3">
                        <span className="text-[#51615D]">Bank</span>
                        <span className="text-[#073B35] text-right truncate max-w-[150px]">
                          {formData.bank_name || "Not added"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 gap-3">
                        <span className="text-[#51615D]">IFSC</span>
                        <span className="text-[#073B35] text-right truncate max-w-[150px]">
                          {formData.bank_ifsc || "Not added"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 gap-3">
                        <span className="text-[#51615D]">UPI</span>
                        <span className="text-[#073B35] text-right truncate max-w-[150px]">
                          {formData.bank_upi_id || "Optional"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {isSeller && (
                  <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                      Seller Settings
                    </p>

                    <h2 className="text-2xl font-black mt-2 text-[#111827]">
                      Order options
                    </h2>

                    <div className="mt-4 space-y-3 text-sm font-bold">
                      <div className="flex items-center justify-between bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3">
                        <span className="text-[#51615D]">Delivery</span>
                        <span
                          className={
                            formData.delivery_available
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {formData.delivery_available ? "ON" : "OFF"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3">
                        <span className="text-[#51615D]">Self Pickup</span>
                        <span
                          className={
                            formData.pickup_available
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {formData.pickup_available ? "ON" : "OFF"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3">
                        <span className="text-[#51615D]">Scheduled Orders</span>
                        <span
                          className={
                            formData.accept_scheduled_orders
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {formData.accept_scheduled_orders ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Password
                  </p>

                  <h2 className="text-2xl font-black mt-2 text-[#111827]">
                    Reset password
                  </h2>

                  <p className="text-[#51615D] text-sm mt-3 leading-relaxed">
                    We will send a secure password reset link to your registered
                    email.
                  </p>

                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resettingPassword}
                    className="mt-5 w-full border border-[#41D3BD]/60 text-[#073B35] hover:bg-[#41D3BD] disabled:opacity-50 font-black py-4 rounded-2xl transition-all"
                  >
                    {resettingPassword ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>

                <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Legal & Support
                  </p>

                  <h2 className="text-2xl font-black mt-2 text-[#111827]">
                    Help and policies
                  </h2>

                  <p className="text-[#51615D] text-sm mt-3 leading-relaxed">
                    Access Nefo support, refund rules, privacy details, and user
                    terms.
                  </p>

                  <div className="grid gap-3 mt-5">
                    <Link
                      to="/customer-care"
                      className="bg-[#073B35] hover:bg-[#0B5149] text-white font-black text-center py-3 rounded-2xl transition-all"
                    >
                      Customer Care
                    </Link>

                    <Link
                      to="/refund-policy"
                      className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-3 rounded-2xl transition-all"
                    >
                      Refund Policy
                    </Link>

                    <Link
                      to="/privacy-policy"
                      className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-3 rounded-2xl transition-all"
                    >
                      Privacy Policy
                    </Link>

                    <Link
                      to="/terms"
                      className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-3 rounded-2xl transition-all"
                    >
                      Terms & Conditions
                    </Link>
                  </div>
                </div>

                <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Session
                  </p>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 w-full bg-red-50 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white font-black py-4 rounded-2xl transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>

        {!loading && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF] px-4 py-3">
            <button
              type="submit"
              form="profile-form"
              disabled={saving || !profileChanged}
              className={`w-full active:scale-[0.98] disabled:opacity-60 font-black py-4 rounded-2xl transition-all ${
                profileChanged
                  ? "bg-[#073B35] text-white shadow-xl shadow-[#073B35]/15"
                  : "bg-[#D7F5EF] text-[#8AA5A0] cursor-not-allowed"
              }`}
            >
              {saving
                ? "Saving..."
                : profileChanged
                ? "Save Profile"
                : "No Changes"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
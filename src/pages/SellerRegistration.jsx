import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  apartment_name: "",
  block: "",
  flat: "",
  kitchen_name: "",
  food_specialty: "",
  experience: "",
  about_kitchen: "",
  hygiene_note: "",
};

export default function SellerRegistration() {
  const { user } = useAuth();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [existingApplication, setExistingApplication] = useState(null);
  const [profileStatus, setProfileStatus] = useState("not_applied");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchSellerApplication();
  }, [user]);

  async function fetchSellerApplication() {
    if (!user) return;

    setLoading(true);
    setErrorMessage("");

    const { data: profileData } = await supabase
      .from("profiles")
      .select(
        "full_name, phone, apartment_name, block, flat, seller_application_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    const { data: applicationData, error: applicationError } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (applicationError && applicationError.code !== "PGRST116") {
      setErrorMessage(applicationError.message);
      setLoading(false);
      return;
    }

    const nextStatus =
      applicationData?.status ||
      profileData?.seller_application_status ||
      "not_applied";

    setProfileStatus(nextStatus);
    setExistingApplication(applicationData || null);

    if (applicationData) {
      setFormData({
        full_name: applicationData.full_name || "",
        phone: applicationData.phone || "",
        apartment_name: applicationData.apartment_name || "",
        block: applicationData.block || "",
        flat: applicationData.flat || "",
        kitchen_name: applicationData.kitchen_name || "",
        food_specialty: applicationData.food_specialty || "",
        experience: applicationData.experience || "",
        about_kitchen: applicationData.about_kitchen || "",
        hygiene_note: applicationData.hygiene_note || "",
      });
    } else {
      setFormData({
        full_name: profileData?.full_name || "",
        phone: profileData?.phone || "",
        apartment_name: profileData?.apartment_name || "",
        block: profileData?.block || "",
        flat: profileData?.flat || "",
        kitchen_name: "",
        food_specialty: "",
        experience: "",
        about_kitchen: "",
        hygiene_note: "",
      });
    }

    setLoading(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function validateForm() {
    if (!formData.full_name.trim()) return "Full name is required.";
    if (!formData.phone.trim()) return "Phone number is required.";
    if (!formData.apartment_name.trim()) return "Apartment name is required.";
    if (!formData.flat.trim()) return "Flat number is required.";
    if (!formData.kitchen_name.trim()) return "Kitchen name is required.";
    if (!formData.food_specialty.trim()) return "Food specialty is required.";
    if (!formData.about_kitchen.trim()) return "About kitchen is required.";
    if (!formData.hygiene_note.trim()) return "Hygiene note is required.";

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) return;

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const payload = {
      user_id: user.id,
      email: user.email,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      apartment_name: formData.apartment_name.trim(),
      block: formData.block.trim(),
      flat: formData.flat.trim(),
      kitchen_name: formData.kitchen_name.trim(),
      food_specialty: formData.food_specialty.trim(),
      experience: formData.experience.trim(),
      about_kitchen: formData.about_kitchen.trim(),
      hygiene_note: formData.hygiene_note.trim(),
      status: "pending",
      rejection_reason: null,
    };

    let applicationError;

    if (existingApplication?.id) {
      const { error } = await supabase
        .from("seller_applications")
        .update(payload)
        .eq("id", existingApplication.id)
        .eq("user_id", user.id);

      applicationError = error;
    } else {
      const { error } = await supabase
        .from("seller_applications")
        .insert(payload);

      applicationError = error;
    }

    if (applicationError) {
      setErrorMessage(applicationError.message);
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      apartment_name: formData.apartment_name.trim(),
      block: formData.block.trim(),
      flat: formData.flat.trim(),
      seller_application_status: "pending",
      seller_rejected_reason: null,
    });

    if (profileError) {
      setErrorMessage(profileError.message);
      setSaving(false);
      return;
    }

    setMessage(
      "Your seller application has been submitted. Please wait up to 2 working days for review."
    );

    setProfileStatus("pending");
    setSaving(false);
    fetchSellerApplication();
  }

  function getStatusCard() {
    const status = String(profileStatus || "not_applied").toLowerCase();

    if (status === "approved") {
      return (
        <div className="bg-green-50 border border-green-200 rounded-3xl p-5">
          <p className="text-green-700 font-black">Application approved</p>
          <p className="text-green-700/80 text-sm mt-2">
            Your kitchen has been approved. You can now access the Seller
            Dashboard.
          </p>

          <Link
            to="/seller-dashboard"
            className="inline-flex mt-4 bg-[#073B35] hover:bg-[#0B5149] text-white font-black px-5 py-3 rounded-2xl"
          >
            Open Seller Dashboard
          </Link>
        </div>
      );
    }

    if (status === "pending") {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-5">
          <p className="text-yellow-700 font-black">Application under review</p>
          <p className="text-yellow-700/80 text-sm mt-2">
            Please wait up to 2 working days. The Nefo owner/admin will review
            your kitchen details.
          </p>
        </div>
      );
    }

    if (status === "rejected") {
      return (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5">
          <p className="text-red-600 font-black">Application rejected</p>
          <p className="text-red-500 text-sm mt-2">
            You can correct your details and re-apply.
          </p>

          {existingApplication?.rejection_reason && (
            <p className="text-red-500 text-sm mt-2">
              Reason: {existingApplication.rejection_reason}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-3xl p-5">
        <p className="text-[#073B35] font-black">Apply to sell on Nefo</p>
        <p className="text-[#51615D] text-sm mt-2">
          Submit your kitchen details. The owner will review and approve before
          you can sell.
        </p>
      </div>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-28">
        <div className="max-w-5xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                <span>🍱</span>
                <span>Seller Application</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                Apply to sell
                <span className="block text-[#111827]">on Nefo</span>
              </h1>

              <p className="text-[#51615D] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                Tell us about your home kitchen. Once approved, your Seller
                Dashboard will be unlocked.
              </p>
            </div>
          </section>

          <section className="mt-6">{getStatusCard()}</section>

          {loading ? (
            <div className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-3xl p-8 text-center">
              <p className="text-[#51615D] font-bold">
                Loading application...
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5"
            >
              <div>
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Kitchen Details
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  Registration form
                </h2>
              </div>

              {message && (
                <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 font-bold">
                  {message}
                </div>
              )}

              {errorMessage && (
                <div className="mt-5 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 font-bold">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <Input
                  label="Full Name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                />

                <Input
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />

                <Input
                  label="Apartment Name"
                  name="apartment_name"
                  value={formData.apartment_name}
                  onChange={handleChange}
                />

                <Input
                  label="Block"
                  name="block"
                  value={formData.block}
                  onChange={handleChange}
                />

                <Input
                  label="Flat"
                  name="flat"
                  value={formData.flat}
                  onChange={handleChange}
                />

                <Input
                  label="Kitchen Name"
                  name="kitchen_name"
                  value={formData.kitchen_name}
                  onChange={handleChange}
                />

                <Input
                  label="Food Specialty"
                  name="food_specialty"
                  value={formData.food_specialty}
                  onChange={handleChange}
                  placeholder="Example: South Indian, Punjabi, Tiffin, Snacks"
                />

                <Input
                  label="Cooking Experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="Example: 5 years home cooking"
                />

                <Textarea
                  label="About Kitchen"
                  name="about_kitchen"
                  value={formData.about_kitchen}
                  onChange={handleChange}
                  placeholder="Tell us what kind of food you will sell."
                />

                <Textarea
                  label="Hygiene Note"
                  name="hygiene_note"
                  value={formData.hygiene_note}
                  onChange={handleChange}
                  placeholder="Mention your hygiene, packing, and kitchen cleanliness practices."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="submit"
                  disabled={saving || profileStatus === "approved"}
                  className="bg-[#073B35] hover:bg-[#0B5149] disabled:opacity-50 text-white font-black px-6 py-4 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
                >
                  {saving
                    ? "Submitting..."
                    : profileStatus === "rejected"
                    ? "Re-apply"
                    : profileStatus === "pending"
                    ? "Update Application"
                    : "Submit Application"}
                </button>

                <Link
                  to="/marketplace"
                  className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black px-6 py-4 rounded-2xl text-center"
                >
                  Back to Marketplace
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  );
}

function Input({ label, name, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="text-[#51615D] text-sm font-black">{label}</span>

      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-3 outline-none focus:border-[#41D3BD] text-[#111827] font-bold"
      />
    </label>
  );
}

function Textarea({ label, name, value, onChange, placeholder = "" }) {
  return (
    <label className="block sm:col-span-2">
      <span className="text-[#51615D] text-sm font-black">{label}</span>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-3 outline-none focus:border-[#41D3BD] text-[#111827] font-bold resize-none"
      />
    </label>
  );
}
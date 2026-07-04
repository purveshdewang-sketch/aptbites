import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const EMPTY_ERRORS = {
  full_name: "",
  phone: "",
  apartment_name: "",
  flat: "",
  kitchen_name: "",
  food_specialty: "",
  about_kitchen: "",
  hygiene_note: "",
  general: "",
};

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

export default function SellerRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState(EMPTY_ERRORS);
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
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setFieldErrors({ ...EMPTY_ERRORS });

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

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
      general: "",
    }));

    setErrorMessage("");
    setMessage("");
  }

  function validateForm() {
    const nextErrors = { ...EMPTY_ERRORS };

    if (!formData.full_name.trim()) {
      nextErrors.full_name = "Full name is required.";
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    }

    if (!formData.apartment_name.trim()) {
      nextErrors.apartment_name = "Apartment name is required.";
    }

    if (!formData.flat.trim()) {
      nextErrors.flat = "Flat number is required.";
    }

    if (!formData.kitchen_name.trim()) {
      nextErrors.kitchen_name = "Kitchen name is required.";
    }

    if (!formData.food_specialty.trim()) {
      nextErrors.food_specialty = "Food specialty is required.";
    }

    if (!formData.about_kitchen.trim()) {
      nextErrors.about_kitchen = "About kitchen is required.";
    }

    if (!formData.hygiene_note.trim()) {
      nextErrors.hygiene_note = "Hygiene note is required.";
    }

    setFieldErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) return;

    if (!validateForm()) {
      setErrorMessage("Please correct the highlighted fields.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");
    setFieldErrors({ ...EMPTY_ERRORS });

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
        <section className="rounded-[24px] border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-green-200 bg-white text-2xl">
              ✅
            </div>

            <div>
              <p className="font-black text-green-700">
                Application approved
              </p>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-green-700/80">
                Your kitchen has been approved. You can now access the Seller
                Dashboard.
              </p>

              <Link
                to="/seller-dashboard"
                className="mt-4 inline-flex rounded-2xl border border-[#3F5128] bg-[#3F5128] px-5 py-3 font-black text-white active:scale-95"
              >
                Open Seller Dashboard
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (status === "pending") {
      return (
        <section className="rounded-[24px] border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-200 bg-white text-2xl">
              ⏳
            </div>

            <div>
              <p className="font-black text-yellow-700">
                Application under review
              </p>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-yellow-700/80">
                Please wait up to 2 working days. The NeFo owner/admin will
                review your kitchen details.
              </p>
            </div>
          </div>
        </section>
      );
    }

    if (status === "rejected") {
      return (
        <section className="rounded-[24px] border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-white text-2xl">
              ⚠️
            </div>

            <div>
              <p className="font-black text-red-600">
                Application rejected
              </p>

              <p className="mt-2 text-sm font-semibold text-red-500">
                You can correct your details and re-apply.
              </p>

              {existingApplication?.rejection_reason ? (
                <p className="mt-2 text-sm font-semibold text-red-500">
                  Reason: {existingApplication.rejection_reason}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-[24px] border border-[#D8C9B3] bg-[#FFF0DF] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-white text-2xl">
            🍱
          </div>

          <div>
            <p className="font-black text-[#3F5128]">Apply to sell on NeFo</p>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Submit your kitchen details. The owner will review and approve
              before you can sell.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!user && !loading) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <section className={`mt-6 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              🍱
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#181411]">
              Sign in to apply
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              You need a NeFo account before applying as a seller.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white"
            >
              Sign In / Create Account
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Seller Application
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Apply to sell
              <span className="block text-[#181411]">on NeFo</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Tell us about your home kitchen. Once approved, your Seller
              Dashboard will be unlocked.
            </p>
          </div>
        </header>

        <section className="mt-5">{getStatusCard()}</section>

        {loading ? (
          <section className={`mt-5 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#EADFCE] border-t-[#3F5128] animate-spin" />

            <p className="mt-4 font-bold text-[#6B6258]">
              Loading application...
            </p>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className={`mt-5 p-5 ${CARD}`}>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Kitchen Details
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Registration form
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                Fill the required details carefully. These will be reviewed by
                the owner/admin.
              </p>
            </div>

            {message ? (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-black text-green-700">{message}</p>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-600">
                  {errorMessage}
                </p>
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <Input
                label="Full Name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                error={fieldErrors.full_name}
              />

              <Input
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={fieldErrors.phone}
              />

              <Input
                label="Apartment Name"
                name="apartment_name"
                value={formData.apartment_name}
                onChange={handleChange}
                error={fieldErrors.apartment_name}
              />

              <Input
                label="Block"
                name="block"
                value={formData.block}
                onChange={handleChange}
                placeholder="Optional: Block / Tower"
              />

              <Input
                label="Flat"
                name="flat"
                value={formData.flat}
                onChange={handleChange}
                error={fieldErrors.flat}
              />

              <Input
                label="Kitchen Name"
                name="kitchen_name"
                value={formData.kitchen_name}
                onChange={handleChange}
                error={fieldErrors.kitchen_name}
              />

              <Input
                label="Food Specialty"
                name="food_specialty"
                value={formData.food_specialty}
                onChange={handleChange}
                error={fieldErrors.food_specialty}
                placeholder="Example: South Indian, Punjabi, Tiffin, Snacks"
              />

              <Input
                label="Cooking Experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="Optional: 5 years home cooking"
              />

              <Textarea
                label="About Kitchen"
                name="about_kitchen"
                value={formData.about_kitchen}
                onChange={handleChange}
                error={fieldErrors.about_kitchen}
                placeholder="Tell us what kind of food you will sell."
              />

              <Textarea
                label="Hygiene Note"
                name="hygiene_note"
                value={formData.hygiene_note}
                onChange={handleChange}
                error={fieldErrors.hygiene_note}
                placeholder="Mention hygiene, packing, and kitchen cleanliness practices."
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <button
                type="submit"
                disabled={saving || profileStatus === "approved"}
                className="rounded-2xl border border-[#3F5128] bg-[#3F5128] px-6 py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Submitting..."
                  : profileStatus === "rejected"
                  ? "Re-apply"
                  : profileStatus === "pending"
                  ? "Update Application"
                  : profileStatus === "approved"
                  ? "Already Approved"
                  : "Submit Application"}
              </button>

              <Link
                to="/marketplace"
                className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-6 py-4 text-center font-black text-[#3F5128] active:scale-95"
              >
                Back to Marketplace
              </Link>
            </div>

            <p className="mt-5 text-xs font-semibold leading-relaxed text-[#9A8E80]">
              After approval, use Seller Login to access your Seller Dashboard.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function Input({ label, name, value, onChange, placeholder = "", error = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
        {label}
      </span>

      {error ? (
        <p className="mb-2 text-sm font-black text-red-600">{error}</p>
      ) : null}

      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${INPUT} ${error ? "border-red-300" : ""}`}
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  error = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
        {label}
      </span>

      {error ? (
        <p className="mb-2 text-sm font-black text-red-600">{error}</p>
      ) : null}

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className={`${INPUT} min-h-32 resize-none ${
          error ? "border-red-300" : ""
        }`}
      />
    </label>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
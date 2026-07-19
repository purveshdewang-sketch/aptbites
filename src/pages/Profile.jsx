import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const PROFILE_IMAGE_BUCKET = "profile-images";
const MAX_PROFILE_IMAGE_SIZE = 10 * 1024 * 1024;
const PROFILE_IMAGE_DIMENSION = 900;

const PAGE_CARD =
  "rounded-[26px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

function compressProfileImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read the selected image."));
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        reject(
          new Error(
            "This image format could not be opened. Use JPG, PNG, or WebP."
          )
        );
      };

      image.onload = () => {
        const originalWidth = image.naturalWidth || image.width;
        const originalHeight = image.naturalHeight || image.height;

        if (!originalWidth || !originalHeight) {
          reject(new Error("The selected image is invalid."));
          return;
        }

        const scale = Math.min(
          PROFILE_IMAGE_DIMENSION / originalWidth,
          PROFILE_IMAGE_DIMENSION / originalHeight,
          1
        );

        const width = Math.max(1, Math.round(originalWidth * scale));
        const height = Math.max(1, Math.round(originalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Image processing is not supported."));
          return;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not prepare the selected image."));
              return;
            }

            resolve(blob);
          },
          "image/webp",
          0.82
        );
      };

      image.src = String(reader.result || "");
    };

    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const editSectionRef = useRef(null);
  const avatarInputRef = useRef(null);

  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    apartment_name: "",
    block: "",
    flat_no: "",
    flat: "",
    seller_kitchen_name: "",
    seller_door_no: "",
    seller_specialty: "",
    seller_about: "",
    accept_scheduled_orders: true,
    delivery_available: true,
    pickup_available: true,
    bank_account_holder: "",
    bank_name: "",
    bank_account_number: "",
    bank_upi_id: "",
  });

  const [originalFormData, setOriginalFormData] = useState(null);
  const [role, setRole] = useState("customer");
  const [isSeller, setIsSeller] = useState(false);
  const [bankDetailsCompleted, setBankDetailsCompleted] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarMessage, setAvatarMessage] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const isAdmin = role === "admin";
  const displayedAvatar = pendingAvatarPreview || avatarUrl;
  const avatarBusy = avatarUploading || avatarRemoving;

  const profileChanged =
    originalFormData &&
    JSON.stringify(formData) !== JSON.stringify(originalFormData);

  const currentBankDetailsComplete = Boolean(
    formData.bank_account_holder?.trim() &&
      formData.bank_name?.trim() &&
      formData.bank_account_number?.trim()
  );

  const effectiveBankDetailsComplete = isAdmin
    ? true
    : currentBankDetailsComplete;

  const sellerOnboardingComplete =
    isSeller &&
    (isAdmin ||
      (bankDetailsCompleted === true && currentBankDetailsComplete === true));

  const sellerProgress = isAdmin
    ? 100
    : isSeller
    ? Math.round(
        ([
          true,
          currentBankDetailsComplete,
          Boolean(formData.seller_kitchen_name?.trim()),
          Boolean(formData.seller_specialty?.trim()),
          Boolean(formData.seller_about?.trim()),
        ].filter(Boolean).length /
          5) *
          100
      )
    : 0;

  const displayName = useMemo(() => {
    return (
      formData.full_name?.trim() ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "NeFo User"
    );
  }, [formData.full_name, user]);

  const displayEmail = user?.email || "";

  const displayPhone = useMemo(() => {
    return (
      formData.phone?.trim() ||
      user?.phone ||
      user?.user_metadata?.phone ||
      ""
    );
  }, [formData.phone, user]);

  const addressLines = useMemo(() => {
    const apartment = formData.apartment_name?.trim();
    const doorNumber =
      formData.flat_no?.trim() || formData.flat?.trim();

    const lineOne = apartment || "No address added";
    const lineTwo = doorNumber
      ? `Door / Flat ${doorNumber}`
      : "";

    return {
      lineOne,
      lineTwo,
    };
  }, [formData]);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
      }
    };
  }, [pendingAvatarPreview]);

  async function fetchProfile() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");
    setAvatarMessage("");
    setFormMessage("");
    setPasswordMessage("");
    setAvatarError("");

    const defaultProfile = {
      full_name: user?.user_metadata?.full_name || "",
      phone: user?.phone || user?.user_metadata?.phone || "",
      apartment_name: user?.user_metadata?.apartment_name || "",
      block: "",
      flat_no:
        user?.user_metadata?.flat_no ||
        user?.user_metadata?.flat ||
        "",
      flat:
        user?.user_metadata?.flat ||
        user?.user_metadata?.flat_no ||
        "",
      seller_kitchen_name: "",
      seller_door_no:
        user?.user_metadata?.seller_door_no ||
        user?.user_metadata?.flat_no ||
        user?.user_metadata?.flat ||
        "",
      seller_specialty: "",
      seller_about: "",
      accept_scheduled_orders: true,
      delivery_available: true,
      pickup_available: true,
      bank_account_holder: "",
      bank_name: "",
      bank_account_number: "",
        bank_upi_id: "",
    };

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "role, is_seller, full_name, phone, apartment_name, block, flat_no, flat, avatar_url, seller_kitchen_name, seller_door_no, seller_specialty, seller_about, accept_scheduled_orders, delivery_available, pickup_available, seller_application_status, bank_account_holder, bank_name, bank_account_number, bank_upi_id, bank_details_completed"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setMessage(`Could not load profile: ${error.message}`);
      setAvatarUrl(user?.user_metadata?.avatar_url || "");
      setFormData(defaultProfile);
      setOriginalFormData(defaultProfile);
      setLoading(false);
      return;
    }

    const profileRole = String(
      data?.role || user?.user_metadata?.role || "customer"
    )
      .trim()
      .toLowerCase();

    const applicationStatus = String(
      data?.seller_application_status || "not_applied"
    )
      .trim()
      .toLowerCase();

    const sellerAllowed =
      profileRole === "admin" ||
      (profileRole === "seller" &&
        data?.is_seller === true &&
        applicationStatus === "approved");

    setRole(profileRole || "customer");
    setIsSeller(sellerAllowed);

    setBankDetailsCompleted(
      profileRole === "admin" || data?.bank_details_completed === true
    );

    setAvatarUrl(data?.avatar_url || user?.user_metadata?.avatar_url || "");

    const loadedProfile = {
      full_name: data?.full_name || user?.user_metadata?.full_name || "",
      phone:
        data?.phone ||
        user?.phone ||
        user?.user_metadata?.phone ||
        "",
      apartment_name:
        data?.apartment_name ||
        user?.user_metadata?.apartment_name ||
        "",
      block: "",
      flat_no:
        data?.flat_no ||
        data?.flat ||
        data?.seller_door_no ||
        user?.user_metadata?.flat_no ||
        user?.user_metadata?.flat ||
        "",
      flat:
        data?.flat ||
        data?.flat_no ||
        data?.seller_door_no ||
        user?.user_metadata?.flat ||
        user?.user_metadata?.flat_no ||
        "",
      seller_kitchen_name: data?.seller_kitchen_name || "",
      seller_door_no:
        data?.seller_door_no ||
        data?.flat_no ||
        data?.flat ||
        "",
      seller_specialty: data?.seller_specialty || "",
      seller_about: data?.seller_about || "",
      accept_scheduled_orders: data?.accept_scheduled_orders !== false,
      delivery_available: data?.delivery_available !== false,
      pickup_available: data?.pickup_available !== false,
      bank_account_holder: data?.bank_account_holder || "",
      bank_name: data?.bank_name || "",
      bank_account_number: data?.bank_account_number || "",
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
      setFormMessage(
        "At least one option must stay ON: Delivery or Self Pickup."
      );
      return;
    }

    if (
      type === "checkbox" &&
      name === "pickup_available" &&
      checked === false &&
      formData.delivery_available === false
    ) {
      setFormMessage(
        "At least one option must stay ON: Delivery or Self Pickup."
      );
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === "checkbox" ? checked : value,
    }));

    setMessage("");
    setFormMessage("");
  }

  async function handleAvatarSelection(event) {
    const selectedFile = event.target.files?.[0];

    event.target.value = "";

    if (!selectedFile) return;

    setAvatarError("");
    setAvatarMessage("");
    setMessage("");

    if (!selectedFile.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }

    if (selectedFile.size > MAX_PROFILE_IMAGE_SIZE) {
      setAvatarError("Profile photo must be smaller than 10 MB.");
      return;
    }

    try {
      const compressedBlob = await compressProfileImage(selectedFile);
      const previewUrl = URL.createObjectURL(compressedBlob);

      setPendingAvatarBlob(compressedBlob);
      setPendingAvatarPreview(previewUrl);
    } catch (error) {
      setAvatarError(
        error?.message || "Could not prepare the selected profile photo."
      );
    }
  }

  function cancelAvatarSelection() {
    setPendingAvatarBlob(null);
    setPendingAvatarPreview("");
    setAvatarError("");
  }

  async function saveProfilePhoto() {
    if (!user || !pendingAvatarBlob || avatarUploading) return;

    setAvatarUploading(true);
    setAvatarError("");
    setAvatarMessage("");
    setMessage("");

    const imagePath = `${user.id}/avatar.webp`;

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .upload(imagePath, pendingAvatarBlob, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      setAvatarError(`Could not upload photo: ${uploadError.message}`);
      setAvatarUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .getPublicUrl(imagePath);

    const basePublicUrl = publicUrlData?.publicUrl || "";

    if (!basePublicUrl) {
      setAvatarError("The uploaded profile photo URL could not be created.");
      setAvatarUploading(false);
      return;
    }

    const versionedAvatarUrl = `${basePublicUrl}${
      basePublicUrl.includes("?") ? "&" : "?"
    }v=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          avatar_url: versionedAvatarUrl,
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      setAvatarError(`Could not save profile photo: ${profileError.message}`);
      setAvatarUploading(false);
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        avatar_url: versionedAvatarUrl,
      },
    });

    if (metadataError) {
      setAvatarError(
        `Photo uploaded, but account metadata could not update: ${metadataError.message}`
      );
    }

    setAvatarUrl(versionedAvatarUrl);
    setPendingAvatarBlob(null);
    setPendingAvatarPreview("");
    setAvatarUploading(false);
    setAvatarMessage("Profile photo updated successfully.");
  }

  async function removeProfilePhoto() {
    if (!user || avatarRemoving) return;

    const confirmed = window.confirm("Remove your profile photo?");

    if (!confirmed) return;

    setAvatarRemoving(true);
    setAvatarError("");
    setAvatarMessage("");
    setMessage("");

    const imagePath = `${user.id}/avatar.webp`;

    const { error: storageError } = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .remove([imagePath]);

    if (
      storageError &&
      !String(storageError.message || "")
        .toLowerCase()
        .includes("not found")
    ) {
      setAvatarError(`Could not remove photo: ${storageError.message}`);
      setAvatarRemoving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: null,
      })
      .eq("id", user.id);

    if (profileError) {
      setAvatarError(`Could not remove profile photo: ${profileError.message}`);
      setAvatarRemoving(false);
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        avatar_url: null,
      },
    });

    if (metadataError) {
      setAvatarError(
        `Photo removed, but account metadata could not update: ${metadataError.message}`
      );
    }

    setAvatarUrl("");
    setPendingAvatarBlob(null);
    setPendingAvatarPreview("");
    setAvatarRemoving(false);
    setAvatarMessage("Profile photo removed.");
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!user) return;

    if (
      !profileChanged &&
      bankDetailsCompleted === effectiveBankDetailsComplete
    ) {
      setFormMessage("No profile changes to save.");
      return;
    }

    if (
      isSeller &&
      formData.delivery_available === false &&
      formData.pickup_available === false
    ) {
      setFormMessage(
        "At least one option must stay ON: Delivery or Self Pickup."
      );
      return;
    }

    if (isSeller && !isAdmin && !currentBankDetailsComplete) {
      setFormMessage(
        "Please complete Account Holder Name, Bank Name, and Account Number to start selling."
      );

      openEditSection();
      return;
    }

    setSaving(true);
    setMessage("");
    setFormMessage("");

    const singleDoorNumber =
      formData.flat_no.trim() || formData.flat.trim();

    const nextBankDetailsCompleted = isSeller
      ? isAdmin
        ? true
        : currentBankDetailsComplete
      : false;

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      apartment_name: formData.apartment_name.trim(),
      block: "",
      flat_no: singleDoorNumber,
      flat: singleDoorNumber,
      role,
      is_seller: isSeller,
      bank_account_holder: formData.bank_account_holder.trim(),
      bank_name: formData.bank_name.trim(),
      bank_account_number: formData.bank_account_number.trim(),
      bank_upi_id: formData.bank_upi_id.trim(),
      bank_details_completed: nextBankDetailsCompleted,
    };

    if (isSeller) {
      profilePayload.seller_kitchen_name =
        formData.seller_kitchen_name.trim();

      profilePayload.seller_door_no = singleDoorNumber;

      profilePayload.seller_specialty = formData.seller_specialty.trim();

      profilePayload.seller_about = formData.seller_about.trim();

      profilePayload.accept_scheduled_orders =
        formData.accept_scheduled_orders;

      profilePayload.delivery_available = formData.delivery_available;

      profilePayload.pickup_available = formData.pickup_available;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(profilePayload);

    if (error) {
      setFormMessage(`Could not save profile: ${error.message}`);
      setSaving(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        apartment_name: formData.apartment_name.trim(),
        block: "",
        flat_no: singleDoorNumber,
        flat: singleDoorNumber,
        role,
        avatar_url: avatarUrl || null,
      },
    });

    const savedProfile = {
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      apartment_name: formData.apartment_name.trim(),
      block: "",
      flat_no: singleDoorNumber,
      flat: singleDoorNumber,
      seller_kitchen_name: formData.seller_kitchen_name.trim(),
      seller_door_no: singleDoorNumber,
      seller_specialty: formData.seller_specialty.trim(),
      seller_about: formData.seller_about.trim(),
      accept_scheduled_orders: formData.accept_scheduled_orders,
      delivery_available: formData.delivery_available,
      pickup_available: formData.pickup_available,
      bank_account_holder: formData.bank_account_holder.trim(),
      bank_name: formData.bank_name.trim(),
      bank_account_number: formData.bank_account_number.trim(),
      bank_upi_id: formData.bank_upi_id.trim(),
    };

    setFormData(savedProfile);
    setOriginalFormData(savedProfile);
    setBankDetailsCompleted(nextBankDetailsCompleted);
    setSaving(false);
    setFormMessage("Profile updated successfully.");
  }

  async function handlePasswordReset() {
    if (!user?.email) {
      setPasswordMessage("Email not available for password reset.");
      return;
    }

    setResettingPassword(true);
    setPasswordMessage("");

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo,
    });

    if (error) {
      setPasswordMessage(`Password reset failed: ${error.message}`);
      setResettingPassword(false);
      return;
    }

    setPasswordMessage("Password reset link sent to your email.");
    setResettingPassword(false);
  }

  async function handleLogout() {
    await signOut();
    window.location.href = "/";
  }

  function getInitials() {
    const name = displayName.trim();
    const parts = name.split(" ").filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    if (name) {
      return name.charAt(0).toUpperCase();
    }

    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }

    return "N";
  }

  function openEditSection() {
    setEditMode(true);

    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function scrollToBankDetails() {
    setEditMode(true);

    setTimeout(() => {
      const bankSection = document.getElementById("seller-bank-details");

      bankSection?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-8 pb-28 text-[#181411]">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className={`w-full p-7 text-center ${PAGE_CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#CF743D] text-3xl font-black text-white">
              N
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#181411]">
              Sign in required
            </h1>

            <p className="mt-2 text-sm font-semibold text-[#6B6258]">
              Please sign in to view your profile.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl bg-[#3F5128] py-4 text-center text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-xl font-black tracking-tight text-[#3F5128]">
          My Profile
        </h1>

        {message ? (
          <div className="mb-4 rounded-2xl border border-[#D8C9B3] bg-white/90 px-4 py-3 text-sm font-bold text-[#3F5128] shadow-sm">
            {message}
          </div>
        ) : null}

        {loading ? (
          <ProfileLoading />
        ) : (
          <>
            <section className={`p-4 ${PAGE_CARD}`}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelection}
                className="hidden"
                aria-label="Choose profile photo"
              />

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarBusy}
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-visible rounded-full active:scale-95 disabled:opacity-60"
                  aria-label={
                    displayedAvatar
                      ? "Change profile photo"
                      : "Add profile photo"
                  }
                >
                  <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#CF743D] text-2xl font-black text-white shadow-[5px_5px_14px_rgba(63,81,40,0.16)]">
                    {displayedAvatar ? (
                      <img
                        src={displayedAvatar}
                        alt={`${displayName} profile`}
                        className="h-full w-full object-cover"
                        onError={() => {
                          if (!pendingAvatarPreview) {
                            setAvatarUrl("");
                          }
                        }}
                      />
                    ) : (
                      getInitials()
                    )}
                  </span>

                  <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#3F5128] text-white shadow-lg">
                    <CameraIcon />
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-black text-[#3F5128]">
                      {displayName}
                    </h2>

                    {isAdmin ? (
                      <span className="rounded-full border border-[#D8C9B3] bg-[#FFF0DF] px-2 py-1 text-[9px] font-black uppercase text-[#CF743D]">
                        Owner
                      </span>
                    ) : null}
                  </div>

                  <p className="truncate text-xs font-semibold text-[#6B6258]">
                    {displayEmail}
                  </p>

                  {displayPhone ? (
                    <p className="mt-1 text-xs font-bold text-[#6B6258]">
                      {displayPhone}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="mt-2 text-xs font-black text-[#CF743D] disabled:opacity-50"
                  >
                    {avatarUrl ? "Change Photo" : "Add Photo"}
                  </button>
                </div>
              </div>

              {avatarError ? (
                <p className="mt-4 text-sm font-black text-red-600">
                  {avatarError}
                </p>
              ) : null}

              {avatarMessage ? (
                <p className="mt-4 text-sm font-black text-[#3F5128]">
                  {avatarMessage}
                </p>
              ) : null}

              {pendingAvatarPreview ? (
                <div className="mt-4 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4">
                  <p className="text-sm font-black text-[#3F5128]">
                    New photo preview
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                    Save this photo or choose another one.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={saveProfilePhoto}
                      disabled={avatarUploading}
                      className="rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 text-xs font-black text-white active:scale-95 disabled:opacity-50"
                    >
                      {avatarUploading ? "Uploading..." : "Save Photo"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelAvatarSelection}
                      disabled={avatarUploading}
                      className="rounded-2xl border border-[#D8C9B3] bg-white py-3 text-xs font-black text-[#3F5128] active:scale-95 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : avatarUrl ? (
                <button
                  type="button"
                  onClick={removeProfilePhoto}
                  disabled={avatarRemoving}
                  className="mt-4 text-xs font-black text-red-500 disabled:opacity-50"
                >
                  {avatarRemoving ? "Removing photo..." : "Remove Photo"}
                </button>
              ) : null}
            </section>

            <section className={`mt-4 p-4 ${PAGE_CARD}`}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-sm font-black text-[#181411]">
                  Seller Details
                </h3>

                <button
                  type="button"
                  onClick={openEditSection}
                  className="text-xs font-black text-[#CF743D] active:scale-95"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-1 text-xs font-semibold leading-relaxed text-[#6B6258]">
                <p>{addressLines.lineOne}</p>

                {addressLines.lineTwo ? (
                  <p>{addressLines.lineTwo}</p>
                ) : null}
              </div>
            </section>

            {isSeller && !isAdmin && !sellerOnboardingComplete ? (
              <section className="mt-4 rounded-[24px] bg-[#3F5128] p-4 text-white shadow-lg shadow-[#3F5128]/15">
                <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                  Seller setup required
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Complete bank details
                </h2>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#CF743D]"
                    style={{
                      width: `${sellerProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-white/75">
                    {sellerProgress}% complete
                  </p>

                  <button
                    type="button"
                    onClick={scrollToBankDetails}
                    className="rounded-full bg-[#CF743D] px-4 py-2 text-xs font-black text-white"
                  >
                    Add Details
                  </button>
                </div>
              </section>
            ) : null}

            <section className={`mt-4 overflow-hidden px-4 py-1 ${PAGE_CARD}`}>
              <ProfileRow
                icon={<OrdersIcon />}
                label="My Orders"
                to="/orders"
              />

              <Divider />

              <ProfileRow
                icon={<HeartIcon />}
                label="Favorites"
                to="/favorites"
              />

              <Divider />

              <ProfileRow
                icon={<CardIcon />}
                label="Payment Methods"
                to="/payment-methods"
              />

              <Divider />

              <ProfileRow
                icon={<HelpIcon />}
                label="Help & Support"
                to="/customer-care"
              />

              <Divider />

              <ProfileRow
                icon={<LogoutIcon />}
                label="Logout"
                onClick={handleLogout}
              />
            </section>

            {isAdmin ? (
              <section className={`mt-4 overflow-hidden px-4 py-1 ${PAGE_CARD}`}>
                <div className="py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                    Owner Controls
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                    Manage NeFo operations, accounting, and sellers.
                  </p>
                </div>

                <Divider />

                <ProfileRow
                  icon={<OrdersIcon />}
                  label="Owner Dashboard"
                  to="/owner-dashboard"
                />

                <Divider />

                <ProfileRow
                  icon={<CardIcon />}
                  label="Owner Accounting"
                  to="/owner-accounting"
                />

                <Divider />

                <ProfileRow
                  icon={<KitchenIcon />}
                  label="Seller Applications"
                  to="/owner-seller-applications"
                />

                <Divider />

                <ProfileRow
                  icon={<HelpIcon />}
                  label="Support Tickets"
                  to="/owner-support-tickets"
                />

                <Divider />

                <ProfileRow
                  icon={<CardIcon />}
                  label="Commission Settings"
                  to="/owner-commission-settings"
                />
              </section>
            ) : null}

            {isSeller ? (
              <section className={`mt-4 overflow-hidden px-4 py-1 ${PAGE_CARD}`}>
                <ProfileRow
                  icon={<KitchenIcon />}
                  label={
                    sellerOnboardingComplete
                      ? "Seller Dashboard"
                      : "Complete Seller Setup"
                  }
                  onClick={() => {
                    if (sellerOnboardingComplete) {
                      navigate("/seller-dashboard");
                    } else {
                      scrollToBankDetails();
                    }
                  }}
                />

                <Divider />

                <ProfileRow
                  icon={<HelpIcon />}
                  label="Seller Assistant"
                  to="/seller-helper"
                />
              </section>
            ) : null}

            {editMode ? (
              <section
                ref={editSectionRef}
                className={`mt-5 scroll-mt-5 p-4 ${PAGE_CARD}`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                      Edit Profile
                    </p>

                    <h2 className="mt-1 text-xl font-black text-[#181411]">
                      Account details
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="rounded-full bg-[#FFF0DF] px-3 py-2 text-xs font-black text-[#3F5128]"
                  >
                    Close
                  </button>
                </div>

                <form id="profile-form" onSubmit={handleSaveProfile}>
                  <FormSection title="Personal Information">
                    <InputField
                      label="Full Name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Full Name"
                    />

                    <InputField
                      label="Email"
                      value={user.email || ""}
                      disabled
                      readOnly
                      placeholder="Email"
                    />

                    <InputField
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone Number"
                    />
                  </FormSection>

                  <FormSection title="Address">
                    <InputField
                      label="Apartment / Society Name"
                      name="apartment_name"
                      value={formData.apartment_name}
                      onChange={handleChange}
                      placeholder="Green Park View"
                    />

                    <InputField
                      label="Door / Flat Number"
                      name="flat_no"
                      value={formData.flat_no}
                      onChange={handleChange}
                      placeholder="1204"
                    />
                  </FormSection>

                  {isSeller ? (
                    <>
                      <div
                        id="seller-bank-details"
                        className="scroll-mt-6"
                      />

                      <FormSection title="Seller Bank Details">
                        <div
                          className={`rounded-2xl border p-4 ${
                            isAdmin || currentBankDetailsComplete
                              ? "border-green-200 bg-green-50"
                              : "border-yellow-200 bg-yellow-50"
                          }`}
                        >
                          <p
                            className={`text-sm font-black ${
                              isAdmin || currentBankDetailsComplete
                                ? "text-green-700"
                                : "text-yellow-700"
                            }`}
                          >
                            {isAdmin
                              ? "Bank details optional for owner"
                              : currentBankDetailsComplete
                              ? "Bank details complete"
                              : "Bank details required"}
                          </p>

                          <p
                            className={`mt-1 text-xs font-semibold leading-relaxed ${
                              isAdmin || currentBankDetailsComplete
                                ? "text-green-700"
                                : "text-yellow-700"
                            }`}
                          >
                            {isAdmin
                              ? "Owner access is not blocked by missing seller payout details."
                              : "Account Holder Name, Bank Name, and Account Number are mandatory for seller payout."}
                          </p>
                        </div>

                        <InputField
                          label={
                            isAdmin
                              ? "Account Holder Name"
                              : "Account Holder Name *"
                          }
                          name="bank_account_holder"
                          value={formData.bank_account_holder}
                          onChange={handleChange}
                          required={isSeller && !isAdmin}
                          placeholder="Account Holder Name"
                        />

                        <InputField
                          label={isAdmin ? "Bank Name" : "Bank Name *"}
                          name="bank_name"
                          value={formData.bank_name}
                          onChange={handleChange}
                          required={isSeller && !isAdmin}
                          placeholder="Bank Name"
                        />

                        <InputField
                          label={
                            isAdmin ? "Account Number" : "Account Number *"
                          }
                          name="bank_account_number"
                          value={formData.bank_account_number}
                          onChange={handleChange}
                          required={isSeller && !isAdmin}
                          inputMode="numeric"
                          placeholder="Account Number"
                        />



                        <InputField
                          label="UPI ID Optional"
                          name="bank_upi_id"
                          value={formData.bank_upi_id}
                          onChange={handleChange}
                          placeholder="yourupi@bank"
                        />
                      </FormSection>

                      <FormSection title="Kitchen Profile">
                        <InputField
                          label="Kitchen / Seller Name"
                          name="seller_kitchen_name"
                          value={formData.seller_kitchen_name}
                          onChange={handleChange}
                          placeholder="Kitchen / Seller Name"
                        />

                        <InputField
                          label="Food Specialty"
                          name="seller_specialty"
                          value={formData.seller_specialty}
                          onChange={handleChange}
                          placeholder="Food Specialty"
                        />

                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
                            About Your Kitchen
                          </label>

                          <textarea
                            name="seller_about"
                            value={formData.seller_about}
                            onChange={handleChange}
                            rows="4"
                            className="w-full resize-none rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base text-[#181411] outline-none focus:border-[#CF743D]"
                            placeholder="Tell customers about your kitchen..."
                          />
                        </div>

                        <CheckField
                          name="accept_scheduled_orders"
                          checked={formData.accept_scheduled_orders}
                          onChange={handleChange}
                          title="Accept scheduled orders"
                          text="Customers can choose date and time for later orders."
                        />

                        <CheckField
                          name="delivery_available"
                          checked={formData.delivery_available}
                          onChange={handleChange}
                          title="Delivery available"
                          text="Customers can choose doorstep delivery."
                        />

                        <CheckField
                          name="pickup_available"
                          checked={formData.pickup_available}
                          onChange={handleChange}
                          title="Self pickup available"
                          text="Customers can choose self pickup."
                        />
                      </FormSection>
                    </>
                  ) : null}

                  <FormSection title="Password">
                    <p className="text-sm font-semibold leading-relaxed text-[#6B6258]">
                      We will send a secure password reset link to your
                      registered email.
                    </p>

                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={resettingPassword}
                      className="w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-sm font-black text-[#3F5128] transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {resettingPassword
                        ? "Sending..."
                        : "Send Reset Link"}
                    </button>

                    {passwordMessage ? (
                      <p className={`text-sm font-black ${
                        passwordMessage.toLowerCase().includes("failed") ||
                        passwordMessage.toLowerCase().includes("not available")
                          ? "text-red-600"
                          : "text-[#3F5128]"
                      }`}>
                        {passwordMessage}
                      </p>
                    ) : null}
                  </FormSection>

                  {formMessage ? (
                    <div className={`mt-5 rounded-2xl border p-4 ${
                      formMessage.toLowerCase().includes("could not") ||
                      formMessage.toLowerCase().includes("please") ||
                      formMessage.toLowerCase().includes("at least")
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-[#D8C9B3] bg-[#FFFDF7] text-[#3F5128]"
                    }`}>
                      <p className="text-sm font-black">{formMessage}</p>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      (!profileChanged &&
                        bankDetailsCompleted === effectiveBankDetailsComplete)
                    }
                    className={`mt-5 w-full rounded-2xl py-4 text-sm font-black transition-all active:scale-[0.98] disabled:opacity-60 ${
                      profileChanged ||
                      bankDetailsCompleted !== effectiveBankDetailsComplete
                        ? "bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                        : "cursor-not-allowed bg-[#F1E8DC] text-[#9A8E80]"
                    }`}
                  >
                    {saving
                      ? "Saving..."
                      : profileChanged ||
                        bankDetailsCompleted !== effectiveBankDetailsComplete
                      ? "Save Profile"
                      : "No Changes"}
                  </button>
                </form>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function ProfileLoading() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-[26px] bg-white/90 shadow-sm" />
      <div className="h-24 animate-pulse rounded-[24px] bg-white/90 shadow-sm" />
      <div className="h-64 animate-pulse rounded-[24px] bg-white/90 shadow-sm" />
    </div>
  );
}

function ProfileRow({ icon, label, to, onClick }) {
  const row = (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#EADFCE] bg-[#FFFDF7] text-[#3F5128]">
          {icon}
        </div>

        <span className="text-sm font-bold text-[#181411]">{label}</span>
      </div>

      <ChevronIcon />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block active:scale-[0.99]">
        {row}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left active:scale-[0.99]"
    >
      {row}
    </button>
  );
}

function Divider() {
  return <div className="border-t border-[#EADFCE]" />;
}

function FormSection({ title, children }) {
  return (
    <section className="mt-5 border-t border-[#EADFCE] pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="mb-4 text-base font-black text-[#181411]">{title}</h3>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function InputField({
  label,
  className = "",
  value,
  onChange,
  disabled,
  readOnly,
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
        {label}
      </label>

      <input
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full rounded-2xl border border-[#D8C9B3] px-4 py-4 text-base outline-none focus:border-[#CF743D] ${
          disabled
            ? "cursor-not-allowed bg-[#F1E8DC] text-[#6B6258]"
            : "bg-[#FFFDF7] text-[#181411]"
        } ${className}`}
        {...props}
      />
    </div>
  );
}

function CheckField({ name, checked, onChange, title, text }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 accent-[#CF743D]"
      />

      <div>
        <p className="text-sm font-black text-[#181411]">{title}</p>

        <p className="mt-1 text-xs font-semibold leading-relaxed text-[#6B6258]">
          {text}
        </p>
      </div>
    </label>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-[#9A8E80]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 3h10l1 4H6l1-4z" />
      <path d="M6 7h12v14H6z" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.8-2.5 2-2.5 4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 3v18" />
    </svg>
  );
}

function KitchenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 10h16" />
      <path d="M5 10l1 10h12l1-10" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
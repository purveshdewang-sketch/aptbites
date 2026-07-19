import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-black text-[#181411] outline-none focus:border-[#CF743D] focus:bg-white";

const GLOBAL_SETTING_KEY = "seller_commission_percent";
const DEFAULT_COMMISSION_PERCENT = 10;

export default function OwnerCommissionSettings() {
  const navigate = useNavigate();

  const [globalCommissionPercent, setGlobalCommissionPercent] = useState(
    String(DEFAULT_COMMISSION_PERCENT)
  );
  const [originalGlobalCommissionPercent, setOriginalGlobalCommissionPercent] =
    useState(String(DEFAULT_COMMISSION_PERCENT));

  const [sellers, setSellers] = useState([]);
  const [sellerCommissionMap, setSellerCommissionMap] = useState({});
  const [originalSellerCommissionMap, setOriginalSellerCommissionMap] =
    useState({});

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchCommissionSettings();
  }, []);

  async function fetchCommissionSettings() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const [globalResult, sellersResult, sellerSettingsResult] =
      await Promise.all([
        supabase
          .from("platform_settings")
          .select("setting_value")
          .eq("setting_key", GLOBAL_SETTING_KEY)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select("id, full_name, email, phone, seller_kitchen_name, role, is_seller, seller_application_status")
          .or("role.eq.seller,role.eq.admin,is_seller.eq.true")
          .order("seller_kitchen_name", { ascending: true }),

        supabase
          .from("seller_commission_settings")
          .select("seller_id, commission_percent"),
      ]);

    if (globalResult.error) {
      setErrorMessage(globalResult.error.message);
      setLoading(false);
      return;
    }

    if (sellersResult.error) {
      setErrorMessage(sellersResult.error.message);
      setLoading(false);
      return;
    }

    if (sellerSettingsResult.error) {
      setErrorMessage(sellerSettingsResult.error.message);
      setLoading(false);
      return;
    }

    const globalValue =
      globalResult.data?.setting_value !== undefined &&
      globalResult.data?.setting_value !== null
        ? String(Number(globalResult.data.setting_value))
        : String(DEFAULT_COMMISSION_PERCENT);

    const nextSellerMap = {};

    (sellerSettingsResult.data || []).forEach((row) => {
      nextSellerMap[row.seller_id] = String(Number(row.commission_percent));
    });

    setGlobalCommissionPercent(globalValue);
    setOriginalGlobalCommissionPercent(globalValue);
    setSellers(sellersResult.data || []);
    setSellerCommissionMap(nextSellerMap);
    setOriginalSellerCommissionMap(nextSellerMap);
    setLoading(false);
  }

  function getCleanPercent(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) return null;

    return Math.max(0, Math.min(100, numberValue));
  }

  function getSellerName(seller) {
    return (
      seller.seller_kitchen_name ||
      seller.full_name ||
      seller.email ||
      "Unnamed seller"
    );
  }

  function getSellerCurrentValue(sellerId) {
    return sellerCommissionMap[sellerId] ?? "";
  }

  function getEffectiveSellerCommission(sellerId) {
    const sellerValue = getSellerCurrentValue(sellerId);

    if (sellerValue !== "") {
      return Number(sellerValue);
    }

    return Number(globalCommissionPercent || DEFAULT_COMMISSION_PERCENT);
  }

  function updateSellerDraft(sellerId, value) {
    setSellerCommissionMap((current) => ({
      ...current,
      [sellerId]: value,
    }));

    setMessage("");
    setErrorMessage("");
  }

  async function saveGlobalCommission(event) {
    event.preventDefault();

    const cleanValue = getCleanPercent(globalCommissionPercent);

    if (cleanValue === null) {
      setErrorMessage("Enter a valid global commission percentage.");
      return;
    }

    setSavingKey("global");
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("platform_settings").upsert(
      {
        setting_key: GLOBAL_SETTING_KEY,
        setting_value: cleanValue,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "setting_key",
      }
    );

    if (error) {
      setErrorMessage(error.message);
      setSavingKey("");
      return;
    }

    const savedValue = String(cleanValue);

    setGlobalCommissionPercent(savedValue);
    setOriginalGlobalCommissionPercent(savedValue);
    setMessage(`Global seller commission updated to ${cleanValue}%.`);
    setSavingKey("");
  }

  async function saveSellerCommission(seller) {
    const draftValue = getSellerCurrentValue(seller.id);
    const cleanValue = getCleanPercent(draftValue);

    if (draftValue === "" || cleanValue === null) {
      setErrorMessage("Enter a valid seller commission percentage.");
      return;
    }

    setSavingKey(seller.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("seller_commission_settings").upsert(
      {
        seller_id: seller.id,
        commission_percent: cleanValue,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "seller_id",
      }
    );

    if (error) {
      setErrorMessage(error.message);
      setSavingKey("");
      return;
    }

    setSellerCommissionMap((current) => ({
      ...current,
      [seller.id]: String(cleanValue),
    }));

    setOriginalSellerCommissionMap((current) => ({
      ...current,
      [seller.id]: String(cleanValue),
    }));

    setMessage(`${getSellerName(seller)} commission set to ${cleanValue}%.`);
    setSavingKey("");
  }

  async function useGlobalForSeller(seller) {
    setSavingKey(`${seller.id}-reset`);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("seller_commission_settings")
      .delete()
      .eq("seller_id", seller.id);

    if (error) {
      setErrorMessage(error.message);
      setSavingKey("");
      return;
    }

    setSellerCommissionMap((current) => {
      const next = { ...current };
      delete next[seller.id];
      return next;
    });

    setOriginalSellerCommissionMap((current) => {
      const next = { ...current };
      delete next[seller.id];
      return next;
    });

    setMessage(`${getSellerName(seller)} now uses global commission.`);
    setSavingKey("");
  }

  const filteredSellers = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();

    return sellers.filter((seller) => {
      const isApprovedSeller =
        String(seller.role || "").toLowerCase() === "seller" ||
        seller.is_seller === true ||
        String(seller.role || "").toLowerCase() === "admin";

      if (!isApprovedSeller) return false;

      if (!cleanSearch) return true;

      return [
        seller.seller_kitchen_name,
        seller.full_name,
        seller.email,
        seller.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(cleanSearch);
    });
  }, [sellers, searchText]);

  const cleanGlobalValue = getCleanPercent(globalCommissionPercent);
  const previewSubtotal = 100;
  const previewCommission =
    cleanGlobalValue === null
      ? 0
      : Math.round(previewSubtotal * (cleanGlobalValue / 100));
  const previewSellerPayout = Math.max(previewSubtotal - previewCommission, 0);

  const globalHasChanges =
    String(globalCommissionPercent).trim() !==
    String(originalGlobalCommissionPercent).trim();

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
              Owner Settings
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Seller-wise
              <span className="block text-[#181411]">commission</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Set one global commission, or override commission for individual sellers.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <Link
            to="/owner-dashboard"
            className="rounded-2xl border border-[#D8C9B3] bg-white px-4 py-4 text-center text-sm font-black text-[#3F5128] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Owner Dashboard
          </Link>

          <Link
            to="/owner-accounting"
            className="rounded-2xl border border-[#CF743D] bg-[#CF743D] px-4 py-4 text-center text-sm font-black text-white shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Accounting
          </Link>
        </section>

        {loading ? (
          <section className={`mt-5 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-14 w-14 animate-spin items-center justify-center rounded-full border-4 border-[#EADFCE] border-t-[#3F5128]" />

            <p className="mt-4 font-bold text-[#6B6258]">
              Loading seller commission settings...
            </p>
          </section>
        ) : (
          <>
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

            <form onSubmit={saveGlobalCommission} className={`mt-5 p-5 ${CARD}`}>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Default Commission
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Global rate
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                Sellers without a custom rate will use this default commission.
              </p>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
                  Global Commission %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalCommissionPercent}
                  onChange={(event) => {
                    setGlobalCommissionPercent(event.target.value);
                    setMessage("");
                    setErrorMessage("");
                  }}
                  className={INPUT}
                  placeholder="10"
                />
              </div>

              <button
                type="submit"
                disabled={savingKey === "global" || !globalHasChanges}
                className="mt-5 w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingKey === "global"
                  ? "Saving..."
                  : globalHasChanges
                  ? "Save Global Commission"
                  : "No Global Changes"}
              </button>
            </form>

            <section className="mt-5 rounded-[28px] border border-[#3F5128] bg-[#3F5128] p-5 text-white shadow-xl shadow-[#3F5128]/15">
              <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                Global Preview
              </p>

              <h2 className="mt-1 text-2xl font-black">
                For ₹100 food sales
              </h2>

              <div className="mt-5 space-y-3">
                <PreviewRow label="Seller food earning" value="₹100" />
                <PreviewRow
                  label={`NeFo commission (${cleanGlobalValue ?? 0}%)`}
                  value={`₹${previewCommission}`}
                />
                <PreviewRow
                  label="Seller payout"
                  value={`₹${previewSellerPayout}`}
                />
              </div>
            </section>

            <section className={`mt-5 p-5 ${CARD}`}>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Seller Overrides
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Individual seller rates
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                Leave a seller blank to use the global commission. Save a number to create a seller-specific override.
              </p>

              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className={`${INPUT} mt-5`}
                placeholder="Search seller or kitchen..."
              />

              {filteredSellers.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-5 text-center">
                  <p className="text-sm font-bold text-[#6B6258]">
                    No approved sellers found.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {filteredSellers.map((seller) => {
                    const sellerDraftValue = getSellerCurrentValue(seller.id);
                    const originalValue =
                      originalSellerCommissionMap[seller.id] ?? "";
                    const sellerHasChanges =
                      String(sellerDraftValue).trim() !==
                      String(originalValue).trim();
                    const effectiveCommission = getEffectiveSellerCommission(
                      seller.id
                    );
                    const hasCustomCommission = sellerDraftValue !== "";

                    return (
                      <article
                        key={seller.id}
                        className="rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-black text-[#3F5128]">
                              {getSellerName(seller)}
                            </h3>

                            <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                              {[seller.email, seller.phone]
                                .filter(Boolean)
                                .join(" • ") || "No contact"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${
                              hasCustomCommission
                                ? "border-[#CF743D] bg-[#FFF0DF] text-[#CF743D]"
                                : "border-[#D8C9B3] bg-white text-[#6B6258]"
                            }`}
                          >
                            {hasCustomCommission ? "custom" : "global"}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                          <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
                              Seller Commission %
                            </label>

                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={sellerDraftValue}
                              onChange={(event) =>
                                updateSellerDraft(seller.id, event.target.value)
                              }
                              className={INPUT}
                              placeholder={`Global ${globalCommissionPercent}%`}
                            />
                          </div>

                          <div className="rounded-2xl border border-[#D8C9B3] bg-white p-4">
                            <p className="text-xs font-black uppercase text-[#6B6258]">
                              Effective commission
                            </p>

                            <p className="mt-1 text-2xl font-black text-[#3F5128]">
                              {effectiveCommission}%
                            </p>

                            <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                              For ₹100 food sales, NeFo gets ₹
                              {Math.round(100 * (effectiveCommission / 100))} and seller gets ₹
                              {100 - Math.round(100 * (effectiveCommission / 100))}.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => saveSellerCommission(seller)}
                            disabled={savingKey === seller.id || !sellerHasChanges}
                            className="rounded-2xl border border-[#3F5128] bg-[#3F5128] px-5 py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingKey === seller.id
                              ? "Saving..."
                              : sellerHasChanges
                              ? "Save Seller Rate"
                              : "No Seller Changes"}
                          </button>

                          <button
                            type="button"
                            onClick={() => useGlobalForSeller(seller)}
                            disabled={
                              savingKey === `${seller.id}-reset` ||
                              !hasCustomCommission
                            }
                            className="rounded-2xl border border-[#D8C9B3] bg-white px-5 py-4 font-black text-[#3F5128] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingKey === `${seller.id}-reset`
                              ? "Resetting..."
                              : "Use Global Rate"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
      <p className="text-sm font-bold text-white/75">{label}</p>
      <p className="shrink-0 text-lg font-black text-[#F3C06E]">{value}</p>
    </div>
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

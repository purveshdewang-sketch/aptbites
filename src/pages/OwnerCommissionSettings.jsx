import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-black text-[#181411] outline-none focus:border-[#CF743D] focus:bg-white";

const SETTING_KEY = "seller_commission_percent";
const DEFAULT_COMMISSION_PERCENT = 10;

export default function OwnerCommissionSettings() {
  const navigate = useNavigate();

  const [commissionPercent, setCommissionPercent] = useState(
    String(DEFAULT_COMMISSION_PERCENT)
  );
  const [originalCommissionPercent, setOriginalCommissionPercent] = useState(
    String(DEFAULT_COMMISSION_PERCENT)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchCommissionSetting();
  }, []);

  async function fetchCommissionSetting() {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", SETTING_KEY)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const value =
      data?.setting_value !== undefined && data?.setting_value !== null
        ? String(Number(data.setting_value))
        : String(DEFAULT_COMMISSION_PERCENT);

    setCommissionPercent(value);
    setOriginalCommissionPercent(value);
    setLoading(false);
  }

  function getCleanCommissionValue() {
    const value = Number(commissionPercent);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
  }

  async function saveCommissionSetting(event) {
    event.preventDefault();

    const cleanValue = getCleanCommissionValue();

    if (cleanValue === null) {
      setErrorMessage("Enter a valid commission percentage.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("platform_settings").upsert(
      {
        setting_key: SETTING_KEY,
        setting_value: cleanValue,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "setting_key",
      }
    );

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    const savedValue = String(cleanValue);
    setCommissionPercent(savedValue);
    setOriginalCommissionPercent(savedValue);
    setMessage(`Seller commission updated to ${cleanValue}%.`);
    setSaving(false);
  }

  const cleanValue = getCleanCommissionValue();
  const previewSubtotal = 100;
  const previewCommission =
    cleanValue === null ? 0 : Math.round(previewSubtotal * (cleanValue / 100));
  const previewSellerPayout = Math.max(previewSubtotal - previewCommission, 0);
  const hasChanges =
    String(commissionPercent).trim() !== String(originalCommissionPercent).trim();

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
              Commission
              <span className="block text-[#181411]">settings</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Set the seller commission used by Owner Accounting and seller payout calculations.
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
              Loading commission setting...
            </p>
          </section>
        ) : (
          <>
            <form onSubmit={saveCommissionSetting} className={`mt-5 p-5 ${CARD}`}>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Seller Commission
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Commission percentage
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                Enter the percentage NeFo deducts from seller food earnings before payout.
              </p>

              {message ? (
                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-black text-green-700">{message}</p>
                </div>
              ) : null}

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-black text-red-600">
                    {errorMessage}
                  </p>
                </div>
              ) : null}

              <div className="mt-5">
                <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#6B6258]">
                  Commission %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={commissionPercent}
                  onChange={(event) => {
                    setCommissionPercent(event.target.value);
                    setMessage("");
                    setErrorMessage("");
                  }}
                  className={INPUT}
                  placeholder="10"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="mt-5 w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : hasChanges ? "Save Commission" : "No Changes"}
              </button>
            </form>

            <section className="mt-5 rounded-[28px] border border-[#3F5128] bg-[#3F5128] p-5 text-white shadow-xl shadow-[#3F5128]/15">
              <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                Preview
              </p>

              <h2 className="mt-1 text-2xl font-black">
                For ₹100 food sales
              </h2>

              <div className="mt-5 space-y-3">
                <PreviewRow label="Seller food earning" value="₹100" />
                <PreviewRow
                  label={`NeFo commission (${cleanValue ?? 0}%)`}
                  value={`₹${previewCommission}`}
                />
                <PreviewRow
                  label="Seller payout"
                  value={`₹${previewSellerPayout}`}
                />
              </div>
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

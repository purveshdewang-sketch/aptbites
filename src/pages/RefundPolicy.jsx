import { Link, useNavigate } from "react-router-dom";

const SUPPORT_EMAIL = "nefosupport@gmail.com";

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#BDEFE6] bg-[#FFFFF2] shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const eligibleRefunds = [
  "The order is cancelled before the kitchen starts preparation.",
  "The kitchen rejects or cannot fulfil the order.",
  "Payment is deducted but the order is not successfully placed.",
  "Wrong item, missing item, or verified quantity issue is confirmed.",
  "A valid service issue is confirmed by Nefo support.",
];

const nonRefundCases = [
  "Food preparation has already started and the customer cancels voluntarily.",
  "Customer entered incorrect delivery or contact details.",
  "Customer is unavailable during pickup or delivery coordination.",
  "Taste preference issue without a verified quality or fulfilment problem.",
];

export default function RefundPolicy() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#FFFFF2] px-4 py-4 pb-32 text-[#111827]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D7F5EF] bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
              Nefo Policy
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#073B35]">
              Refund &
              <span className="block text-[#111827]">Cancellation</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              This policy explains how cancellations and refunds are handled for
              orders placed through Nefo.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <PolicyStat label="Timeline" value="5 Days" text="After approval" />
          <PolicyStat label="Method" value="Original" text="Where possible" />
          <PolicyStat label="Required" value="Order ID" text="Keep ready" />
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            Refund Timeline
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-[#111827]">
            Refunds are processed within 5 working days
          </h2>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
            Eligible refunds will be processed within{" "}
            <span className="font-black text-[#073B35]">5 working days</span>{" "}
            from the date of approval.
          </p>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#51615D]">
            Refunds will be credited to the original payment method used during
            checkout, subject to payment gateway, UPI provider, and bank
            processing timelines.
          </p>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            Refund Eligibility
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-[#111827]">
            When a refund may apply
          </h2>

          <div className="mt-5 space-y-3">
            {eligibleRefunds.map((item) => (
              <PolicyPoint key={item} type="yes" text={item} />
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-red-200 bg-red-50 p-5 shadow-[8px_8px_22px_rgba(239,68,68,0.06),-8px_-8px_22px_rgba(255,255,255,0.95)]">
          <p className="text-xs font-black uppercase tracking-wide text-red-500">
            Non-refundable Cases
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-red-600">
            When refunds may not apply
          </h2>

          <div className="mt-5 space-y-3">
            {nonRefundCases.map((item) => (
              <PolicyPoint key={item} type="no" text={item} />
            ))}
          </div>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            Important Note
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-[#111827]">
            Food orders are time-sensitive
          </h2>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
            Because food is freshly prepared by community kitchens, refund
            eligibility depends on order status, preparation stage, seller
            response, payment status, and verification by Nefo support.
          </p>

          <div className="mt-5 rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/12 p-4">
            <p className="text-sm font-black text-[#073B35]">
              For faster resolution
            </p>

            <p className="mt-1 text-sm font-semibold leading-relaxed text-[#51615D]">
              Share your order number, payment reference, screenshots if any,
              and a clear description of the issue by email.
            </p>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-block break-all font-black text-[#073B35]"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="bg-[#073B35] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-wide text-[#41D3BD]">
              Need Help?
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Contact Nefo Support
            </h2>

            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#D7F5EF]">
              For refund or cancellation support, contact Nefo support with your
              order ID, payment reference, amount, and issue details.
            </p>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-4 inline-block break-all font-black text-[#41D3BD]"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4">
            <Link
              to="/customer-care"
              className="rounded-2xl border border-[#073B35] bg-[#073B35] py-4 text-center font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-95"
            >
              Contact Customer Care
            </Link>

            <Link
              to="/order-history"
              className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-center font-black text-[#073B35] active:scale-95"
            >
              View Order History
            </Link>
          </div>
        </section>

        <section className={`mt-5 p-4 ${SOFT_CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            Note
          </p>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
            This policy is written for Nefo’s operating flow. Legal review is
            recommended before commercial launch.
          </p>
        </section>
      </div>
    </main>
  );
}

function PolicyStat({ label, value, text }) {
  return (
    <div className="rounded-[22px] border border-[#D7F5EF] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#7A8A86]">
        {label}
      </p>

      <p className="mt-1 truncate text-lg font-black text-[#073B35]">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-bold text-[#51615D]">{text}</p>
    </div>
  );
}

function PolicyPoint({ type, text }) {
  const isRefund = type === "yes";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        isRefund
          ? "border-[#BDEFE6] bg-[#FFFFF2]"
          : "border-red-100 bg-white/80"
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
          isRefund
            ? "border-[#BDEFE6] bg-[#41D3BD]/12 text-[#073B35]"
            : "border-red-200 bg-red-50 text-red-500"
        }`}
      >
        {isRefund ? "✓" : "×"}
      </span>

      <p
        className={`text-sm font-semibold leading-relaxed ${
          isRefund ? "text-[#51615D]" : "text-red-600"
        }`}
      >
        {text}
      </p>
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
import { Link, useNavigate } from "react-router-dom";

const SUPPORT_EMAIL = "NeFosupport@gmail.com";
const UPI_ID = "cropglagroresearchan.62455967@hdfcbank";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const paymentSteps = [
  {
    title: "Choose your food",
    text:
      "Add dishes to cart, confirm delivery or self pickup, and review the final order amount before payment.",
  },
  {
    title: "Pay using UPI",
    text:
      "Use the UPI button or QR shown on checkout. The payable amount and order note are shown before you place the order.",
  },
  {
    title: "Upload proof",
    text:
      "Upload a clear payment screenshot so the seller and NeFo support can match the payment with your order.",
  },
  {
    title: "Seller confirms",
    text:
      "The seller reviews the order and payment proof before accepting and preparing your food.",
  },
];

const safetyPoints = [
  {
    icon: "🔐",
    title: "Payment proofs stay private",
    text:
      "Payment screenshots are not public. They are stored privately and shown only to the relevant customer, seller, and authorized NeFo support/owner access.",
  },
  {
    icon: "🚫",
    title: "No UPI PIN stored",
    text:
      "NeFo never asks for or stores your UPI PIN, card PIN, banking password, or net-banking login details.",
  },
  {
    icon: "👁️",
    title: "Controlled order access",
    text:
      "Order information is visible only to the customer who placed the order, the seller handling the order, and authorized NeFo support when needed.",
  },
];

const methods = [
  {
    name: "UPI Payment",
    status: "Active",
    description:
      "Recommended method for current NeFo orders. Pay through any UPI app and upload the payment screenshot during checkout.",
  },
  {
    name: "Cash / Pay on Pickup",
    status: "Seller dependent",
    description:
      "Available only where the seller allows it. Always check the checkout page for the current order’s available option.",
  },
  {
    name: "Saved Cards / Wallet",
    status: "Not active yet",
    description:
      "NeFo does not currently store saved cards or wallet details inside the app.",
  },
];

export default function PaymentMethods() {
  const navigate = useNavigate();

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
              NeFo Payments
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Payment
              <span className="block text-[#181411]">Methods</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              NeFo currently supports safe UPI-based ordering with private payment
              proof upload. We do not store your UPI PIN, card PIN, or banking
              passwords.
            </p>
          </div>
        </header>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="relative overflow-hidden bg-[#3F5128] p-5 text-white">
            <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/10" />
            <div className="absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-[#CF743D]/25" />

            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                Is my payment/data safe?
              </p>

              <h2 className="mt-2 text-2xl font-black leading-tight">
                Yes. Your payment proof and order details are protected.
              </h2>

              <p className="mt-3 text-sm font-semibold leading-relaxed text-white/80">
                NeFo keeps payment proofs private, protects personal details with
                controlled access, and ensures only the relevant customer, seller,
                or authorized owner/support access can view order information.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-4">
            <TrustPill value="Private" label="Proofs" />
            <TrustPill value="No PIN" label="Stored" />
            <TrustPill value="Secure" label="Access" />
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4">
          {methods.map((method) => (
            <article key={method.name} className={`p-5 ${CARD}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-black leading-tight text-[#181411]">
                    {method.name}
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-relaxed text-[#6B6258]">
                    {method.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black ${
                    method.status === "Active"
                      ? "border-[#BDEFE6] bg-[#EAFBF7] text-[#007660]"
                      : method.status === "Not active yet"
                      ? "border-[#EADFCE] bg-[#FFF8EC] text-[#6B6258]"
                      : "border-[#F4D6B7] bg-[#FFF0DF] text-[#B85D21]"
                  }`}
                >
                  {method.status}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className={`mt-5 p-5 ${SOFT_CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Current UPI ID
          </p>

          <h2 className="mt-1 text-xl font-black leading-tight text-[#181411]">
            Pay to NeFo’s active UPI account
          </h2>

          <div className="mt-4 rounded-2xl border border-[#EADFCE] bg-white/90 p-4">
            <p className="break-all text-base font-black text-[#3F5128]">
              {UPI_ID}
            </p>
          </div>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#6B6258]">
            Always pay from the checkout page so the amount and order reference
            remain clear. Do not share UPI PIN, OTP, or banking passwords with
            anyone.
          </p>
        </section>

        <section className="mt-5">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              How payment works
            </p>

            <h2 className="mt-1 text-2xl font-black leading-tight text-[#181411]">
              Simple checkout flow
            </h2>
          </div>

          <div className="space-y-4">
            {paymentSteps.map((step, index) => (
              <article key={step.title} className={`p-5 ${CARD}`}>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] font-black text-[#3F5128]">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-black leading-tight text-[#181411]">
                      {step.title}
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                      {step.text}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Safety checks
            </p>

            <h2 className="mt-1 text-2xl font-black leading-tight text-[#181411]">
              What NeFo protects
            </h2>
          </div>

          <div className="space-y-4">
            {safetyPoints.map((point) => (
              <article key={point.title} className={`p-5 ${CARD}`}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] text-2xl">
                    {point.icon}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-black leading-tight text-[#181411]">
                      {point.title}
                    </h3>

                    <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                      {point.text}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Payment problem?
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-[#181411]">
            We can help you verify the order
          </h2>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#6B6258]">
            If payment was deducted but the order did not move forward, keep your
            payment screenshot, UPI reference number, order amount, and order time
            ready. NeFo support can use these details to check the issue.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <Link
              to="/customer-care"
              className="rounded-2xl border border-[#3F5128] bg-[#3F5128] px-6 py-4 text-center font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-95"
            >
              Contact Customer Care
            </Link>

            <Link
              to="/orders"
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-6 py-4 text-center font-black text-[#3F5128] active:scale-95"
            >
              View Orders
            </Link>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="rounded-2xl border border-[#EADFCE] bg-white/90 px-6 py-4 text-center font-black text-[#3F5128] active:scale-95"
            >
              Email Support
            </a>
          </div>
        </section>

        <section className={`mt-5 p-4 ${SOFT_CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Note
          </p>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
            Payment availability may change depending on seller settings, order
            type, and future payment gateway integration. Always follow the
            payment instructions shown on the checkout screen.
          </p>
        </section>
      </div>
    </main>
  );
}

function TrustPill({ value, label }) {
  return (
    <div className="rounded-2xl border border-[#EADFCE] bg-[#FFFDF7] px-2 py-3 text-center">
      <p className="text-sm font-black text-[#3F5128]">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-[#6B6258]">
        {label}
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

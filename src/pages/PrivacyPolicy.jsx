import { Link, useNavigate } from "react-router-dom";

const SUPPORT_EMAIL = "NeFosupport@gmail.com";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const sections = [
  {
    title: "Information We Collect",
    text:
      "We may collect your name, phone number, email address, apartment or flat details, order details, seller profile details, payment reference details, and basic app usage information required to operate NeFo.",
  },
  {
    title: "How We Use Information",
    text:
      "We use your information to create your account, process orders, connect customers with kitchens, provide customer support, improve app reliability, prevent misuse, and maintain order records.",
  },
  {
    title: "Order and Kitchen Data",
    text:
      "Order details may be visible to relevant kitchens and support teams only for fulfilling, coordinating, and resolving orders. Kitchen details may be shown to customers as part of food listings and order handling.",
  },
  {
    title: "Location and Flat Details",
    text:
      "Apartment, tower, block, and flat details are collected for operational coordination. Exact kitchen door/location should not be shown publicly to customers unless required for order fulfilment or pickup coordination.",
  },
  {
    title: "Payments",
    text:
      "Payment processing may be handled through third-party payment or UPI providers. NeFo does not intentionally store sensitive card, banking, or UPI PIN credentials inside the app.",
  },
  {
    title: "Data Security",
    text:
      "We take reasonable measures to protect account, order, and seller information. However, no digital service can guarantee absolute security.",
  },
  {
    title: "Support and Communication",
    text:
      "We may use your contact details to communicate about orders, support requests, seller issues, refunds, cancellations, and important app updates.",
  },
  {
    title: "Contact",
    text: `For privacy-related questions, account concerns, or data correction requests, contact NeFo support by email at ${SUPPORT_EMAIL}.`,
  },
];

export default function PrivacyPolicy() {
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
              NeFo Policy
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Privacy
              <span className="block text-[#181411]">Policy</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              NeFo respects your privacy. This policy explains what information
              we collect and how it is used to operate orders, support, and
              community kitchen services.
            </p>
          </div>
        </header>

        <section className={`mt-5 p-5 ${CARD}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] text-2xl">
              🔒
            </div>

            <div>
              <p className="font-black text-[#3F5128]">
                Privacy-safe coordination
              </p>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                NeFo should avoid publicly exposing exact kitchen door/location
                details. Order and pickup coordination should happen through
                controlled app or support flows.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-4">
          {sections.map((section, index) => (
            <article key={section.title} className={`p-5 ${CARD}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] font-black text-[#3F5128]">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-black leading-tight text-[#3F5128]">
                    {section.title}
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-relaxed text-[#6B6258]">
                    {section.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="relative overflow-hidden bg-[#3F5128] p-5 text-white">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#CF743D]/20" />

            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                Need privacy help?
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Contact NeFo Support
              </h2>

              <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
                Contact support for privacy questions, account correction, order
                concerns, or data-related requests.
              </p>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-4 inline-block break-all font-black text-[#F3C06E]"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4">
            <Link
              to="/customer-care"
              className="rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-95"
            >
              Customer Care
            </Link>

            <Link
              to="/terms"
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-center font-black text-[#3F5128] active:scale-95"
            >
              Terms & Conditions
            </Link>
          </div>
        </section>

        <section className={`mt-5 p-4 ${SOFT_CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Note
          </p>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
            This policy is written for the NeFo app’s operating flow. Legal
            review is recommended before commercial launch.
          </p>
        </section>
      </div>
    </main>
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
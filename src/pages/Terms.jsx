import { Link, useNavigate } from "react-router-dom";

const SUPPORT_EMAIL = "nefosupport@gmail.com";

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#BDEFE6] bg-[#FFFFF2] shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const termsSections = [
  {
    title: "Platform Role",
    text:
      "Nefo connects customers with neighbourhood home food sellers and community kitchens. Food is prepared and supplied by individual sellers listed on the platform.",
  },
  {
    title: "Customer Responsibility",
    text:
      "Customers should review dish details, kitchen details, price, availability, ingredients, order timing, delivery type, and cancellation conditions before placing an order.",
  },
  {
    title: "Seller Responsibility",
    text:
      "Sellers are responsible for food quality, hygiene, accurate listings, stock updates, order acceptance, preparation, packaging, and timely fulfilment.",
  },
  {
    title: "Orders",
    text:
      "Order acceptance and fulfilment depend on kitchen availability, stock, preparation time, scheduled order settings, and operational conditions.",
  },
  {
    title: "Scheduled Orders",
    text:
      "Scheduled orders are subject to kitchen acceptance. A scheduled order is not guaranteed unless it is accepted and fulfilled by the relevant kitchen.",
  },
  {
    title: "Cancellations and Refunds",
    text:
      "Cancellations and refunds are governed by Nefo’s Refund & Cancellation Policy. Food orders are time-sensitive, and refund eligibility may depend on the preparation stage and verified issue.",
  },
  {
    title: "Food Safety",
    text:
      "Nefo expects sellers to follow safe and hygienic food preparation practices. Customers should exercise discretion while ordering homemade food and should review available dish and seller information.",
  },
  {
    title: "Privacy and Location",
    text:
      "Exact kitchen door/location should not be shown publicly. Order, pickup, delivery, and support coordination should happen through controlled app or support flows where possible.",
  },
  {
    title: "Account Use",
    text:
      "Users must provide accurate account information and must not misuse the platform, create fake orders, interfere with app operations, or use Nefo for unlawful activity.",
  },
  {
    title: "Support Contact",
    text: `For questions about orders, refunds, privacy, seller accounts, or platform rules, contact Nefo support by email at ${SUPPORT_EMAIL}.`,
  },
];

export default function Terms() {
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
              Terms &
              <span className="block text-[#111827]">Conditions</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              By using Nefo, you agree to these terms for using our
              neighbourhood homemade food ordering platform.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <PolicyStat
            label="Platform"
            value="Market"
            text="Customers and kitchens"
          />
          <PolicyStat
            label="Orders"
            value="Stock"
            text="Availability applies"
          />
          <PolicyStat
            label="Source"
            value="Kitchen"
            text="Listed sellers"
          />
        </section>

        <section className="mt-5 space-y-4">
          {termsSections.map((section, index) => (
            <article key={section.title} className={`p-5 ${CARD}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/12 font-black text-[#073B35]">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-black leading-tight text-[#073B35]">
                    {section.title}
                  </h2>

                  <p className="mt-3 text-sm font-semibold leading-relaxed text-[#51615D]">
                    {section.text}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            User Conduct
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-[#111827]">
            Use Nefo responsibly
          </h2>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
            Customers and sellers must use Nefo honestly and responsibly. Fake
            orders, misleading listings, false complaints, abusive behaviour, or
            misuse of payment and support systems may lead to account
            restrictions.
          </p>
        </section>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="bg-[#073B35] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-wide text-[#41D3BD]">
              Need clarification?
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Contact Nefo Support
            </h2>

            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#D7F5EF]">
              For questions about orders, refunds, privacy, seller accounts, or
              platform rules, contact Nefo support by email.
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
              to="/marketplace"
              className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-center font-black text-[#073B35] active:scale-95"
            >
              Back to Marketplace
            </Link>
          </div>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            Related Policies
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-[#111827]">
            Read before ordering
          </h2>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
            These terms should be read together with Nefo’s Refund &
            Cancellation Policy and Privacy Policy.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <Link
              to="/refund-policy"
              className="rounded-2xl border border-[#073B35] bg-[#073B35] px-6 py-4 text-center font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-95"
            >
              Refund Policy
            </Link>

            <Link
              to="/privacy-policy"
              className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] px-6 py-4 text-center font-black text-[#073B35] active:scale-95"
            >
              Privacy Policy
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
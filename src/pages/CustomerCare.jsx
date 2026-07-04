import { Link, useNavigate } from "react-router-dom";

const SUPPORT_EMAIL = "NeFosupport@gmail.com";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const quickActions = [
  {
    title: "Order Issues",
    text: "Missing, wrong item, delayed, or not received.",
    icon: "📦",
  },
  {
    title: "Payment Issues",
    text: "UPI reference, failed payment, or payment not showing.",
    icon: "💳",
  },
  {
    title: "Refund Request",
    text: "Refunds, cancellations, or payment-related refunds.",
    icon: "↩️",
  },
  {
    title: "Packing & Delivery",
    text: "Packing required, no packing, pickup, or delivery help.",
    icon: "🛍️",
  },
  {
    title: "Kitchen Help",
    text: "Seller, food listing, or kitchen-related issue.",
    icon: "🏪",
  },
  {
    title: "Account Help",
    text: "Login, password reset, profile, or phone-related help.",
    icon: "👤",
  },
];

export default function CustomerCare() {
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
              NeFo Support
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              We’re here
              <span className="block text-[#181411]">to help</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Get support for orders, payments, refunds, packing, delivery,
              seller issues, or account help.
            </p>
          </div>
        </header>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="relative overflow-hidden bg-[#3F5128] p-5 text-white">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#CF743D]/20" />

            <div className="relative z-10">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-3xl">
                  🤖
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                    Recommended
                  </p>

                  <h2 className="mt-1 text-2xl font-black">Chat with Us</h2>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-white/70">
                    Our support agent can help with order details, payment
                    status, packing choice, and issue type.
                  </p>
                </div>
              </div>

              <Link
                to="/care-agent"
                className="mt-5 block rounded-2xl border border-[#CF743D] bg-[#CF743D] py-4 text-center font-black text-white shadow-lg shadow-black/10 active:scale-[0.98]"
              >
                Start Chat
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
            >
              Email Support
            </a>

            <Link
              to="/orders"
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
            >
              Active Orders
            </Link>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <InfoTile icon="⚡" title="Fast" text="Quick chat" />
          <InfoTile icon="🔒" title="Private" text="Safe details" />
          <InfoTile icon="🕘" title="Hours" text="9 AM–9 PM" />
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Quick Actions
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#181411]">
            Choose what you need
          </h2>

          <div className="mt-5 space-y-3">
            {quickActions.map((item) => (
              <Link
                key={item.title}
                to="/care-agent"
                className={`flex items-center gap-4 p-4 active:scale-[0.99] ${SOFT_CARD}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] text-2xl">
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-black text-[#3F5128]">{item.title}</p>

                  <p className="mt-1 text-xs font-semibold leading-relaxed text-[#6B6258]">
                    {item.text}
                  </p>
                </div>

                <span className="shrink-0 text-lg font-black text-[#CF743D]">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Resolve faster
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#181411]">
            Useful links
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <Link
              to="/orders"
              className="rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-95"
            >
              View Active Orders
            </Link>

            <Link
              to="/order-history"
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-center font-black text-[#3F5128] active:scale-95"
            >
              View Order History
            </Link>

            <Link
              to="/profile"
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-center font-black text-[#3F5128] active:scale-95"
            >
              Open Profile
            </Link>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="break-all rounded-2xl border border-[#CF743D] bg-[#CF743D] px-4 py-4 text-center font-black text-white active:scale-95"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-[#9A8E80]">
            Keep your order number and UPI reference ready for faster
            resolution.
          </p>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] text-2xl">
            ✉️
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#3F5128]">
            Need email help?
          </h2>

          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#6B6258]">
            For non-urgent issues, email us with order number, UPI reference,
            screenshots, and issue details.
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-4 inline-block break-all font-black text-[#CF743D]"
          >
            {SUPPORT_EMAIL}
          </a>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Food Safety Note
          </p>

          <h2 className="mt-1 text-2xl font-black leading-tight text-[#181411]">
            NeFo connects customers with community kitchens
          </h2>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-[#6B6258]">
            NeFo connects neighbourhood customers with home food sellers. Food
            is prepared by individual kitchens. Customers should review dish
            details, ingredients, freshness, and hygiene-related information
            before ordering.
          </p>

          <div className="mt-5 rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] p-4">
            <p className="text-sm font-black text-[#3F5128]">
              Privacy-safe coordination
            </p>

            <p className="mt-1 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Exact kitchen door/location should not be shown publicly. Pickup
              and support coordination should happen through NeFo.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoTile({ icon, title, text }) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-3 text-center shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] text-xl">
        {icon}
      </div>

      <p className="mt-2 text-sm font-black text-[#3F5128]">{title}</p>

      <p className="mt-0.5 text-[10px] font-bold text-[#6B6258]">{text}</p>
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
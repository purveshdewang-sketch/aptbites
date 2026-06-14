import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const SUPPORT_EMAIL = "nefosupport@gmail.com";

export default function Terms() {
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

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                <span>📄</span>
                <span>Nefo Policy</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                Terms &
                <span className="block text-[#111827]">Conditions</span>
              </h1>

              <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed text-sm sm:text-lg">
                By using Nefo, you agree to these terms for using our
                neighbourhood homemade food ordering platform.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                  <p className="text-[#51615D] text-xs font-black uppercase">
                    Platform Type
                  </p>

                  <p className="text-[#073B35] text-2xl font-black mt-2">
                    Marketplace
                  </p>

                  <p className="text-[#51615D] text-xs mt-1">
                    Connects customers and kitchens
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                  <p className="text-[#51615D] text-xs font-black uppercase">
                    Order Basis
                  </p>

                  <p className="text-[#073B35] text-2xl font-black mt-2">
                    Availability
                  </p>

                  <p className="text-[#51615D] text-xs mt-1">
                    Stock and kitchen acceptance apply
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                  <p className="text-[#51615D] text-xs font-black uppercase">
                    Food Source
                  </p>

                  <p className="text-[#073B35] text-2xl font-black mt-2">
                    Kitchens
                  </p>

                  <p className="text-[#51615D] text-xs mt-1">
                    Prepared by listed sellers
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 space-y-4">
            {termsSections.map((section, index) => (
              <article
                key={section.title}
                className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#41D3BD]/15 text-[#073B35] font-black flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-[#073B35]">
                      {section.title}
                    </h2>

                    <p className="text-[#51615D] mt-3 leading-relaxed">
                      {section.text}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-5">
            <article className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5">
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                User Conduct
              </p>

              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                Use Nefo responsibly
              </h2>

              <p className="text-[#51615D] mt-4 leading-relaxed">
                Customers and sellers must use Nefo honestly and responsibly.
                Fake orders, misleading listings, false complaints, abusive
                behaviour, or misuse of payment and support systems may lead to
                account restrictions.
              </p>
            </article>

            <article className="bg-[#073B35] rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-[#073B35]/15 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#41D3BD]/20 blur-[70px] rounded-full" />

              <div className="relative">
                <p className="text-[#41D3BD] font-black uppercase tracking-wide text-xs">
                  Need clarification?
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                  Contact Nefo Support
                </h2>

                <p className="text-[#D7F5EF] text-sm mt-3 leading-relaxed">
                  For questions about orders, refunds, privacy, seller accounts,
                  or platform rules, contact Nefo support by email.
                </p>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-block mt-4 text-[#41D3BD] hover:text-[#55E4CF] font-black break-all"
                >
                  {SUPPORT_EMAIL}
                </a>

                <Link
                  to="/customer-care"
                  className="block mt-5 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black text-center px-6 py-4 rounded-2xl transition-all"
                >
                  Contact Customer Care
                </Link>
              </div>
            </article>
          </section>

          <section className="mt-6 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5">
            <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
              Related Policies
            </p>

            <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
              Read before ordering
            </h2>

            <p className="text-[#51615D] mt-4 leading-relaxed">
              These terms should be read together with Nefo’s Refund &
              Cancellation Policy and Privacy Policy. For policy support, email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[#073B35] font-black underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <Link
                to="/refund-policy"
                className="bg-[#073B35] hover:bg-[#0B5149] text-white font-black px-6 py-4 rounded-2xl text-center transition-all"
              >
                Refund Policy
              </Link>

              <Link
                to="/privacy-policy"
                className="border border-[#41D3BD]/45 bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#073B35] font-black px-6 py-4 rounded-2xl text-center transition-all"
              >
                Privacy Policy
              </Link>

              <Link
                to="/marketplace"
                className="border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#073B35] font-black px-6 py-4 rounded-2xl text-center transition-all"
              >
                Marketplace
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
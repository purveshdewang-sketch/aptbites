import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function CustomerCare() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <section className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
              Customer Care
            </p>

            <h1 className="text-4xl sm:text-5xl font-black mt-3 text-[#111827] leading-tight">
              Need help with Nefo?
            </h1>

            <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed">
              Contact us for order issues, seller account help, payment problems,
              refunds, cancellations, or app support.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                  📞
                </div>

                <h2 className="text-xl font-black mt-4 text-[#073B35]">
                  Phone / WhatsApp
                </h2>

                <p className="text-[#51615D] text-sm mt-2">
                  Add your support number here.
                </p>

                <a
                  href="tel:+910000000000"
                  className="inline-block mt-4 text-[#1A9F8D] font-black"
                >
                  +91 00000 00000
                </a>
              </div>

              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                  ✉️
                </div>

                <h2 className="text-xl font-black mt-4 text-[#073B35]">
                  Email Support
                </h2>

                <p className="text-[#51615D] text-sm mt-2">
                  For non-urgent issues and account support.
                </p>

                <a
                  href="mailto:support@nefo.app"
                  className="inline-block mt-4 text-[#1A9F8D] font-black"
                >
                  support@nefo.app
                </a>
              </div>

              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                  🕘
                </div>

                <h2 className="text-xl font-black mt-4 text-[#073B35]">
                  Support Hours
                </h2>

                <p className="text-[#51615D] text-sm mt-2">
                  We are available during daily food ordering hours.
                </p>

                <p className="mt-4 text-[#1A9F8D] font-black">
                  9:00 AM – 9:00 PM
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-5 mt-6">
            <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-7 shadow-lg shadow-[#073B35]/5">
              <h2 className="text-2xl font-black text-[#111827]">
                What can we help with?
              </h2>

              <div className="mt-5 space-y-3">
                {[
                  "Order not showing after checkout",
                  "Seller did not accept or prepare the order",
                  "Wrong item, missing item, or quantity issue",
                  "Refund or cancellation request",
                  "Seller dashboard or food listing problem",
                  "Login, password reset, or account issue",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4"
                  >
                    <span className="mt-0.5 text-[#41D3BD] font-black">✓</span>
                    <p className="text-[#51615D] font-semibold">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-7 shadow-lg shadow-[#073B35]/5 h-fit">
              <h2 className="text-2xl font-black text-[#111827]">
                Quick actions
              </h2>

              <div className="grid gap-3 mt-5">
                <Link
                  to="/orders"
                  className="bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black text-center py-4 rounded-2xl shadow-lg shadow-[#41D3BD]/20"
                >
                  View Active Orders
                </Link>

                <Link
                  to="/order-history"
                  className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-4 rounded-2xl"
                >
                  View Order History
                </Link>

                <Link
                  to="/profile"
                  className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-4 rounded-2xl"
                >
                  Open Profile
                </Link>
              </div>

              <p className="text-[#8AA5A0] text-xs mt-5 leading-relaxed">
                For urgent live-order issues, contact the seller directly if
                seller contact details are available on the order page.
              </p>
            </div>
          </section>

          <section className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-7 shadow-lg shadow-[#073B35]/5 mt-6">
            <h2 className="text-2xl font-black text-[#111827]">
              Food safety note
            </h2>

            <p className="text-[#51615D] mt-3 leading-relaxed">
              Nefo connects neighbourhood customers with home food sellers. Food
              is prepared by individual sellers. Customers should review seller
              details, ingredients, freshness, and hygiene-related information
              before ordering.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
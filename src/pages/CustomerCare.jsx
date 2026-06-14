import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const SUPPORT_EMAIL = "nefosupport@gmail.com";

export default function CustomerCare() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                <span>🎧</span>
                <span>Customer Care</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                Need help
                <span className="block text-[#111827]">with Nefo?</span>
              </h1>

              <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed text-sm sm:text-lg">
                Contact us for order issues, seller account help, payment
                problems, refunds, cancellations, or app support.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Link
                  to="/care-agent"
                  className="group bg-[#073B35] rounded-3xl p-5 transition-all shadow-xl shadow-[#073B35]/15"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                    🤖
                  </div>

                  <h2 className="text-xl font-black mt-4 text-white">
                    Smart Care Agent
                  </h2>

                  <p className="text-[#D7F5EF] text-sm mt-2 leading-relaxed">
                    Get instant help for orders, payments, refunds, packing, and
                    food issues.
                  </p>

                  <p className="mt-4 text-[#41D3BD] group-hover:text-[#55E4CF] font-black">
                    Open Agent
                  </p>
                </Link>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 rounded-3xl p-5 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                    ✉️
                  </div>

                  <h2 className="text-xl font-black mt-4 text-[#073B35]">
                    Email Support
                  </h2>

                  <p className="text-[#51615D] text-sm mt-2 leading-relaxed">
                    Use this for non-urgent support and account help.
                  </p>

                  <p className="mt-4 text-[#1A9F8D] group-hover:text-[#073B35] font-black break-all">
                    {SUPPORT_EMAIL}
                  </p>
                </a>

                <Link
                  to="/orders"
                  className="group bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 rounded-3xl p-5 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                    🛎️
                  </div>

                  <h2 className="text-xl font-black mt-4 text-[#073B35]">
                    Active Orders
                  </h2>

                  <p className="text-[#51615D] text-sm mt-2 leading-relaxed">
                    Check your live order status before raising a support
                    request.
                  </p>

                  <p className="mt-4 text-[#1A9F8D] group-hover:text-[#073B35] font-black">
                    View Orders
                  </p>
                </Link>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-5 mt-6">
            <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5">
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                Support Topics
              </p>

              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                What can we help with?
              </h2>

              <div className="mt-6 space-y-3">
                {[
                  "Order not showing after checkout",
                  "Kitchen did not accept or prepare the order",
                  "Wrong item, missing item, or quantity issue",
                  "Refund or cancellation request",
                  "Payment reference or UPI issue",
                  "Packing required / no packing issue",
                  "Seller dashboard or food listing problem",
                  "Login, password reset, or account issue",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4"
                  >
                    <span className="mt-0.5 text-[#073B35] font-black">✓</span>
                    <p className="text-[#51615D] font-bold">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5 h-fit">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Quick Actions
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  Resolve faster
                </h2>

                <div className="grid gap-3 mt-6">
                  <Link
                    to="/care-agent"
                    className="bg-[#073B35] hover:bg-[#0B5149] text-white font-black text-center py-4 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
                  >
                    Open Smart Care Agent
                  </Link>

                  <Link
                    to="/orders"
                    className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-4 rounded-2xl transition-all"
                  >
                    View Active Orders
                  </Link>

                  <Link
                    to="/order-history"
                    className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-4 rounded-2xl transition-all"
                  >
                    View Order History
                  </Link>

                  <Link
                    to="/profile"
                    className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black text-center py-4 rounded-2xl transition-all"
                  >
                    Open Profile
                  </Link>

                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black text-center py-4 rounded-2xl transition-all break-all"
                  >
                    Email Support
                  </a>
                </div>

                <p className="text-[#8AA5A0] text-xs mt-5 leading-relaxed">
                  For faster support, keep your order number and UPI reference
                  ready.
                </p>
              </div>

              <div className="bg-[#073B35] rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-[#073B35]/15 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#41D3BD]/20 blur-[70px] rounded-full" />

                <div className="relative">
                  <p className="text-[#41D3BD] font-black uppercase tracking-wide text-xs">
                    Smart Ticketing
                  </p>

                  <h2 className="text-2xl font-black text-white mt-2">
                    Let the care agent create your ticket
                  </h2>

                  <p className="text-[#D7F5EF] text-sm mt-3 leading-relaxed">
                    The Smart Care Agent can attach your order details, payment
                    status, packing choice, and issue type automatically.
                  </p>

                  <Link
                    to="/care-agent"
                    className="inline-block mt-5 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-5 py-3 rounded-2xl"
                  >
                    Start Smart Support
                  </Link>
                </div>
              </div>
            </aside>
          </section>

          <section className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5 mt-6">
            <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
              Food Safety Note
            </p>

            <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
              Nefo connects customers with community kitchens
            </h2>

            <p className="text-[#51615D] mt-4 leading-relaxed">
              Nefo connects neighbourhood customers with home food sellers. Food
              is prepared by individual kitchens. Customers should review dish
              details, ingredients, freshness, and hygiene-related information
              before ordering.
            </p>

            <div className="mt-5 bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
              <p className="text-[#073B35] font-black text-sm">
                Privacy-safe coordination
              </p>

              <p className="text-[#51615D] text-sm mt-1 leading-relaxed">
                Exact kitchen door/location should not be shown publicly.
                Pickup and support coordination should happen through Nefo. For
                help, email{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-[#073B35] font-black underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
} 
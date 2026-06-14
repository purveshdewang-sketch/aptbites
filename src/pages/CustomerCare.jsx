import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const SUPPORT_EMAIL = "nefosupport@gmail.com";

export default function CustomerCare() {
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

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_0.75fr] gap-8 lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>🎧</span>
                  <span>Nefo Support</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  We’re here
                  <span className="block text-[#111827]">to help</span>
                </h1>

                <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed text-sm sm:text-lg">
                  Get support for orders, payments, refunds, cancellations,
                  packing, delivery, seller issues, or account help.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/care-agent"
                    className="bg-[#073B35] hover:bg-[#0B5149] text-white font-black px-6 py-4 rounded-2xl text-center shadow-lg shadow-[#073B35]/15 transition-all"
                  >
                    Chat with Us
                  </Link>

                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-6 py-4 rounded-2xl text-center transition-all break-all"
                  >
                    Email Support
                  </a>
                </div>
              </div>

              <div className="bg-[#073B35] rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-[#073B35]/15 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#41D3BD]/20 blur-[70px] rounded-full" />

                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-3xl">
                    🤖
                  </div>

                  <p className="text-[#41D3BD] font-black uppercase tracking-wide text-xs mt-5">
                    Recommended
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                    Chat with Us
                  </h2>

                  <p className="text-[#D7F5EF] text-sm mt-3 leading-relaxed">
                    Our smart support agent can attach your order details,
                    payment status, packing choice, and issue type
                    automatically.
                  </p>

                  <Link
                    to="/care-agent"
                    className="block mt-6 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black text-center py-4 rounded-2xl transition-all"
                  >
                    Start Chat
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-5 shadow-lg shadow-[#073B35]/5">
              <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h2 className="text-xl font-black mt-4 text-[#073B35]">
                Fast response
              </h2>
              <p className="text-[#51615D] text-sm mt-2 leading-relaxed">
                Use chat for quick order, payment, refund, and packing support.
              </p>
            </div>

            <div className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-5 shadow-lg shadow-[#073B35]/5">
              <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                🔒
              </div>
              <h2 className="text-xl font-black mt-4 text-[#073B35]">
                Private support
              </h2>
              <p className="text-[#51615D] text-sm mt-2 leading-relaxed">
                Your order details are used only for support and resolution.
              </p>
            </div>

            <div className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-5 shadow-lg shadow-[#073B35]/5">
              <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                🕘
              </div>
              <h2 className="text-xl font-black mt-4 text-[#073B35]">
                Support hours
              </h2>
              <p className="text-[#1A9F8D] text-sm mt-2 font-black">
                9:00 AM – 9:00 PM
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-5 mt-6">
            <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5">
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                Quick Actions
              </p>

              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                Choose what you need
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {quickActions.map((item) => (
                  <Link
                    key={item.title}
                    to="/care-agent"
                    className="group flex items-center gap-4 bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 rounded-2xl p-4 transition-all"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl shrink-0">
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[#073B35] font-black">
                        {item.title}
                      </p>
                      <p className="text-[#51615D] text-xs mt-1 leading-relaxed">
                        {item.text}
                      </p>
                    </div>

                    <span className="text-[#1A9F8D] font-black group-hover:translate-x-1 transition-all">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5 h-fit">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Resolve faster
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  Useful links
                </h2>

                <div className="grid gap-3 mt-6">
                  <Link
                    to="/orders"
                    className="bg-[#073B35] hover:bg-[#0B5149] text-white font-black text-center py-4 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
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
                  Keep your order number and UPI reference ready for faster
                  resolution.
                </p>
              </div>

              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5">
                <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                  ✉️
                </div>

                <h2 className="text-2xl font-black text-[#073B35] mt-4">
                  Need email help?
                </h2>

                <p className="text-[#51615D] text-sm mt-3 leading-relaxed">
                  For non-urgent issues, email us with order number, UPI
                  reference, screenshots, and issue details.
                </p>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-block mt-4 text-[#1A9F8D] hover:text-[#073B35] font-black break-all"
                >
                  {SUPPORT_EMAIL}
                </a>
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
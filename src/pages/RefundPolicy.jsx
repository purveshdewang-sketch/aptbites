import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function RefundPolicy() {
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
                <span>↩️</span>
                <span>Nefo Policy</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                Refund &
                <span className="block text-[#111827]">Cancellation</span>
              </h1>

              <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed text-sm sm:text-lg">
                This policy explains how cancellations and refunds are handled
                for orders placed through Nefo.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                  <p className="text-[#51615D] text-xs font-black uppercase">
                    Refund Timeline
                  </p>

                  <p className="text-[#073B35] text-3xl font-black mt-2">
                    5 Days
                  </p>

                  <p className="text-[#51615D] text-xs mt-1">
                    Working days after approval
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                  <p className="text-[#51615D] text-xs font-black uppercase">
                    Refund Method
                  </p>

                  <p className="text-[#073B35] text-3xl font-black mt-2">
                    Original
                  </p>

                  <p className="text-[#51615D] text-xs mt-1">
                    Same payment route where possible
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                  <p className="text-[#51615D] text-xs font-black uppercase">
                    Support Required
                  </p>

                  <p className="text-[#073B35] text-3xl font-black mt-2">
                    Order ID
                  </p>

                  <p className="text-[#51615D] text-xs mt-1">
                    Keep order details ready
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-5">
            <div className="space-y-5">
              <article className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Refund Timeline
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  Refunds are processed within 5 working days
                </h2>

                <p className="text-[#51615D] mt-4 leading-relaxed">
                  Eligible refunds will be processed within{" "}
                  <span className="font-black text-[#073B35]">
                    5 working days
                  </span>{" "}
                  from the date of approval.
                </p>

                <p className="text-[#51615D] mt-3 leading-relaxed">
                  Refunds will be credited to the original payment method used
                  during checkout, subject to payment gateway, UPI provider, and
                  bank processing timelines.
                </p>
              </article>

              <article className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Refund Eligibility
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  When a refund may apply
                </h2>

                <div className="mt-5 space-y-3">
                  {eligibleRefunds.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4"
                    >
                      <span className="mt-0.5 text-[#073B35] font-black">
                        ✓
                      </span>

                      <p className="text-[#51615D] font-bold">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <aside className="space-y-5">
              <article className="bg-red-50 border border-red-200 rounded-[2rem] p-5 sm:p-6 shadow-lg shadow-red-500/5">
                <p className="text-red-500 font-black uppercase tracking-wide text-xs">
                  Non-refundable Cases
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
                  When refunds may not apply
                </h2>

                <div className="mt-5 space-y-3">
                  {nonRefundCases.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 bg-white/70 border border-red-100 rounded-2xl p-4"
                    >
                      <span className="mt-0.5 text-red-500 font-black">×</span>

                      <p className="text-red-600 font-bold">{item}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="bg-[#073B35] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/15 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#41D3BD]/20 blur-[70px] rounded-full" />

                <div className="relative">
                  <p className="text-[#41D3BD] font-black uppercase tracking-wide text-xs">
                    Need Help?
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                    Contact Customer Care
                  </h2>

                  <p className="text-[#D7F5EF] text-sm mt-3 leading-relaxed">
                    For refund or cancellation support, contact Nefo Customer
                    Care with your order ID, payment reference, amount, and issue
                    details.
                  </p>

                  <Link
                    to="/customer-care"
                    className="block mt-5 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black text-center px-6 py-4 rounded-2xl transition-all"
                  >
                    Contact Customer Care
                  </Link>
                </div>
              </article>
            </aside>
          </section>

          <section className="mt-6 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-7 shadow-lg shadow-[#073B35]/5">
            <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
              Important Note
            </p>

            <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
              Food orders are time-sensitive
            </h2>

            <p className="text-[#51615D] mt-4 leading-relaxed">
              Because food is freshly prepared by community kitchens, refund
              eligibility depends on order status, preparation stage, seller
              response, payment status, and verification by Nefo support.
            </p>

            <div className="mt-5 bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
              <p className="text-[#073B35] font-black text-sm">
                For faster resolution
              </p>

              <p className="text-[#51615D] text-sm mt-1 leading-relaxed">
                Share your order number, payment reference, screenshots if any,
                and a clear description of the issue.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
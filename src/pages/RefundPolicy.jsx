import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function RefundPolicy() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 sm:py-10 pb-24">
        <div className="max-w-4xl mx-auto">
          <section className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
              Nefo Policy
            </p>

            <h1 className="text-4xl sm:text-5xl font-black mt-3 text-[#111827]">
              Refund & Cancellation Policy
            </h1>

            <p className="text-[#51615D] mt-4 leading-relaxed">
              This policy explains how cancellations and refunds are handled for
              orders placed through Nefo.
            </p>

            <div className="mt-8 space-y-6">
              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                <h2 className="text-2xl font-black text-[#073B35]">
                  Refund Timeline
                </h2>

                <p className="text-[#51615D] mt-3 leading-relaxed">
                  Eligible refunds will be processed within{" "}
                  <span className="font-black text-[#073B35]">
                    5 working days
                  </span>{" "}
                  from the date of approval.
                </p>

                <p className="text-[#51615D] mt-3 leading-relaxed">
                  Refunds will be credited to the original payment method used
                  during checkout, subject to payment gateway and bank processing
                  timelines.
                </p>
              </div>

              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                <h2 className="text-2xl font-black text-[#073B35]">
                  Refund Eligibility
                </h2>

                <div className="mt-4 space-y-3">
                  {[
                    "The order is cancelled before the seller starts preparation.",
                    "The seller rejects or cannot fulfil the order.",
                    "Payment is deducted but the order is not successfully placed.",
                    "A valid issue is confirmed by Nefo support.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="text-[#41D3BD] font-black">✓</span>
                      <p className="text-[#51615D] font-semibold">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-3xl p-5">
                <h2 className="text-2xl font-black text-red-600">
                  When Refunds May Not Apply
                </h2>

                <p className="text-red-600 mt-3 leading-relaxed">
                  Refunds may not be applicable once food preparation has
                  started, unless the seller is unable to complete the order or
                  there is a verified service issue.
                </p>
              </div>

              <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                <h2 className="text-2xl font-black text-[#073B35]">
                  Need Help?
                </h2>

                <p className="text-[#51615D] mt-3 leading-relaxed">
                  For refund or cancellation support, contact Nefo Customer Care
                  with your order details.
                </p>

                <Link
                  to="/customer-care"
                  className="inline-block mt-5 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-6 py-3 rounded-2xl"
                >
                  Contact Customer Care
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
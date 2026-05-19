import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Terms() {
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
              Terms & Conditions
            </h1>

            <p className="text-[#51615D] mt-4 leading-relaxed">
              By using Nefo, you agree to these terms for using our
              neighbourhood homemade food ordering platform.
            </p>

            <div className="mt-8 space-y-5">
              {[
                {
                  title: "Platform Role",
                  text:
                    "Nefo connects customers with neighbourhood home food sellers. Food is prepared and supplied by individual sellers listed on the platform.",
                },
                {
                  title: "Customer Responsibility",
                  text:
                    "Customers should review dish details, seller details, price, availability, ingredients, and order timing before placing an order.",
                },
                {
                  title: "Seller Responsibility",
                  text:
                    "Sellers are responsible for food quality, hygiene, accurate listings, stock updates, order acceptance, preparation, and timely fulfilment.",
                },
                {
                  title: "Orders",
                  text:
                    "Order acceptance and fulfilment depend on seller availability, stock, preparation time, and operational conditions.",
                },
                {
                  title: "Cancellations and Refunds",
                  text:
                    "Cancellations and refunds are governed by Nefo’s Refund & Cancellation Policy.",
                },
                {
                  title: "Food Safety",
                  text:
                    "Nefo expects sellers to follow safe and hygienic food preparation practices. Customers should exercise discretion while ordering homemade food.",
                },
                {
                  title: "Account Use",
                  text:
                    "Users must provide accurate account information and must not misuse the platform, create fake orders, or interfere with app operations.",
                },
              ].map((section) => (
                <div
                  key={section.title}
                  className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5"
                >
                  <h2 className="text-2xl font-black text-[#073B35]">
                    {section.title}
                  </h2>
                  <p className="text-[#51615D] mt-3 leading-relaxed">
                    {section.text}
                  </p>
                </div>
              ))}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/refund-policy"
                  className="bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-6 py-3 rounded-2xl text-center"
                >
                  Refund Policy
                </Link>

                <Link
                  to="/customer-care"
                  className="border border-[#41D3BD]/45 bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#073B35] font-black px-6 py-3 rounded-2xl text-center"
                >
                  Customer Care
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
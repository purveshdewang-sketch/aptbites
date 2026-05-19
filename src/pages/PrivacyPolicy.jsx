import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function PrivacyPolicy() {
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
              Privacy Policy
            </h1>

            <p className="text-[#51615D] mt-4 leading-relaxed">
              Nefo respects your privacy. This policy explains the basic
              information we collect and how it is used to operate the app.
            </p>

            <div className="mt-8 space-y-5">
              {[
                {
                  title: "Information We Collect",
                  text:
                    "We may collect your name, phone number, email address, apartment or flat details, order details, seller profile details, and app usage information required to provide Nefo services.",
                },
                {
                  title: "How We Use Information",
                  text:
                    "We use your information to create your account, process orders, connect customers with sellers, provide customer support, improve app reliability, and prevent misuse.",
                },
                {
                  title: "Order and Seller Data",
                  text:
                    "Order details may be visible to relevant sellers and support teams only for fulfilling and resolving orders. Seller details may be shown to customers as part of food listings and order handling.",
                },
                {
                  title: "Payments",
                  text:
                    "Payment processing may be handled through third-party payment providers. Nefo does not intentionally store sensitive card or banking credentials inside the app.",
                },
                {
                  title: "Data Security",
                  text:
                    "We take reasonable measures to protect account and order information, but no digital service can guarantee absolute security.",
                },
                {
                  title: "Contact",
                  text:
                    "For privacy-related questions, contact Nefo Customer Care.",
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

              <Link
                to="/customer-care"
                className="inline-block bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-6 py-3 rounded-2xl"
              >
                Contact Customer Care
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
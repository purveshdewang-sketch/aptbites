import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function PrivacyPolicy() {
  const sections = [
    {
      title: "Information We Collect",
      text:
        "We may collect your name, phone number, email address, apartment or flat details, order details, seller profile details, payment reference details, and basic app usage information required to operate Nefo.",
    },
    {
      title: "How We Use Information",
      text:
        "We use your information to create your account, process orders, connect customers with kitchens, provide customer support, improve app reliability, prevent misuse, and maintain order records.",
    },
    {
      title: "Order and Kitchen Data",
      text:
        "Order details may be visible to relevant kitchens and support teams only for fulfilling, coordinating, and resolving orders. Kitchen details may be shown to customers as part of food listings and order handling.",
    },
    {
      title: "Location and Flat Details",
      text:
        "Apartment, tower, block, and flat details are collected for operational coordination. Exact kitchen door/location should not be shown publicly to customers unless required for order fulfilment or pickup coordination.",
    },
    {
      title: "Payments",
      text:
        "Payment processing may be handled through third-party payment or UPI providers. Nefo does not intentionally store sensitive card, banking, or UPI PIN credentials inside the app.",
    },
    {
      title: "Data Security",
      text:
        "We take reasonable measures to protect account, order, and seller information. However, no digital service can guarantee absolute security.",
    },
    {
      title: "Support and Communication",
      text:
        "We may use your contact details to communicate about orders, support requests, seller issues, refunds, cancellations, and important app updates.",
    },
    {
      title: "Contact",
      text:
        "For privacy-related questions, account concerns, or data correction requests, contact Nefo Customer Care.",
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
                <span>🔒</span>
                <span>Nefo Policy</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                Privacy
                <span className="block text-[#111827]">Policy</span>
              </h1>

              <p className="text-[#51615D] mt-4 max-w-2xl leading-relaxed text-sm sm:text-lg">
                Nefo respects your privacy. This policy explains the basic
                information we collect and how it is used to operate the app,
                process orders, support users, and coordinate community kitchen
                services.
              </p>

              <div className="mt-6 bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
                <p className="text-[#073B35] font-black text-sm">
                  Privacy-safe coordination
                </p>

                <p className="text-[#51615D] text-sm mt-1 leading-relaxed">
                  Nefo should avoid publicly exposing exact kitchen door/location
                  details. Order and pickup coordination should happen through
                  controlled app or support flows.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 space-y-4">
            {sections.map((section, index) => (
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

          <section className="mt-6 bg-[#073B35] rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-[#073B35]/15 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#41D3BD]/20 blur-[70px] rounded-full" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <p className="text-[#41D3BD] font-black uppercase tracking-wide text-xs">
                  Need privacy help?
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                  Contact Nefo Customer Care
                </h2>

                <p className="text-[#D7F5EF] text-sm mt-3 leading-relaxed max-w-2xl">
                  Contact support for privacy questions, account correction,
                  order concerns, or data-related requests.
                </p>
              </div>

              <Link
                to="/customer-care"
                className="bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-6 py-4 rounded-2xl text-center transition-all shrink-0"
              >
                Customer Care
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
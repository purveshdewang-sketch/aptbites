import { Link } from "react-router-dom";

export default function SellerLogin() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-10">

      <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-8 shadow-2xl">

        {/* Header */}
        <div className="text-center">
          <p className="text-yellow-400 font-semibold tracking-wide">
            Quickbites Seller Portal
          </p>

          <h1 className="text-4xl font-bold mt-3">
            Seller Sign In
          </h1>

          <p className="text-gray-400 mt-3 text-sm leading-relaxed">
            Start selling homemade food inside your apartment community.
          </p>
        </div>

        {/* Form */}
        <div className="mt-10 space-y-4">

          <input
            className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500 transition-all"
            placeholder="Phone Number"
          />

          <input
            className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500 transition-all"
            placeholder="Apartment / Flat No."
          />

          <input
            className="w-full bg-black border border-[#333] rounded-2xl px-4 py-3 outline-none focus:border-yellow-500 transition-all"
            placeholder="Kitchen / Seller Name"
          />

        </div>

        {/* Seller Features */}
        <div className="mt-8 grid grid-cols-2 gap-3">

          <div className="bg-black border border-[#2a2a2a] rounded-2xl p-4">
            <p className="text-yellow-400 text-sm font-semibold">
              Pre Orders
            </p>

            <p className="text-gray-500 text-xs mt-2">
              Accept scheduled apartment food orders.
            </p>
          </div>

          <div className="bg-black border border-[#2a2a2a] rounded-2xl p-4">
            <p className="text-yellow-400 text-sm font-semibold">
              Limited Drops
            </p>

            <p className="text-gray-500 text-xs mt-2">
              Sell limited homemade dishes daily.
            </p>
          </div>

        </div>

        {/* Button */}
        <Link
          to="/seller-dashboard"
          className="block w-full mt-8 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-2xl text-center transition-all duration-200"
        >
          Continue as Seller
        </Link>

        {/* Footer */}
        <Link
          to="/"
          className="block text-gray-500 hover:text-gray-300 text-sm mt-6 text-center transition-all"
        >
          ← Back to home
        </Link>

      </div>

    </main>
  );
}
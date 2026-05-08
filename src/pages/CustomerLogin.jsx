import { Link } from "react-router-dom";

export default function CustomerLogin() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-3xl p-8">
        <h1 className="text-3xl font-bold text-yellow-400">Customer Sign In</h1>
        <p className="text-gray-400 mt-2">Order homemade food from your apartment.</p>

        <div className="mt-8 space-y-4">
          <input className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500" placeholder="Phone number" />
          <input className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500" placeholder="Apartment / Block / Flat No." />
        </div>

        <Link
          to="/marketplace"
          className="block mt-6 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl text-center"
        >
          Sign In
        </Link>

        <Link to="/" className="block text-gray-500 text-sm mt-5 text-center">
          Back to home
        </Link>
      </div>
    </main>
  );
}
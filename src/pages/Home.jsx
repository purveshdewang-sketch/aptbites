import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-6 py-10 flex items-center justify-center">
        <section className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-yellow-400 font-semibold mb-4 tracking-wide">
              AptBites
            </p>

            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Homemade food from your own apartment.
            </h1>

            <p className="text-gray-400 mt-6 text-lg leading-relaxed">
              Order fresh meals, snacks, and specials cooked by trusted home
              chefs inside your apartment community.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                to="/marketplace"
                className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-6 py-3 rounded-2xl text-center transition-all duration-200"
              >
                Explore Food
              </Link>

              <Link
                to="/seller-login"
                className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95 font-bold px-6 py-3 rounded-2xl text-center transition-all duration-200"
              >
                Start Selling
              </Link>
            </div>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] hover:border-yellow-500/50 rounded-[2rem] p-6 shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300">
            <div className="bg-gradient-to-br from-yellow-500/20 to-black rounded-[1.5rem] p-6">
              <p className="text-sm text-yellow-400 mb-3">Today’s Special</p>

              <h2 className="text-3xl font-bold">Paneer Biryani</h2>

              <p className="text-gray-400 mt-3">By A-1204 • Ready in 20 mins</p>

              <p className="text-yellow-400 text-4xl font-bold mt-8">₹120</p>

              <Link
                to="/marketplace"
                className="block text-center mt-6 w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black py-3 rounded-2xl font-bold transition-all duration-200"
              >
                + Add
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
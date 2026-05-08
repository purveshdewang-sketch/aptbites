import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-6 sm:py-10 flex items-start md:items-center justify-center">
        <section className="max-w-6xl w-full grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <p className="text-yellow-400 font-semibold mb-3 tracking-wide text-sm sm:text-base">
              AptBites
            </p>

            <h1 className="text-[2.75rem] sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Homemade food from your own apartment.
            </h1>

            <p className="text-gray-400 mt-5 sm:mt-6 text-base sm:text-lg leading-relaxed">
              Order fresh meals, snacks, and specials cooked by trusted home
              chefs inside your apartment community.
            </p>

            <div className="grid grid-cols-1 gap-3 mt-7 sm:flex sm:flex-row sm:gap-4 sm:mt-8">
              <Link
                to="/marketplace"
                className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-5 py-3 rounded-2xl text-center transition-all duration-200"
              >
                Explore Food
              </Link>

              <Link
                to="/seller-login"
                className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95 font-bold px-5 py-3 rounded-2xl text-center transition-all duration-200"
              >
                Start Selling
              </Link>
            </div>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] hover:border-yellow-500/50 rounded-[1.75rem] p-4 sm:p-6 shadow-2xl hover:shadow-yellow-500/10 transition-all duration-300">
            <div className="bg-gradient-to-br from-yellow-500/20 to-black rounded-[1.35rem] p-5 sm:p-6">
              <p className="text-sm text-yellow-400 mb-3">Today’s Special</p>

              <h2 className="text-2xl sm:text-3xl font-bold">
                Paneer Biryani
              </h2>

              <p className="text-gray-400 mt-3 text-sm sm:text-base">
                By A-1204 • Ready in 20 mins
              </p>

              <div className="flex items-center justify-between gap-4 mt-7">
                <p className="text-yellow-400 text-3xl sm:text-4xl font-bold">
                  ₹120
                </p>

                <span className="bg-green-900/40 text-green-400 text-xs px-3 py-1 rounded-full">
                  Veg
                </span>
              </div>

              <Link
                to="/marketplace"
                className="block text-center mt-5 w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black py-3 rounded-2xl font-bold transition-all duration-200"
              >
                Explore Dish
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
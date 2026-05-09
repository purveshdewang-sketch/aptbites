import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white overflow-hidden">
        <section className="relative px-4 sm:px-6 pt-7 pb-10 sm:py-12 md:py-20">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/10 blur-[90px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/5 blur-[80px] rounded-full" />

          <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-full px-3 py-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="text-yellow-400 font-semibold text-xs tracking-wide uppercase">
                  Apartment-only homemade food
                </p>
              </div>

              <h1 className="text-[2.35rem] sm:text-5xl md:text-6xl font-black leading-[1.02] tracking-tight">
                Homemade food,
                <span className="block text-yellow-400">
                  One block away.
                </span>
              </h1>

              <p className="text-gray-400 mt-5 text-[15px] sm:text-lg leading-relaxed max-w-xl">
                Discover fresh meals, snacks, and limited food drops cooked by
                trusted home chefs inside your apartment community.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-7">
                <Link
                  to="/marketplace"
                  className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-4 py-3.5 rounded-2xl text-center transition-all duration-200 shadow-lg shadow-yellow-500/20"
                >
                  Order Food
                </Link>

                <Link
                  to="/seller-login"
                  className="border border-yellow-500/70 text-yellow-400 hover:bg-yellow-500 hover:text-black active:scale-95 font-bold px-4 py-3.5 rounded-2xl text-center transition-all duration-200"
                >
                  Sell Food
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-7">
                <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-3">
                  <p className="text-yellow-400 font-bold text-lg">Fresh</p>
                  <p className="text-gray-500 text-xs mt-1">Daily drops</p>
                </div>

                <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-3">
                  <p className="text-yellow-400 font-bold text-lg">Local</p>
                  <p className="text-gray-500 text-xs mt-1">Same building</p>
                </div>

                <div className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-3">
                  <p className="text-yellow-400 font-bold text-lg">Trusted</p>
                  <p className="text-gray-500 text-xs mt-1">Residents</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 bg-yellow-500/10 blur-2xl rounded-[2rem]" />

              <div className="relative bg-[#101010] border border-[#2a2a2a] rounded-[1.75rem] p-4 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-56 h-56 bg-yellow-500/10 blur-[80px] rounded-full" />

                <div className="relative bg-gradient-to-br from-yellow-500/10 via-[#141414] to-black rounded-[1.35rem] p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-400 font-semibold uppercase tracking-[0.18em]">
                        Community Kitchen
                      </p>

                      <h2 className="text-2xl sm:text-3xl font-black mt-3 leading-tight">
                        Fresh homemade
                        <span className="block text-yellow-400">
                          food drops daily
                        </span>
                      </h2>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-full font-semibold">
                      Live
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-7">
                    <div className="bg-black/40 border border-[#222] rounded-2xl p-3 text-center">
                      <p className="text-yellow-400 text-lg font-black">
                        25+
                      </p>
                      <p className="text-gray-500 text-[11px] mt-1">
                        Home chefs
                      </p>
                    </div>

                    <div className="bg-black/40 border border-[#222] rounded-2xl p-3 text-center">
                      <p className="text-yellow-400 text-lg font-black">
                        10 min
                      </p>
                      <p className="text-gray-500 text-[11px] mt-1">
                        Avg pickup
                      </p>
                    </div>

                    <div className="bg-black/40 border border-[#222] rounded-2xl p-3 text-center">
                      <p className="text-yellow-400 text-lg font-black">
                        Daily
                      </p>
                      <p className="text-gray-500 text-[11px] mt-1">
                        New menus
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 bg-black/40 border border-[#222] rounded-3xl p-4">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      “Order from trusted residents in your own apartment —
                      faster, fresher, and more personal than traditional
                      delivery apps.”
                    </p>
                  </div>

                  <Link
                    to="/marketplace"
                    className="block text-center mt-6 w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black py-3.5 rounded-2xl font-black transition-all duration-200 shadow-lg shadow-yellow-500/20"
                  >
                    Explore Marketplace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
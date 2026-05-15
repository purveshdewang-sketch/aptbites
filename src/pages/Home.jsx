import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0d0b09] text-white overflow-hidden">
        <section className="relative px-4 sm:px-6 pt-5 pb-24 sm:pt-8 sm:pb-14">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[90px] rounded-full" />
          <div className="absolute top-40 left-0 w-72 h-72 bg-red-500/10 blur-[110px] rounded-full" />

          <div className="relative max-w-6xl mx-auto">
            <div className="lg:hidden">
              <div className="inline-flex items-center gap-2 bg-[#171310] border border-[#2a211b] rounded-full px-4 py-2 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <p className="text-orange-300 font-black text-xs tracking-wide uppercase">
                  Homemade food nearby
                </p>
              </div>

              <h1 className="text-[2.55rem] leading-[1.02] font-black tracking-tight">
                Hungry?
                <span className="block text-orange-400">
                  Order homemade food.
                </span>
              </h1>

              <p className="text-[#b8ada4] mt-4 text-[15px] leading-relaxed">
                Fresh meals, snacks, sweets, and daily food drops from trusted
                home chefs inside your apartment community.
              </p>

              <div className="mt-6 bg-[#15110e] border border-[#2a211b] rounded-[1.75rem] p-4 shadow-2xl shadow-black/20">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0d0b09] border border-[#2a211b] rounded-2xl p-3 text-center">
                    <p className="text-2xl">🍲</p>
                    <p className="text-orange-300 text-xs font-black mt-2">
                      Meals
                    </p>
                  </div>

                  <div className="bg-[#0d0b09] border border-[#2a211b] rounded-2xl p-3 text-center">
                    <p className="text-2xl">🥪</p>
                    <p className="text-orange-300 text-xs font-black mt-2">
                      Snacks
                    </p>
                  </div>

                  <div className="bg-[#0d0b09] border border-[#2a211b] rounded-2xl p-3 text-center">
                    <p className="text-2xl">🍰</p>
                    <p className="text-orange-300 text-xs font-black mt-2">
                      Sweets
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                  <p className="text-orange-300 font-black text-sm">
                    Fresh drops available daily
                  </p>
                  <p className="text-[#9d9186] text-xs mt-1">
                    Order before items sell out.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  to="/marketplace"
                  className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-black font-black px-5 py-4 rounded-2xl text-center transition-all shadow-xl shadow-orange-500/20"
                >
                  Order Food
                </Link>

                <Link
                  to="/seller-login"
                  className="border border-[#5a3a22] bg-[#171310] text-orange-300 hover:bg-orange-500 hover:text-black active:scale-95 font-black px-5 py-4 rounded-2xl text-center transition-all"
                >
                  Sell Food
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="bg-[#15110e] border border-[#2a211b] rounded-2xl p-3">
                  <p className="text-orange-300 font-black text-sm">Fresh</p>
                  <p className="text-[#8f8379] text-xs mt-1">Daily drops</p>
                </div>

                <div className="bg-[#15110e] border border-[#2a211b] rounded-2xl p-3">
                  <p className="text-orange-300 font-black text-sm">Local</p>
                  <p className="text-[#8f8379] text-xs mt-1">Nearby homes</p>
                </div>

                <div className="bg-[#15110e] border border-[#2a211b] rounded-2xl p-3">
                  <p className="text-orange-300 font-black text-sm">Trusted</p>
                  <p className="text-[#8f8379] text-xs mt-1">Residents</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 bg-[#171310] border border-[#2a211b] rounded-full px-4 py-2 mb-6 shadow-lg shadow-black/20">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  <p className="text-orange-300 font-semibold text-xs tracking-wide uppercase">
                    neighbourhood homemade food
                  </p>
                </div>

                <h1 className="text-7xl font-black leading-[1.02] tracking-tight">
                  Homemade food,
                  <span className="block text-orange-400">
                    closer than ever.
                  </span>
                </h1>

                <p className="text-[#b8ada4] mt-5 text-xl leading-relaxed max-w-2xl">
                  Discover fresh meals, snacks, sweets, and limited food drops
                  prepared by trusted home chefs inside your apartment community.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-8 max-w-xl">
                  <Link
                    to="/marketplace"
                    className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-black font-bold px-5 py-4 rounded-2xl text-center transition-all duration-200 shadow-xl shadow-orange-500/20"
                  >
                    Order Food
                  </Link>

                  <Link
                    to="/seller-login"
                    className="border border-[#5a3a22] bg-[#171310] text-orange-300 hover:bg-orange-500 hover:text-black active:scale-95 font-bold px-5 py-4 rounded-2xl text-center transition-all duration-200"
                  >
                    Sell Food
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-9">
                  <div className="bg-[#15110e] border border-[#2a211b] rounded-[1.5rem] p-4 shadow-lg shadow-black/10">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-3 text-xl">
                      🍲
                    </div>
                    <p className="text-orange-300 font-bold text-lg">Fresh</p>
                    <p className="text-[#8f8379] text-sm mt-1">
                      Daily homemade food drops
                    </p>
                  </div>

                  <div className="bg-[#15110e] border border-[#2a211b] rounded-[1.5rem] p-4 shadow-lg shadow-black/10">
                    <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center mb-3 text-xl">
                      🏠
                    </div>
                    <p className="text-orange-300 font-bold text-lg">Local</p>
                    <p className="text-[#8f8379] text-sm mt-1">
                      Food from your apartment community
                    </p>
                  </div>

                  <div className="bg-[#15110e] border border-[#2a211b] rounded-[1.5rem] p-4 shadow-lg shadow-black/10">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/10 flex items-center justify-center mb-3 text-xl">
                      ⭐
                    </div>
                    <p className="text-orange-300 font-bold text-lg">
                      Trusted
                    </p>
                    <p className="text-[#8f8379] text-sm mt-1">
                      Prepared by verified residents
                    </p>
                  </div>
                </div>

                <div className="mt-10 bg-[#15110e]/80 border border-[#2a211b] rounded-[1.75rem] p-6 max-w-3xl shadow-2xl shadow-black/20">
                  <p className="text-orange-300 text-sm font-semibold uppercase tracking-[0.18em]">
                    Why QuickBites?
                  </p>

                  <p className="text-white text-xl font-bold mt-3 leading-relaxed">
                    Faster than delivery apps, more personal than restaurants,
                    and made right inside your neighbourhood.
                  </p>

                  <p className="text-[#9d9186] text-base mt-3 leading-relaxed">
                    No long-distance delivery, no generic menus — just real
                    food, made by people around you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0b09]/95 backdrop-blur-xl border-t border-[#2a211b] px-4 py-3">
          <Link
            to="/marketplace"
            className="block w-full bg-orange-500 active:scale-[0.98] text-black text-center font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20"
          >
            Start Ordering
          </Link>
        </div>
      </main>
    </>
  );
}
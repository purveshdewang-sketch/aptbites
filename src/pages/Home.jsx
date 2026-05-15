import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#0F0D1F] text-white overflow-hidden">
        <section className="relative px-4 sm:px-6 pt-5 pb-24 sm:pt-8 sm:pb-14">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#A77BE8]/20 blur-[95px] rounded-full" />
          <div className="absolute top-40 left-0 w-72 h-72 bg-[#55F3A5]/10 blur-[110px] rounded-full" />
          <div className="absolute bottom-0 right-20 w-80 h-80 bg-[#2B284F]/40 blur-[120px] rounded-full" />

          <div className="relative max-w-6xl mx-auto">
            <div className="lg:hidden">
              <div className="inline-flex items-center gap-2 bg-[#1B1938] border border-[#34305A] rounded-full px-4 py-2 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#55F3A5]" />
                <p className="text-[#55F3A5] font-black text-xs tracking-wide uppercase">
                  Homemade food nearby
                </p>
              </div>

              <h1 className="text-[2.55rem] leading-[1.02] font-black tracking-tight">
                Hungry?
                <span className="block text-[#A77BE8]">
                  Order homemade food.
                </span>
              </h1>

              <p className="text-[#A8A3C2] mt-4 text-[15px] leading-relaxed">
                Fresh meals, snacks, sweets, and daily food drops from trusted
                home chefs inside your apartment community.
              </p>

              <div className="mt-6 bg-[#1B1938] border border-[#34305A] rounded-[1.75rem] p-4 shadow-2xl shadow-black/20">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0F0D1F] border border-[#34305A] rounded-2xl p-3 text-center">
                    <p className="text-2xl">🍲</p>
                    <p className="text-[#A77BE8] text-xs font-black mt-2">
                      Meals
                    </p>
                  </div>

                  <div className="bg-[#0F0D1F] border border-[#34305A] rounded-2xl p-3 text-center">
                    <p className="text-2xl">🥪</p>
                    <p className="text-[#A77BE8] text-xs font-black mt-2">
                      Snacks
                    </p>
                  </div>

                  <div className="bg-[#0F0D1F] border border-[#34305A] rounded-2xl p-3 text-center">
                    <p className="text-2xl">🍰</p>
                    <p className="text-[#A77BE8] text-xs font-black mt-2">
                      Sweets
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-[#55F3A5]/10 border border-[#55F3A5]/20 rounded-2xl p-4">
                  <p className="text-[#55F3A5] font-black text-sm">
                    Fresh drops available daily
                  </p>
                  <p className="text-[#A8A3C2] text-xs mt-1">
                    Order before items sell out.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  to="/marketplace"
                  className="bg-[#55F3A5] hover:bg-[#7CFFC0] active:scale-95 text-[#0F0D1F] font-black px-5 py-4 rounded-2xl text-center transition-all shadow-xl shadow-[#55F3A5]/20"
                >
                  Order Food
                </Link>

                <Link
                  to="/seller-login"
                  className="border border-[#A77BE8]/60 bg-[#1B1938] text-[#A77BE8] hover:bg-[#A77BE8] hover:text-white active:scale-95 font-black px-5 py-4 rounded-2xl text-center transition-all"
                >
                  Sell Food
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="bg-[#1B1938] border border-[#34305A] rounded-2xl p-3">
                  <p className="text-[#A77BE8] font-black text-sm">Fresh</p>
                  <p className="text-[#A8A3C2] text-xs mt-1">Daily drops</p>
                </div>

                <div className="bg-[#1B1938] border border-[#34305A] rounded-2xl p-3">
                  <p className="text-[#A77BE8] font-black text-sm">Local</p>
                  <p className="text-[#A8A3C2] text-xs mt-1">Nearby homes</p>
                </div>

                <div className="bg-[#1B1938] border border-[#34305A] rounded-2xl p-3">
                  <p className="text-[#A77BE8] font-black text-sm">Trusted</p>
                  <p className="text-[#A8A3C2] text-xs mt-1">Residents</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 bg-[#1B1938] border border-[#34305A] rounded-full px-4 py-2 mb-6 shadow-lg shadow-black/20">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#55F3A5]" />
                  <p className="text-[#55F3A5] font-semibold text-xs tracking-wide uppercase">
                    neighbourhood homemade food
                  </p>
                </div>

                <h1 className="text-7xl font-black leading-[1.02] tracking-tight">
                  Homemade food,
                  <span className="block text-[#A77BE8]">
                    closer than ever.
                  </span>
                </h1>

                <p className="text-[#A8A3C2] mt-5 text-xl leading-relaxed max-w-2xl">
                  Discover fresh meals, snacks, sweets, and limited food drops
                  prepared by trusted home chefs inside your apartment community.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-8 max-w-xl">
                  <Link
                    to="/marketplace"
                    className="bg-[#55F3A5] hover:bg-[#7CFFC0] active:scale-95 text-[#0F0D1F] font-bold px-5 py-4 rounded-2xl text-center transition-all duration-200 shadow-xl shadow-[#55F3A5]/20"
                  >
                    Order Food
                  </Link>

                  <Link
                    to="/seller-login"
                    className="border border-[#A77BE8]/60 bg-[#1B1938] text-[#A77BE8] hover:bg-[#A77BE8] hover:text-white active:scale-95 font-bold px-5 py-4 rounded-2xl text-center transition-all duration-200"
                  >
                    Sell Food
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-9">
                  <div className="bg-[#1B1938] border border-[#34305A] rounded-[1.5rem] p-4 shadow-lg shadow-black/10">
                    <div className="w-10 h-10 rounded-2xl bg-[#55F3A5]/10 flex items-center justify-center mb-3 text-xl">
                      🍲
                    </div>
                    <p className="text-[#A77BE8] font-bold text-lg">Fresh</p>
                    <p className="text-[#A8A3C2] text-sm mt-1">
                      Daily homemade food drops
                    </p>
                  </div>

                  <div className="bg-[#1B1938] border border-[#34305A] rounded-[1.5rem] p-4 shadow-lg shadow-black/10">
                    <div className="w-10 h-10 rounded-2xl bg-[#A77BE8]/10 flex items-center justify-center mb-3 text-xl">
                      🏠
                    </div>
                    <p className="text-[#A77BE8] font-bold text-lg">Local</p>
                    <p className="text-[#A8A3C2] text-sm mt-1">
                      Food from your apartment community
                    </p>
                  </div>

                  <div className="bg-[#1B1938] border border-[#34305A] rounded-[1.5rem] p-4 shadow-lg shadow-black/10">
                    <div className="w-10 h-10 rounded-2xl bg-[#55F3A5]/10 flex items-center justify-center mb-3 text-xl">
                      ⭐
                    </div>
                    <p className="text-[#A77BE8] font-bold text-lg">
                      Trusted
                    </p>
                    <p className="text-[#A8A3C2] text-sm mt-1">
                      Prepared by verified residents
                    </p>
                  </div>
                </div>

                <div className="mt-10 bg-[#1B1938]/90 border border-[#34305A] rounded-[1.75rem] p-6 max-w-3xl shadow-2xl shadow-black/20">
                  <p className="text-[#55F3A5] text-sm font-semibold uppercase tracking-[0.18em]">
                    Why QuickBites?
                  </p>

                  <p className="text-white text-xl font-bold mt-3 leading-relaxed">
                    Faster than delivery apps, more personal than restaurants,
                    and made right inside your neighbourhood.
                  </p>

                  <p className="text-[#A8A3C2] text-base mt-3 leading-relaxed">
                    No long-distance delivery, no generic menus — just real
                    food, made by people around you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F0D1F]/95 backdrop-blur-xl border-t border-[#34305A] px-4 py-3">
          <Link
            to="/marketplace"
            className="block w-full bg-[#55F3A5] active:scale-[0.98] text-[#0F0D1F] text-center font-black py-4 rounded-2xl shadow-xl shadow-[#55F3A5]/20"
          >
            Start Ordering
          </Link>
        </div>
      </main>
    </>
  );
}
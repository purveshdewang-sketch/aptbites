import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const { user } = useAuth();

  const [isSeller, setIsSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkUserRole() {
      if (!user) {
        setIsSeller(false);
        setIsAdmin(false);
        return;
      }

      const metadataRole = String(user?.user_metadata?.role || "").toLowerCase();

      if (metadataRole === "seller") {
        setIsSeller(true);
      }

      if (metadataRole === "admin") {
        setIsAdmin(true);
        setIsSeller(true);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_seller")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setIsSeller(metadataRole === "seller" || metadataRole === "admin");
        setIsAdmin(metadataRole === "admin");
        return;
      }

      const profileRole = String(data?.role || "").toLowerCase();

      setIsAdmin(profileRole === "admin" || metadataRole === "admin");

      setIsSeller(
        profileRole === "seller" ||
          profileRole === "admin" ||
          data?.is_seller === true ||
          metadataRole === "seller" ||
          metadataRole === "admin"
      );
    }

    checkUserRole();
  }, [user]);

  const shouldShowSellFood = !user || isSeller || isAdmin;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#F0F9FF] text-[#0F172A] overflow-hidden">
        <section className="relative px-4 sm:px-6 pt-5 pb-24 sm:pt-8 sm:pb-14">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#0EA5E9]/15 blur-[95px] rounded-full" />
          <div className="absolute top-44 left-0 w-72 h-72 bg-[#0369A1]/10 blur-[110px] rounded-full" />
          <div className="absolute bottom-0 right-20 w-80 h-80 bg-white/70 blur-[120px] rounded-full" />

          <div className="relative max-w-6xl mx-auto">
            <div className="lg:hidden">
              <div className="inline-flex items-center gap-2 bg-white/80 border border-[#BAE6FD] rounded-full px-4 py-2 mb-5 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0369A1]" />
                <p className="text-[#0369A1] font-black text-xs tracking-wide uppercase">
                  Homemade food nearby
                </p>
              </div>

              <h1 className="text-[2.55rem] leading-[1.02] font-black tracking-tight text-[#0F172A]">
                Hungry?
                <span className="block text-[#0369A1]">
                  Order homemade food.
                </span>
              </h1>

              <p className="text-[#475569] mt-4 text-[15px] leading-relaxed">
                Fresh meals, snacks, sweets, and daily food drops from trusted
                home chefs inside your apartment community.
              </p>

              <div className="mt-6 bg-white/80 border border-[#BAE6FD] rounded-[1.75rem] p-4 shadow-xl shadow-[#0369A1]/10 backdrop-blur">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F8FCFF] border border-[#BAE6FD] rounded-2xl p-3 text-center shadow-sm">
                    <p className="text-2xl">🍲</p>
                    <p className="text-[#0369A1] text-xs font-black mt-2">
                      Meals
                    </p>
                  </div>

                  <div className="bg-[#F8FCFF] border border-[#BAE6FD] rounded-2xl p-3 text-center shadow-sm">
                    <p className="text-2xl">🥪</p>
                    <p className="text-[#0369A1] text-xs font-black mt-2">
                      Snacks
                    </p>
                  </div>

                  <div className="bg-[#F8FCFF] border border-[#BAE6FD] rounded-2xl p-3 text-center shadow-sm">
                    <p className="text-2xl">🍰</p>
                    <p className="text-[#0369A1] text-xs font-black mt-2">
                      Sweets
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-[#0369A1]/10 border border-[#0369A1]/20 rounded-2xl p-4">
                  <p className="text-[#0369A1] font-black text-sm">
                    Fresh drops available daily
                  </p>
                  <p className="text-[#475569] text-xs mt-1">
                    Order before items sell out.
                  </p>
                </div>
              </div>

              <div
                className={`mt-6 grid gap-3 ${
                  shouldShowSellFood ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                <Link
                  to="/marketplace"
                  className="bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] active:scale-95 text-white font-black px-5 py-4 rounded-2xl text-center transition-all shadow-xl shadow-[#0369A1]/25"
                >
                  Order Food
                </Link>

                {shouldShowSellFood && (
                  <Link
                    to="/seller-login"
                    className="border border-[#0369A1]/25 bg-white/80 text-[#0369A1] hover:bg-[#0369A1] hover:text-white active:scale-95 font-black px-5 py-4 rounded-2xl text-center transition-all shadow-sm"
                  >
                    Sell Food
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="bg-white/80 border border-[#BAE6FD] rounded-2xl p-3 shadow-sm">
                  <p className="text-[#0369A1] font-black text-sm">Fresh</p>
                  <p className="text-[#475569] text-xs mt-1">Daily drops</p>
                </div>

                <div className="bg-white/80 border border-[#BAE6FD] rounded-2xl p-3 shadow-sm">
                  <p className="text-[#0369A1] font-black text-sm">Local</p>
                  <p className="text-[#475569] text-xs mt-1">Nearby homes</p>
                </div>

                <div className="bg-white/80 border border-[#BAE6FD] rounded-2xl p-3 shadow-sm">
                  <p className="text-[#0369A1] font-black text-sm">Trusted</p>
                  <p className="text-[#475569] text-xs mt-1">Residents</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 bg-white/80 border border-[#BAE6FD] rounded-full px-4 py-2 mb-6 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0369A1]" />
                  <p className="text-[#0369A1] font-semibold text-xs tracking-wide uppercase">
                    neighbourhood homemade food
                  </p>
                </div>

                <h1 className="text-7xl font-black leading-[1.02] tracking-tight text-[#0F172A]">
                  Homemade food,
                  <span className="block text-[#0369A1]">
                    closer than ever.
                  </span>
                </h1>

                <p className="text-[#475569] mt-5 text-xl leading-relaxed max-w-2xl">
                  Discover fresh meals, snacks, sweets, and limited food drops
                  prepared by trusted home chefs inside your apartment community.
                </p>

                <div
                  className={`grid gap-3 mt-8 max-w-xl ${
                    shouldShowSellFood ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  <Link
                    to="/marketplace"
                    className="bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] active:scale-95 text-white font-bold px-5 py-4 rounded-2xl text-center transition-all duration-200 shadow-xl shadow-[#0369A1]/25"
                  >
                    Order Food
                  </Link>

                  {shouldShowSellFood && (
                    <Link
                      to="/seller-login"
                      className="border border-[#0369A1]/25 bg-white/80 text-[#0369A1] hover:bg-[#0369A1] hover:text-white active:scale-95 font-bold px-5 py-4 rounded-2xl text-center transition-all duration-200 shadow-sm"
                    >
                      Sell Food
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-9">
                  <div className="bg-white/80 border border-[#BAE6FD] rounded-[1.5rem] p-4 shadow-lg shadow-[#0369A1]/5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0369A1]/10 flex items-center justify-center mb-3 text-xl">
                      🍲
                    </div>
                    <p className="text-[#0369A1] font-bold text-lg">Fresh</p>
                    <p className="text-[#475569] text-sm mt-1">
                      Daily homemade food drops
                    </p>
                  </div>

                  <div className="bg-white/80 border border-[#BAE6FD] rounded-[1.5rem] p-4 shadow-lg shadow-[#0369A1]/5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mb-3 text-xl">
                      🏠
                    </div>
                    <p className="text-[#0369A1] font-bold text-lg">Local</p>
                    <p className="text-[#475569] text-sm mt-1">
                      Food from your apartment community
                    </p>
                  </div>

                  <div className="bg-white/80 border border-[#BAE6FD] rounded-[1.5rem] p-4 shadow-lg shadow-[#0369A1]/5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0369A1]/10 flex items-center justify-center mb-3 text-xl">
                      ⭐
                    </div>
                    <p className="text-[#0369A1] font-bold text-lg">
                      Trusted
                    </p>
                    <p className="text-[#475569] text-sm mt-1">
                      Prepared by verified residents
                    </p>
                  </div>
                </div>

                <div className="mt-10 bg-white/80 border border-[#BAE6FD] rounded-[1.75rem] p-6 max-w-3xl shadow-xl shadow-[#0369A1]/5">
                  <p className="text-[#0369A1] text-sm font-semibold uppercase tracking-[0.18em]">
                    Why QuickBites?
                  </p>

                  <p className="text-[#0F172A] text-xl font-bold mt-3 leading-relaxed">
                    Faster than delivery apps, more personal than restaurants,
                    and made right inside your neighbourhood.
                  </p>

                  <p className="text-[#475569] text-base mt-3 leading-relaxed">
                    No long-distance delivery, no generic menus — just real
                    food, made by people around you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F0F9FF]/95 backdrop-blur-xl border-t border-[#BAE6FD] px-4 py-3">
          <Link
            to="/marketplace"
            className="block w-full bg-gradient-to-r from-[#0369A1] to-[#0EA5E9] active:scale-[0.98] text-white text-center font-black py-4 rounded-2xl shadow-xl shadow-[#0369A1]/25"
          >
            Start Ordering
          </Link>
        </div>
      </main>
    </>
  );
}
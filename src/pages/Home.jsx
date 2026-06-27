import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const { user } = useAuth();

  const [isSeller, setIsSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [homeFoods, setHomeFoods] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);

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

  useEffect(() => {
    fetchHomeFoods();

    const foodsChannel = supabase
      .channel("home-foods-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchHomeFoods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
    };
  }, []);

  useEffect(() => {
    if (homeFoods.length <= 1) return;

    const interval = setInterval(() => {
      setHeroIndex((currentIndex) => (currentIndex + 1) % homeFoods.length);
    }, 4200);

    return () => clearInterval(interval);
  }, [homeFoods.length]);

  async function fetchHomeFoods() {
    const { data, error } = await supabase
      .from("foods")
      .select(
        "id, name, seller, seller_kitchen_name, price, image, category, type, stock"
      )
      .order("id", { ascending: false })
      .limit(8);

    if (error) {
      setHomeFoods([]);
      return;
    }

    const foodsWithImages = (data || []).filter((food) => food.image);

    setHomeFoods(foodsWithImages);
    setHeroIndex(0);
  }

  function getKitchenName(food) {
    return food?.seller || food?.seller_kitchen_name || "Home Kitchen";
  }

  const shouldShowSellFood = !user || isSeller || isAdmin;
  const sellFoodPath =
    user && (isSeller || isAdmin) ? "/seller-dashboard" : "/seller-login";

  const heroFood = homeFoods[heroIndex] || null;

  const trendingFoods = useMemo(() => {
    return homeFoods.slice(0, 4);
  }, [homeFoods]);

  const heroBackgroundStyle = heroFood?.image
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(7,59,53,0.96) 0%, rgba(7,59,53,0.84) 38%, rgba(7,59,53,0.42) 72%, rgba(7,59,53,0.18) 100%), url("${heroFood.image}")`,
      }
    : {
        backgroundImage:
          "linear-gradient(135deg, #073B35 0%, #0B5B51 45%, #41D3BD 100%)",
      };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] overflow-hidden pb-24 lg:pb-0">
        <section className="px-4 sm:px-6 pt-5 pb-8 sm:pt-7 sm:pb-12">
          <div className="max-w-7xl mx-auto">
            <div
              className="relative min-h-[560px] sm:min-h-[520px] lg:min-h-[560px] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-cover bg-center shadow-2xl shadow-[#073B35]/20 border border-[#D7F5EF]"
              style={heroBackgroundStyle}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/35" />
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#41D3BD]/20 rounded-full blur-[110px]" />

              <div className="relative z-10 h-full min-h-[560px] sm:min-h-[520px] lg:min-h-[560px] flex items-center">
                <div className="w-full px-5 sm:px-10 lg:px-14 py-10">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 bg-[#FFFFF2]/95 border border-white/40 rounded-full px-4 py-2 mb-6 shadow-lg shadow-black/10 backdrop-blur">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#41D3BD]" />
                      <p className="text-[#073B35] font-black text-xs tracking-wide uppercase">
                        Homemade nearby food
                      </p>
                    </div>

                    <h1 className="text-white text-[2.75rem] sm:text-6xl lg:text-7xl font-black leading-[0.98] tracking-tight drop-shadow-xl">
                      Fresh food,
                      <span className="block text-[#41D3BD]">
                        made closer to you.
                      </span>
                    </h1>

                    <p className="text-white/90 mt-5 text-base sm:text-xl leading-relaxed max-w-2xl drop-shadow">
                      Discover fresh meals, snacks, sweets, tiffins, and daily
                      food drops from trusted kitchens inside your community.
                    </p>

                    <div
                      className={`mt-8 grid gap-3 max-w-xl ${
                        shouldShowSellFood
                          ? "grid-cols-1 sm:grid-cols-2"
                          : "grid-cols-1"
                      }`}
                    >
                      <Link
                        to="/marketplace"
                        className="bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-95 text-[#073B35] font-black px-6 py-4 rounded-2xl text-center transition-all shadow-xl shadow-[#41D3BD]/25"
                      >
                        Order Food
                      </Link>

                      {shouldShowSellFood && (
                        <Link
                          to={sellFoodPath}
                          className="bg-[#FFFFF2]/95 hover:bg-white border border-white/50 active:scale-95 text-[#073B35] font-black px-6 py-4 rounded-2xl text-center transition-all shadow-xl shadow-black/10 backdrop-blur"
                        >
                          Sell Food
                        </Link>
                      )}
                    </div>

                    {heroFood && (
                      <Link
                        to={`/food/${heroFood.id}`}
                        className="mt-8 inline-flex max-w-full items-center gap-3 bg-black/25 hover:bg-black/35 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur transition-all"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-[#41D3BD] flex items-center justify-center text-[#073B35] font-black shrink-0">
                          🍽️
                        </div>

                        <div className="min-w-0">
                          <p className="text-white font-black truncate">
                            Now showing: {heroFood.name}
                          </p>

                          <p className="text-white/70 text-sm truncate">
                            Kitchen: {getKitchenName(heroFood)}
                          </p>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {homeFoods.length > 1 && (
                <div className="absolute bottom-5 left-5 sm:left-10 z-20 flex gap-2">
                  {homeFoods.slice(0, 5).map((food, index) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => setHeroIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === heroIndex
                          ? "w-8 bg-[#41D3BD]"
                          : "w-2.5 bg-white/60 hover:bg-white"
                      }`}
                      aria-label={`Show ${food.name}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <section className="mt-10 sm:mt-12">
              <div className="flex items-end justify-between gap-4 mb-5 sm:mb-7">
                <div>
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Fresh around you
                  </p>

                  <h2 className="text-3xl sm:text-4xl font-black text-[#111827] mt-2">
                    Trending now
                  </h2>
                </div>

                <Link
                  to="/marketplace"
                  className="hidden sm:block text-[#1A9F8D] hover:text-[#073B35] font-black"
                >
                  View all →
                </Link>
              </div>

              {trendingFoods.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {trendingFoods.map((food) => (
                    <Link
                      key={food.id}
                      to={`/food/${food.id}`}
                      className="group bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] overflow-hidden shadow-lg shadow-[#073B35]/5 hover:shadow-xl hover:shadow-[#073B35]/10 transition-all"
                    >
                      <div className="relative h-48 overflow-hidden bg-[#D7F5EF]">
                        <img
                          src={food.image}
                          alt={food.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />

                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="bg-[#FFFFF2]/95 text-[#073B35] text-xs font-black px-3 py-1.5 rounded-full">
                            {food.category || "Homemade"}
                          </span>
                        </div>

                        {Number(food.stock || 0) <= 0 && (
                          <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                            <span className="bg-white text-[#073B35] text-sm font-black px-4 py-2 rounded-2xl">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-[#111827] font-black text-lg truncate">
                              {food.name}
                            </h3>

                            <p className="text-[#51615D] text-sm mt-1 truncate">
                              Kitchen: {getKitchenName(food)}
                            </p>
                          </div>

                          <p className="text-[#073B35] font-black shrink-0">
                            ₹{food.price}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-lg shadow-[#073B35]/5">
                  <div className="text-5xl">🍲</div>

                  <h3 className="text-2xl font-black text-[#111827] mt-4">
                    Fresh dishes coming soon
                  </h3>

                  <p className="text-[#51615D] mt-2">
                    Once kitchens upload dishes, they will appear here
                    automatically.
                  </p>

                  <Link
                    to="/marketplace"
                    className="inline-block mt-6 bg-[#073B35] hover:bg-[#0B5149] text-white font-black px-6 py-3 rounded-2xl"
                  >
                    Explore Marketplace
                  </Link>
                </div>
              )}
            </section>

            <section className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] p-6 shadow-lg shadow-[#073B35]/5">
                <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                  🍲
                </div>

                <h3 className="text-[#073B35] font-black text-xl mt-5">
                  Fresh
                </h3>

                <p className="text-[#51615D] mt-2 leading-relaxed">
                  Daily homemade food drops from nearby kitchens.
                </p>
              </div>

              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] p-6 shadow-lg shadow-[#073B35]/5">
                <div className="w-12 h-12 rounded-2xl bg-[#41D3BD]/15 flex items-center justify-center text-2xl">
                  🏠
                </div>

                <h3 className="text-[#073B35] font-black text-xl mt-5">
                  Local
                </h3>

                <p className="text-[#51615D] mt-2 leading-relaxed">
                  Food made within your apartment or neighbourhood community.
                </p>
              </div>

            </section>

            <section className="mt-10 sm:mt-12 mb-4 bg-[#073B35] rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/15 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-64 h-64 bg-[#41D3BD]/20 blur-[90px] rounded-full" />

              <div className="relative max-w-3xl">
                <p className="text-[#41D3BD] text-sm font-black uppercase tracking-[0.18em]">
                  Why Nefo?
                </p>

                <h2 className="text-white text-2xl sm:text-4xl font-black mt-3 leading-tight">
                  Faster than delivery apps, more personal than restaurants.
                </h2>

                <p className="text-[#D7F5EF] text-base sm:text-lg mt-4 leading-relaxed">
                  No long-distance delivery, no generic menus — just real food
                  made by trusted kitchens around you.
                </p>
              </div>
            </section>
          </div>
        </section>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF] px-4 py-3">
          <Link
            to="/marketplace"
            className="block w-full bg-[#073B35] active:scale-[0.98] text-white text-center font-black py-4 rounded-2xl shadow-xl shadow-[#073B35]/15"
          >
            Start Ordering
          </Link>
        </div>
      </main>
    </>
  );
}
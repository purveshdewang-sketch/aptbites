import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FoodCard from "../components/FoodCard";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../context/CartContext";

const FOOD_CATEGORIES = [
  {
    label: "All",
    emoji: "🍽️",
  },
  {
    label: "Meals",
    emoji: "🍛",
  },
  {
    label: "Breakfast",
    emoji: "🥞",
  },
  {
    label: "Snacks",
    emoji: "🥪",
  },
  {
    label: "Sweets",
    emoji: "🍰",
  },
  {
    label: "Drinks",
    emoji: "🥤",
  },
  {
    label: "Healthy",
    emoji: "🥗",
  },
  {
    label: "Tiffin",
    emoji: "🍱",
  },
  {
    label: "Specials",
    emoji: "⭐",
  },
];

export default function Marketplace() {
  const { cartCount } = useCart();

  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchFoods();

    const foodsChannel = supabase
      .channel("foods-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchFoods();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("seller-status-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchFoods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  async function fetchFoods() {
    setLoading(true);
    setErrorMessage("");

    const { data: foodData, error: foodError } = await supabase
      .from("foods")
      .select("*")
      .order("id", { ascending: false });

    if (foodError) {
      setErrorMessage(foodError.message);
      setFoods([]);
      setLoading(false);
      return;
    }

    const sellerIds = [
      ...new Set(
        (foodData || [])
          .map((food) => food.user_id || food.seller_id)
          .filter(Boolean)
      ),
    ];

    let sellerStatusMap = {};

    if (sellerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, seller_online")
        .in("id", sellerIds);

      sellerStatusMap = (profileData || []).reduce((map, profile) => {
        map[profile.id] = profile.seller_online !== false;
        return map;
      }, {});
    }

    const enrichedFoods = (foodData || []).map((food) => {
      const sellerId = food.user_id || food.seller_id;

      return {
        ...food,
        seller_online: sellerStatusMap[sellerId] !== false,
      };
    });

    setFoods(enrichedFoods);
    setLoading(false);
  }

  const categoryCounts = useMemo(() => {
    const counts = {};

    FOOD_CATEGORIES.forEach((category) => {
      counts[category.label] = 0;
    });

    foods.forEach((food) => {
      const foodCategory = food.category || "Meals";

      counts.All += 1;

      if (counts[foodCategory] !== undefined) {
        counts[foodCategory] += 1;
      }
    });

    return counts;
  }, [foods]);

  const filteredFoods = useMemo(() => {
    return foods.filter((item) => {
      const searchValue = searchTerm.trim().toLowerCase();

      const foodCategory = item.category || "Meals";

      const matchesSearch =
        searchValue === "" ||
        item.name?.toLowerCase().includes(searchValue) ||
        item.seller?.toLowerCase().includes(searchValue) ||
        item.time?.toLowerCase().includes(searchValue) ||
        foodCategory.toLowerCase().includes(searchValue);

      const matchesType = selectedType === "All" || item.type === selectedType;

      const matchesCategory =
        selectedCategory === "All" || foodCategory === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [foods, searchTerm, selectedType, selectedCategory]);

  const availableFoods = useMemo(() => {
    return foods.filter(
      (item) => Number(item.stock || 0) > 0 && item.seller_online !== false
    );
  }, [foods]);

  const lowStockCount = useMemo(() => {
    return foods.filter(
      (item) =>
        item.seller_online !== false &&
        Number(item.stock || 0) > 0 &&
        Number(item.stock || 0) <= 2
    ).length;
  }, [foods]);

  function clearFilters() {
    setSearchTerm("");
    setSelectedType("All");
    setSelectedCategory("All");
    setTypeDropdownOpen(false);
  }

  function getTypeLabel(type) {
    if (type === "All") return "All Food Types";
    return type;
  }

  function getCategoryHeading() {
    if (selectedCategory === "All") return "Today’s Specials";
    return `${selectedCategory} near you`;
  }

  function getCategorySubheading() {
    if (searchTerm || selectedType !== "All" || selectedCategory !== "All") {
      const parts = [];

      if (selectedCategory !== "All") {
        parts.push(selectedCategory);
      }

      if (selectedType !== "All") {
        parts.push(selectedType);
      }

      if (searchTerm) {
        parts.push(`"${searchTerm}"`);
      }

      return `Showing ${filteredFoods.length} result${
        filteredFoods.length === 1 ? "" : "s"
      } for ${parts.join(" • ")}`;
    }

    return "Limited homemade food drops available now.";
  }

  const hasActiveFilters =
    searchTerm || selectedType !== "All" || selectedCategory !== "All";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white overflow-hidden pb-28">
        <section className="relative px-4 sm:px-6 pt-6 pb-6 sm:py-10 border-b border-[#1f1f1f]">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/10 rounded-full blur-[90px]" />

          <div className="relative max-w-7xl mx-auto">
            <p className="text-yellow-400 font-semibold tracking-wide text-sm uppercase">
              Marketplace
            </p>

            <h1 className="text-[2.15rem] sm:text-5xl md:text-6xl font-black text-white mt-3 leading-[1.03] tracking-tight">
              Fresh homemade food
              <span className="block text-yellow-400">
                from your community.
              </span>
            </h1>

            <p className="text-gray-400 text-[15px] sm:text-lg mt-5 max-w-2xl leading-relaxed">
              Discover meals, snacks, desserts, and special dishes prepared by
              trusted home chefs inside your neighbourhood.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase font-bold">
                  Available Now
                </p>
                <p className="text-2xl font-black text-yellow-400 mt-1">
                  {availableFoods.length}
                </p>
              </div>

              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase font-bold">
                  Selling Fast
                </p>
                <p className="text-2xl font-black text-red-400 mt-1">
                  {lowStockCount}
                </p>
              </div>

              <div className="hidden sm:block bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase font-bold">
                  Food Drops
                </p>
                <p className="text-2xl font-black text-white mt-1">
                  {foods.length}
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 lg:flex lg:items-center lg:gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search dishes, seller, category, or ready time..."
                className="bg-[#111111] border border-[#2a2a2a] text-white rounded-2xl px-5 py-4 w-full lg:max-w-lg outline-none focus:border-yellow-500 transition-all duration-200 text-base"
              />

              <div className="relative w-full lg:w-60">
                <button
                  type="button"
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  className="w-full bg-[#111111] border border-[#2a2a2a] hover:border-yellow-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200"
                >
                  <span className="font-semibold">
                    {getTypeLabel(selectedType)}
                  </span>

                  <span className="text-yellow-400 text-xs">
                    {typeDropdownOpen ? "▲" : "▼"}
                  </span>
                </button>

                {typeDropdownOpen && (
                  <div className="absolute z-40 mt-3 w-full bg-[#111111] border border-[#2a2a2a] rounded-2xl shadow-2xl shadow-yellow-500/10 overflow-hidden">
                    {["All", "Veg", "Non-Veg"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSelectedType(type);
                          setTypeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-4 font-semibold transition-all duration-200 ${
                          selectedType === type
                            ? "bg-yellow-500 text-black"
                            : "text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400"
                        }`}
                      >
                        {getTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={hasActiveFilters ? clearFilters : undefined}
                className={`font-bold px-8 py-4 rounded-2xl transition-all duration-200 min-h-[56px] ${
                  hasActiveFilters
                    ? "border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                    : "bg-yellow-500 hover:bg-yellow-400 text-black"
                }`}
              >
                {hasActiveFilters ? "Clear" : "Search"}
              </button>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 pt-5 pb-2 bg-black border-b border-[#151515] sticky top-0 z-30">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {FOOD_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category.label;
                const count = categoryCounts[category.label] || 0;

                return (
                  <button
                    key={category.label}
                    type="button"
                    onClick={() => setSelectedCategory(category.label)}
                    className={`shrink-0 min-w-[92px] sm:min-w-[110px] rounded-2xl border px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? "bg-yellow-500 text-black border-yellow-400 shadow-lg shadow-yellow-500/20"
                        : "bg-[#111111] text-gray-300 border-[#2a2a2a] hover:border-yellow-500/50 hover:text-yellow-400"
                    }`}
                  >
                    <div className="text-2xl">{category.emoji}</div>
                    <div className="font-black text-sm mt-1">
                      {category.label}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        isActive ? "text-black/70" : "text-gray-500"
                      }`}
                    >
                      {count} item{count === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-7 sm:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {getCategoryHeading()}
                </h2>

                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  {getCategorySubheading()}
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="hidden sm:block border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black px-5 py-3 rounded-2xl font-semibold transition-all duration-200"
                >
                  View All
                </button>
              )}
            </div>

            {loading && (
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-8 text-center">
                <p className="text-gray-400 font-bold">Loading food drops...</p>
              </div>
            )}

            {!loading && errorMessage && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-3xl p-8 text-center">
                <p className="text-red-300 font-bold">
                  Could not load marketplace.
                </p>
                <p className="text-red-200/70 text-sm mt-2">{errorMessage}</p>
              </div>
            )}

            {!loading && !errorMessage && filteredFoods.length === 0 && (
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-8 text-center">
                <div className="text-5xl">🍽️</div>
                <p className="text-gray-300 font-black mt-4">
                  No dishes found.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Try another category, food type, or search term.
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 bg-yellow-500 hover:bg-yellow-400 text-black font-black px-6 py-3 rounded-2xl"
                  >
                    View All Food
                  </button>
                )}
              </div>
            )}

            {!loading && !errorMessage && filteredFoods.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {filteredFoods.map((item) => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>

        {cartCount > 0 && (
          <Link
            to="/cart"
            className="fixed bottom-5 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-black px-6 py-4 rounded-2xl shadow-2xl shadow-yellow-500/20 flex items-center justify-center gap-3 transition-all"
          >
            <span>🛒</span>
            <span>
              View Cart • {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
          </Link>
        )}
      </main>
    </>
  );
}
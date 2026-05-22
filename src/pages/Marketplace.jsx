import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FoodCard from "../components/FoodCard";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../context/CartContext";

const FOOD_CATEGORIES = [
  { label: "All", emoji: "🍽️" },
  { label: "Meals", emoji: "🍛" },
  { label: "Breakfast", emoji: "🥞" },
  { label: "Snacks", emoji: "🥪" },
  { label: "Sweets", emoji: "🍰" },
  { label: "Drinks", emoji: "🥤" },
  { label: "Tiffin", emoji: "🍱" },
  { label: "Specials", emoji: "⭐" },
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
    fetchMarketplaceData();

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
          fetchMarketplaceData(false);
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("kitchen-status-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchMarketplaceData(false);
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("orders-sales-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchMarketplaceData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  async function fetchMarketplaceData(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

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

    const { data: orderData } = await supabase
      .from("orders")
      .select("items, status")
      .neq("status", "cancelled");

    const kitchenIds = [
      ...new Set(
        (foodData || [])
          .map((food) => food.user_id || food.seller_id)
          .filter(Boolean)
      ),
    ];

    let kitchenStatusMap = {};

    if (kitchenIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, seller_online")
        .in("id", kitchenIds);

      kitchenStatusMap = (profileData || []).reduce((map, profile) => {
        map[profile.id] = profile.seller_online !== false;
        return map;
      }, {});
    }

    const parsedOrderItems = [];

    (orderData || []).forEach((order) => {
      const items = getOrderItems(order);

      items.forEach((item) => {
        parsedOrderItems.push(item);
      });
    });

    const salesMap = buildSalesMap(parsedOrderItems);

    const enrichedFoods = (foodData || []).map((food) => {
      const kitchenId = food.user_id || food.seller_id;
      const soldCount = salesMap[String(food.id)] || 0;

      return {
        ...food,
        seller_online: kitchenStatusMap[kitchenId] !== false,
        sold_count: soldCount,
        demand_badge: getDemandBadge(soldCount),
      };
    });

    setFoods(enrichedFoods);
    setLoading(false);
  }

  function getOrderItems(order) {
    if (Array.isArray(order.items)) return order.items;

    if (typeof order.items === "string") {
      try {
        const parsedItems = JSON.parse(order.items);
        return Array.isArray(parsedItems) ? parsedItems : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  function buildSalesMap(items) {
    const map = {};

    items.forEach((item) => {
      const itemId = item.id;

      if (!itemId) return;

      if (!map[String(itemId)]) {
        map[String(itemId)] = 0;
      }

      map[String(itemId)] += Number(item.quantity || 1);
    });

    return map;
  }

  function getDemandBadge(soldCount) {
    if (soldCount >= 10) {
      return {
        label: "Best Seller",
        sublabel: "Loved by customers",
      };
    }

    if (soldCount >= 6) {
      return {
        label: "High Demand",
        sublabel: "Popular today",
      };
    }

    if (soldCount >= 3) {
      return {
        label: "Trending",
        sublabel: "People are ordering",
      };
    }

    if (soldCount >= 1) {
      return {
        label: "Popular Choice",
        sublabel: "Customer favourite",
      };
    }

    return null;
  }

  const highestSellingFood = useMemo(() => {
    const soldFoods = foods
      .filter((food) => Number(food.sold_count || 0) > 0)
      .sort((a, b) => Number(b.sold_count || 0) - Number(a.sold_count || 0));

    return soldFoods[0] || null;
  }, [foods]);

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
      const kitchenName =
        item.seller || item.seller_kitchen_name || "Home Kitchen";

      const matchesSearch =
        searchValue === "" ||
        item.name?.toLowerCase().includes(searchValue) ||
        kitchenName.toLowerCase().includes(searchValue) ||
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
    return selectedCategory;
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

    return "Fresh homemade food drops available now.";
  }

  const hasActiveFilters =
    searchTerm || selectedType !== "All" || selectedCategory !== "All";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] overflow-hidden pb-28">
        <section className="relative px-4 sm:px-6 pt-4 pb-5 sm:pt-8 sm:pb-8 border-b border-[#D7F5EF]">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#41D3BD]/18 rounded-full blur-[95px]" />
          <div className="absolute top-24 left-0 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

          <div className="relative max-w-7xl mx-auto">
            <div className="sm:hidden">
              <p className="text-[#1A9F8D] font-black tracking-wide text-xs uppercase">
                Marketplace
              </p>

              <h1 className="text-3xl font-black text-[#111827] mt-2 leading-tight">
                Food around you
              </h1>

              <p className="text-[#51615D] text-sm mt-2">
                Fresh homemade drops from your community.
              </p>
            </div>

            <div className="hidden sm:block">
              <p className="text-[#1A9F8D] font-semibold tracking-wide text-sm uppercase">
                Marketplace
              </p>

              <h1 className="text-5xl md:text-6xl font-black text-[#111827] mt-3 leading-[1.03] tracking-tight">
                Fresh homemade food
                <span className="block text-[#073B35]">
                  from your community.
                </span>
              </h1>

              <p className="text-[#51615D] text-lg mt-5 max-w-2xl leading-relaxed">
                Discover meals, snacks, desserts, and special dishes prepared by
                trusted home kitchens inside your neighbourhood.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/85 border border-[#D7F5EF] rounded-2xl p-4 shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D] text-[11px] uppercase font-bold">
                  Available Now
                </p>
                <p className="text-2xl font-black text-[#073B35] mt-1">
                  {availableFoods.length}
                </p>
              </div>

              <div className="bg-white/85 border border-[#D7F5EF] rounded-2xl p-4 shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D] text-[11px] uppercase font-bold">
                  Popular Today
                </p>

                {highestSellingFood ? (
                  <Link
                    to={`/food/${highestSellingFood.id}`}
                    className="mt-2 flex items-center gap-3 group"
                  >
                    <img
                      src={highestSellingFood.image}
                      alt={highestSellingFood.name}
                      className="w-11 h-11 rounded-full object-cover border border-[#D7F5EF]"
                    />

                    <div className="min-w-0">
                      <p className="text-[#111827] group-hover:text-[#1A9F8D] font-black truncate transition-all text-sm sm:text-base">
                        {highestSellingFood.name}
                      </p>

                      <p className="text-[#1A9F8D] text-xs sm:text-sm font-bold">
                        Popular Dish
                      </p>
                    </div>
                  </Link>
                ) : (
                  <p className="text-2xl font-black text-[#9AA7A3] mt-1">—</p>
                )}
              </div>

              <div className="hidden sm:block bg-white/85 border border-[#D7F5EF] rounded-2xl p-4 shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D] text-xs uppercase font-bold">
                  Food Drops
                </p>
                <p className="text-2xl font-black text-[#111827] mt-1">
                  {foods.length}
                </p>
              </div>
            </div>

            <div className="mt-4 sticky top-[76px] z-40 bg-[#FFFFF2]/95 backdrop-blur py-2 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-0 sm:mx-0 sm:px-0 sm:py-0">
              <div className="grid grid-cols-1 gap-3 lg:flex lg:items-center lg:gap-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search dishes or kitchens..."
                  className="bg-white/85 border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-5 py-4 w-full lg:max-w-lg outline-none focus:border-[#41D3BD] transition-all duration-200 text-base shadow-sm"
                />

                <div className="grid grid-cols-[1fr_auto] gap-3 lg:flex lg:gap-4">
                  <div className="relative w-full lg:w-60">
                    <button
                      type="button"
                      onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                      className="w-full bg-white/85 border border-[#D7F5EF] hover:border-[#41D3BD] text-[#111827] rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200 shadow-sm"
                    >
                      <span className="font-semibold">
                        {getTypeLabel(selectedType)}
                      </span>

                      <span className="text-[#1A9F8D] text-xs">
                        {typeDropdownOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {typeDropdownOpen && (
                      <div className="absolute z-50 mt-3 w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl shadow-2xl shadow-[#073B35]/15 overflow-hidden">
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
                                ? "bg-[#41D3BD] text-[#073B35]"
                                : "text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D]"
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
                    className={`font-bold px-5 sm:px-8 py-4 rounded-2xl transition-all duration-200 min-h-[56px] shadow-lg ${
                      hasActiveFilters
                        ? "border border-[#41D3BD] text-[#1A9F8D] hover:bg-[#D7F5EF] hover:text-[#073B35] bg-white/85 shadow-[#41D3BD]/10"
                        : "bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] shadow-[#41D3BD]/25"
                    }`}
                  >
                    {hasActiveFilters ? "Clear" : "Search"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 pt-4 pb-2 bg-[#FFFFF2] border-b border-[#D7F5EF] sticky top-[76px] sm:top-0 z-30">
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
                    className={`shrink-0 min-w-[86px] sm:min-w-[110px] rounded-2xl border px-3 sm:px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD] shadow-lg shadow-[#41D3BD]/20"
                        : "bg-white/85 text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/70 hover:text-[#1A9F8D]"
                    }`}
                  >
                    <div className="text-xl sm:text-2xl">{category.emoji}</div>
                    <div className="font-black text-xs sm:text-sm mt-1">
                      {category.label}
                    </div>
                    <div
                      className={`text-[11px] sm:text-xs mt-0.5 ${
                        isActive ? "text-[#073B35]/75" : "text-[#9AA7A3]"
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

        <section className="px-4 sm:px-6 py-6 sm:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-5 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#111827]">
                  {getCategoryHeading()}
                </h2>

                <p className="text-[#51615D] mt-2 text-sm sm:text-base">
                  {getCategorySubheading()}
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="hidden sm:block border border-[#41D3BD] text-[#1A9F8D] hover:bg-[#D7F5EF] hover:text-[#073B35] bg-white/85 px-5 py-3 rounded-2xl font-semibold transition-all duration-200"
                >
                  View All
                </button>
              )}
            </div>

            {loading && (
              <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D] font-bold">
                  Loading food drops...
                </p>
              </div>
            )}

            {!loading && errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
                <p className="text-red-700 font-bold">
                  Could not load marketplace.
                </p>
                <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
              </div>
            )}

            {!loading && !errorMessage && filteredFoods.length === 0 && (
              <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
                <div className="text-5xl">🍽️</div>
                <p className="text-[#111827] font-black mt-4">
                  No dishes found.
                </p>
                <p className="text-[#51615D] text-sm mt-2">
                  Try another category, food type, or search term.
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-6 py-3 rounded-2xl"
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
            className="fixed bottom-5 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.98] text-[#073B35] font-black px-6 py-4 rounded-2xl shadow-2xl shadow-[#41D3BD]/25 flex items-center justify-center gap-3 transition-all"
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
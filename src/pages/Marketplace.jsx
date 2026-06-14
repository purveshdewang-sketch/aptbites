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

    let kitchenMap = {};

    if (kitchenIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, seller_online, seller_kitchen_name, delivery_available, pickup_available"
        )
        .in("id", kitchenIds);

      if (profileError) {
        setErrorMessage(profileError.message);
        setFoods([]);
        setLoading(false);
        return;
      }

      kitchenMap = (profileData || []).reduce((map, profile) => {
        map[profile.id] = {
          seller_online: profile.seller_online !== false,
          seller_kitchen_name: profile.seller_kitchen_name || "",
          delivery_available: profile.delivery_available !== false,
          pickup_available: profile.pickup_available !== false,
        };

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
      const kitchenProfile = kitchenMap[kitchenId] || {};
      const soldCount = salesMap[String(food.id)] || 0;

      return {
        ...food,
        seller_id: kitchenId,
        seller_online: kitchenProfile.seller_online !== false,
        seller_kitchen_name:
          kitchenProfile.seller_kitchen_name ||
          food.seller_kitchen_name ||
          food.seller ||
          "Home Kitchen",
        delivery_available: kitchenProfile.delivery_available !== false,
        pickup_available: kitchenProfile.pickup_available !== false,
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

  function getFulfillmentText(food) {
    const deliveryOn = food.delivery_available !== false;
    const pickupOn = food.pickup_available !== false;

    if (deliveryOn && pickupOn) return "Delivery • Pickup";
    if (deliveryOn) return "Delivery only";
    if (pickupOn) return "Pickup only";
    return "Unavailable";
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
      (item) =>
        Number(item.stock || 0) > 0 &&
        item.seller_online !== false &&
        (item.delivery_available !== false || item.pickup_available !== false)
    );
  }, [foods]);

  const closedOrSoldOutCount = useMemo(() => {
    return foods.filter(
      (item) =>
        Number(item.stock || 0) <= 0 ||
        item.seller_online === false ||
        (item.delivery_available === false && item.pickup_available === false)
    ).length;
  }, [foods]);

  const featuredFoods = useMemo(() => {
    return foods
      .filter(
        (food) =>
          Number(food.stock || 0) > 0 &&
          food.seller_online !== false &&
          (food.delivery_available !== false || food.pickup_available !== false)
      )
      .sort((a, b) => Number(b.sold_count || 0) - Number(a.sold_count || 0))
      .slice(0, 4);
  }, [foods]);

  function clearFilters() {
    setSearchTerm("");
    setSelectedType("All");
    setSelectedCategory("All");
    setTypeDropdownOpen(false);
  }

  function getTypeLabel(type) {
    if (type === "All") return "All Types";
    return type;
  }

  function getCategoryHeading() {
    if (selectedCategory === "All") return "Fresh food drops";
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

    return "Homemade dishes available from trusted kitchens in your community.";
  }

  const hasActiveFilters =
    searchTerm || selectedType !== "All" || selectedCategory !== "All";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] overflow-hidden pb-28">
        <section className="relative px-4 sm:px-6 pt-4 sm:pt-8 pb-4 sm:pb-8">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#41D3BD]/20 rounded-full blur-[100px]" />
          <div className="absolute top-36 -left-28 w-80 h-80 bg-[#41D3BD]/10 rounded-full blur-[120px]" />

          <div className="relative max-w-7xl mx-auto">
            <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5 overflow-hidden">
              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                    <span>🌿</span>
                    <span>Homemade. Nearby. Fresh.</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl lg:text-6xlfont-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                    What would you like
                    <span className="block text-[#111827]">to eat today?</span>
                  </h1>

                  <p className="text-[#51615D] text-sm sm:text-lg mt-5 max-w-2xl leading-relaxed">
                    Order fresh homemade meals, snacks, sweets, tiffins and
                    special food drops from kitchens inside your community.
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 max-w-xl">
                    <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 sm:p-4">
                      <p className="text-[#51615D] text-[10px] sm:text-xs font-bold uppercase">
                        Available
                      </p>
                      <p className="text-[#073B35] text-xl sm:text-2xl font-black mt-1">
                        {availableFoods.length}
                      </p>
                    </div>

                    <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 sm:p-4">
                      <p className="text-[#51615D] text-[10px] sm:text-xs font-bold uppercase">
                        Food Drops
                      </p>
                      <p className="text-[#111827] text-xl sm:text-2xl font-black mt-1">
                        {foods.length}
                      </p>
                    </div>

                    <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3 sm:p-4">
                      <p className="text-[#51615D] text-[10px] sm:text-xs font-bold uppercase">
                        Closed
                      </p>
                      <p className="text-[#9AA7A3] text-xl sm:text-2xl font-black mt-1">
                        {closedOrSoldOutCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  {highestSellingFood ? (
                    <Link
                      to={`/food/${highestSellingFood.id}`}
                      className="group block bg-[#073B35] text-white rounded-[2rem] p-4 shadow-2xl shadow-[#073B35]/20 overflow-hidden"
                    >
                      <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-[#D7F5EF]">
                        <img
                          src={highestSellingFood.image}
                          alt={highestSellingFood.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />

                        <div className="absolute top-3 left-3 bg-[#41D3BD] text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                          🔥 Popular Today
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
                          {highestSellingFood.delivery_available !== false && (
                            <span className="bg-white/95 text-[#073B35] px-3 py-1 rounded-full text-[11px] font-black">
                              🚚 Delivery
                            </span>
                          )}

                          {highestSellingFood.pickup_available !== false && (
                            <span className="bg-white/95 text-[#073B35] px-3 py-1 rounded-full text-[11px] font-black">
                              🛍️ Pickup
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-2 pt-4">
                        <p className="text-white/65 text-xs font-bold uppercase">
                          Customer favourite
                        </p>

                        <h2 className="text-2xl font-black mt-1 truncate">
                          {highestSellingFood.name}
                        </h2>

                        <div className="flex items-center justify-between mt-3">
                          <p className="text-white/70 text-sm">
                            {getFulfillmentText(highestSellingFood)}
                          </p>

                          <p className="text-[#41D3BD] font-black text-2xl">
                            ₹{highestSellingFood.price}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-[#073B35] text-white rounded-[2rem] p-8 shadow-2xl shadow-[#073B35]/20">
                      <div className="text-5xl">🍽️</div>
                      <h2 className="text-3xl font-black mt-5">
                        Fresh drops are loading
                      </h2>
                      <p className="text-white/70 mt-3">
                        Popular dishes will appear here once customers start
                        ordering.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 sticky top-[92px] z-40 bg-[#FFFFF2]/95 backdrop-blur-xl py-3 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-0 sm:mx-0 sm:px-0 sm:py-0">
              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-4 shadow-lg shadow-[#073B35]/5">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1A9F8D]">
                      🔎
                    </span>

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search dishes or kitchens..."
                      className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl pl-12 pr-5 py-4 w-full outline-none focus:border-[#41D3BD] transition-all duration-200 text-base"
                    />
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                      className="w-full lg:w-48 bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD] text-[#111827] rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200"
                    >
                      <span className="font-black">
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
                    className={`font-black px-6 py-4 rounded-2xl transition-all duration-200 shadow-lg ${
                      hasActiveFilters
                        ? "border border-[#41D3BD] text-[#1A9F8D] hover:bg-[#D7F5EF] hover:text-[#073B35] bg-white shadow-[#41D3BD]/10"
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

        <section className="px-4 sm:px-6 pt-2 pb-3 bg-[#FFFFF2] sticky top-[76px] sm:top-0 z-30">
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
                    className={`shrink-0 min-w-[92px] sm:min-w-[118px] rounded-[1.4rem] border px-3 sm:px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                        : "bg-white/90 text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/70 hover:text-[#073B35]"
                    }`}
                  >
                    <div className="text-xl sm:text-2xl">{category.emoji}</div>

                    <div className="font-black text-xs sm:text-sm mt-1">
                      {category.label}
                    </div>

                    <div
                      className={`text-[11px] sm:text-xs mt-0.5 ${
                        isActive ? "text-white/70" : "text-[#9AA7A3]"
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

        {featuredFoods.length > 0 && selectedCategory === "All" && !searchTerm && (
          <section className="px-4 sm:px-6 pt-3 pb-2">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <p className="text-[#1A9F8D] text-xs font-black uppercase tracking-wide">
                    Recommended
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                    Popular today
                  </h2>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {featuredFoods.map((food) => (
                  <Link
                    key={food.id}
                    to={`/food/${food.id}`}
                    className="shrink-0 w-[260px] sm:w-[300px] bg-white border border-[#D7F5EF] rounded-[1.75rem] overflow-hidden shadow-lg shadow-[#073B35]/5"
                  >
                    <div className="relative h-36 sm:h-44 bg-[#D7F5EF] overflow-hidden">
                      <img
                        src={food.image}
                        alt={food.name}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute top-3 left-3 bg-[#41D3BD] text-[#073B35] text-xs font-black px-3 py-1 rounded-full">
                        {food.demand_badge?.label || "Fresh Drop"}
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-[#111827] font-black truncate">
                        {food.name}
                      </h3>

                      <p className="text-[#51615D] text-xs mt-1 truncate">
                        Kitchen:{" "}
                        {food.seller_kitchen_name ||
                          food.seller ||
                          "Home Kitchen"}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {food.delivery_available !== false && (
                          <span className="bg-[#41D3BD]/12 text-[#073B35] border border-[#41D3BD]/25 text-[11px] font-black px-2.5 py-1 rounded-full">
                            🚚 Delivery
                          </span>
                        )}

                        {food.pickup_available !== false && (
                          <span className="bg-[#FFFFF2] text-[#073B35] border border-[#D7F5EF] text-[11px] font-black px-2.5 py-1 rounded-full">
                            🛍️ Pickup
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[#073B35] text-xl font-black">
                          ₹{food.price}
                        </p>

                        <span className="bg-[#41D3BD]/12 text-[#073B35] border border-[#41D3BD]/25 text-xs font-black px-3 py-1 rounded-full">
                          View
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-4 sm:px-6 py-6 sm:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-5 sm:mb-8">
              <div>
                <p className="text-[#1A9F8D] text-xs font-black uppercase tracking-wide">
                  Explore
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  {getCategoryHeading()}
                </h2>

                <p className="text-[#51615D] mt-2 text-sm sm:text-base max-w-2xl">
                  {getCategorySubheading()}
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="hidden sm:block border border-[#41D3BD] text-[#1A9F8D] hover:bg-[#D7F5EF] hover:text-[#073B35] bg-white px-5 py-3 rounded-2xl font-black transition-all duration-200"
                >
                  View All
                </button>
              )}
            </div>

            {loading && (
              <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-2xl">
                  🍽️
                </div>

                <p className="text-[#51615D] font-bold mt-4">
                  Loading fresh food drops...
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
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
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
            className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.98] text-white font-black px-6 py-4 rounded-2xl shadow-2xl shadow-[#073B35]/25 flex items-center justify-center gap-3 transition-all"
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
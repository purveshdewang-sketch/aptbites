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
        { event: "*", schema: "public", table: "foods" },
        () => fetchMarketplaceData(false)
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("kitchen-status-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchMarketplaceData(false)
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("orders-sales-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchMarketplaceData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  async function fetchMarketplaceData(showLoading = true) {
    if (showLoading) setLoading(true);

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
      getOrderItems(order).forEach((item) => parsedOrderItems.push(item));
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

      if (!map[String(itemId)]) map[String(itemId)] = 0;
      map[String(itemId)] += Number(item.quantity || 1);
    });

    return map;
  }

  function getDemandBadge(soldCount) {
    if (soldCount >= 10) {
      return { label: "Best Seller", sublabel: "Loved by customers" };
    }

    if (soldCount >= 6) {
      return { label: "High Demand", sublabel: "Popular today" };
    }

    if (soldCount >= 3) {
      return { label: "Trending", sublabel: "People are ordering" };
    }

    if (soldCount >= 1) {
      return { label: "Popular Choice", sublabel: "Customer favourite" };
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

      if (selectedCategory !== "All") parts.push(selectedCategory);
      if (selectedType !== "All") parts.push(selectedType);
      if (searchTerm) parts.push(`"${searchTerm}"`);

      return `Showing ${filteredFoods.length} result${
        filteredFoods.length === 1 ? "" : "s"
      } for ${parts.join(" • ")}`;
    }

    return "Fresh homemade food from kitchens around your neighbourhood.";
  }

  const hasActiveFilters =
    searchTerm || selectedType !== "All" || selectedCategory !== "All";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] pb-28">
        <section className="px-4 pt-4 pb-3">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white border border-[#E8F4F1] rounded-3xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 bg-[#EFFFFB] border border-[#41D3BD]/35 text-[#073B35] px-3 py-1 rounded-full text-xs font-black">
                    <span>🌿</span>
                    <span>Homemade nearby</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black mt-4 leading-tight tracking-tight text-[#073B35]">
                    What would you like
                    <span className="block text-[#111827]">to eat today?</span>
                  </h1>

                  <p className="text-[#51615D] text-sm sm:text-base mt-3 max-w-2xl leading-relaxed">
                    Fresh meals, snacks, sweets, tiffins and food drops from
                    kitchens inside your community.
                  </p>
                </div>

                {highestSellingFood && (
                  <Link
                    to={`/food/${highestSellingFood.id}`}
                    className="hidden lg:block w-72 shrink-0 rounded-3xl overflow-hidden bg-[#073B35] text-white shadow-sm"
                  >
                    <div className="h-36 bg-[#D7F5EF]">
                      <img
                        src={highestSellingFood.image}
                        alt={highestSellingFood.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-4">
                      <p className="text-[#41D3BD] text-xs font-black">
                        🔥 Popular Today
                      </p>

                      <h2 className="font-black text-lg truncate mt-1">
                        {highestSellingFood.name}
                      </h2>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-white/70 text-xs">
                          {getFulfillmentText(highestSellingFood)}
                        </p>

                        <p className="text-[#41D3BD] font-black">
                          ₹{highestSellingFood.price}
                        </p>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5">
                <div className="bg-[#FFFFF2] border border-[#E8F4F1] rounded-2xl p-3">
                  <p className="text-[#7A8A86] text-[10px] font-black uppercase">
                    Available
                  </p>
                  <p className="text-[#073B35] text-2xl font-black mt-1">
                    {availableFoods.length}
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#E8F4F1] rounded-2xl p-3">
                  <p className="text-[#7A8A86] text-[10px] font-black uppercase">
                    Food Drops
                  </p>
                  <p className="text-[#111827] text-2xl font-black mt-1">
                    {foods.length}
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#E8F4F1] rounded-2xl p-3">
                  <p className="text-[#7A8A86] text-[10px] font-black uppercase">
                    Closed
                  </p>
                  <p className="text-[#9AA7A3] text-2xl font-black mt-1">
                    {closedOrSoldOutCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky top-[92px] z-40 bg-[#FFFFF2]/95 backdrop-blur-xl py-3">
              <div className="bg-white border border-[#E8F4F1] rounded-3xl p-3 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2">
                      🔎
                    </span>

                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search dishes or kitchens..."
                      className="w-full h-12 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl pl-11 pr-4 outline-none focus:border-[#41D3BD] text-sm"
                    />
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                      className="w-full h-12 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 flex items-center justify-between font-black text-sm"
                    >
                      <span>{getTypeLabel(selectedType)}</span>
                      <span className="text-[#1A9F8D]">
                        {typeDropdownOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {typeDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-[#E8F4F1] rounded-2xl shadow-lg overflow-hidden">
                        {["All", "Veg", "Non-Veg"].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setSelectedType(type);
                              setTypeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 font-black text-sm ${
                              selectedType === type
                                ? "bg-[#41D3BD] text-[#073B35]"
                                : "text-[#51615D] hover:bg-[#EFFFFB]"
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
                    className={`h-12 px-5 rounded-2xl font-black active:scale-95 ${
                      hasActiveFilters
                        ? "bg-white border border-[#41D3BD]/45 text-[#073B35]"
                        : "bg-[#41D3BD] text-[#073B35]"
                    }`}
                  >
                    {hasActiveFilters ? "Clear" : "Search"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
              {FOOD_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category.label;
                const count = categoryCounts[category.label] || 0;

                return (
                  <button
                    key={category.label}
                    type="button"
                    onClick={() => setSelectedCategory(category.label)}
                    className={`shrink-0 min-w-[88px] rounded-2xl border px-3 py-3 active:scale-95 transition-all ${
                      isActive
                        ? "bg-[#073B35] text-white border-[#073B35]"
                        : "bg-white text-[#51615D] border-[#E8F4F1]"
                    }`}
                  >
                    <div className="text-xl">{category.emoji}</div>

                    <div className="font-black text-xs mt-1">
                      {category.label}
                    </div>

                    <div
                      className={`text-[10px] mt-0.5 ${
                        isActive ? "text-white/70" : "text-[#9AA7A3]"
                      }`}
                    >
                      {count}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {featuredFoods.length > 0 && selectedCategory === "All" && !searchTerm && (
          <section className="px-4 pb-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-[#1A9F8D] text-xs font-black uppercase">
                    Recommended
                  </p>

                  <h2 className="text-xl font-black text-[#111827]">
                    Popular today
                  </h2>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {featuredFoods.map((food) => (
                  <Link
                    key={food.id}
                    to={`/food/${food.id}`}
                    className="shrink-0 w-[235px] sm:w-[280px] bg-white border border-[#E8F4F1] rounded-3xl overflow-hidden shadow-sm active:scale-[0.99]"
                  >
                    <div className="relative h-32 sm:h-40 bg-[#D7F5EF] overflow-hidden">
                      <img
                        src={food.image}
                        alt={food.name}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute top-3 left-3 bg-[#41D3BD] text-[#073B35] text-[11px] font-black px-3 py-1 rounded-full">
                        {food.demand_badge?.label || "Fresh Drop"}
                      </div>
                    </div>

                    <div className="p-3">
                      <h3 className="text-[#111827] font-black truncate">
                        {food.name}
                      </h3>

                      <p className="text-[#51615D] text-xs mt-1 truncate">
                        {food.seller_kitchen_name ||
                          food.seller ||
                          "Home Kitchen"}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[#073B35] text-lg font-black">
                          ₹{food.price}
                        </p>

                        <span className="bg-[#EFFFFB] text-[#073B35] border border-[#41D3BD]/30 text-xs font-black px-3 py-1 rounded-full">
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

        <section className="px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-[#1A9F8D] text-xs font-black uppercase">
                  Explore
                </p>

                <h2 className="text-2xl font-black text-[#111827]">
                  {getCategoryHeading()}
                </h2>

                <p className="text-[#51615D] mt-1 text-sm max-w-2xl">
                  {getCategorySubheading()}
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="hidden sm:block bg-white border border-[#41D3BD]/45 text-[#073B35] px-4 py-2 rounded-2xl font-black"
                >
                  View All
                </button>
              )}
            </div>

            {loading && (
              <div className="bg-white border border-[#E8F4F1] rounded-3xl p-8 text-center shadow-sm">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#EFFFFB] flex items-center justify-center text-2xl">
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
              <div className="bg-white border border-[#E8F4F1] rounded-3xl p-8 text-center shadow-sm">
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
                    className="mt-5 bg-[#41D3BD] text-[#073B35] font-black px-6 py-3 rounded-2xl"
                  >
                    View All Food
                  </button>
                )}
              </div>
            )}

            {!loading && !errorMessage && filteredFoods.length > 0 && (
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-[#073B35] active:scale-[0.98] text-white font-black px-6 py-4 rounded-2xl shadow-lg shadow-[#073B35]/20 flex items-center justify-center gap-3"
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
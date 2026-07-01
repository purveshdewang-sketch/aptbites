import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FoodCard from "../components/FoodCard";
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

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#EADFCE] bg-white/90 shadow-[6px_6px_16px_rgba(63,81,40,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]";

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
        item.seller_kitchen_name || item.seller || "Home Kitchen";

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
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Marketplace
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-[#3F5128]">
              Fresh food
              <span className="block text-[#181411]">near you</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Meals, snacks, sweets, tiffins and daily food drops from nearby
              kitchens.
            </p>
          </div>

          <Link
            to="/cart"
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Cart"
          >
            <CartIcon />

            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#CF743D] px-1 text-[10px] font-black text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </Link>
        </header>

        <section className={`mt-5 p-4 ${CARD}`}>
          <div className="flex items-center gap-3 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-3.5">
            <SearchIcon />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search dishes or kitchens..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80]"
            />
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                className="flex h-12 w-full items-center justify-between rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 text-sm font-black text-[#181411] active:scale-[0.99]"
              >
                <span>{getTypeLabel(selectedType)}</span>
                <ChevronDownIcon open={typeDropdownOpen} />
              </button>

              {typeDropdownOpen ? (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[#D8C9B3] bg-white shadow-lg shadow-[#3F5128]/10">
                  {["All", "Veg", "Non-Veg"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedType(type);
                        setTypeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-black ${
                        selectedType === type
                          ? "bg-[#FFF0DF] text-[#3F5128]"
                          : "text-[#6B6258]"
                      }`}
                    >
                      {getTypeLabel(type)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={hasActiveFilters ? clearFilters : undefined}
              className={`h-12 rounded-2xl border px-4 text-sm font-black active:scale-95 ${
                hasActiveFilters
                  ? "border-[#D8C9B3] bg-white text-[#3F5128]"
                  : "border-[#CF743D] bg-[#CF743D] text-white"
              }`}
            >
              {hasActiveFilters ? "Clear" : "Search"}
            </button>
          </div>
        </section>

        <section className="mt-4 -mx-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
          <div className="flex min-w-max gap-2">
            {FOOD_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.label;
              const count = categoryCounts[category.label] || 0;

              return (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => setSelectedCategory(category.label)}
                  className={`min-w-[86px] shrink-0 rounded-[22px] border px-3 py-3 text-center transition-all active:scale-95 ${
                    isActive
                      ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                      : "border-[#EADFCE] bg-white/90 text-[#6B6258] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]"
                  }`}
                >
                  <div className="text-lg leading-none">{category.emoji}</div>

                  <div className="mt-1 text-xs font-black">
                    {category.label}
                  </div>

                  <div
                    className={`mt-0.5 text-[10px] font-bold ${
                      isActive ? "text-white/75" : "text-[#9A8E80]"
                    }`}
                  >
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-3 grid grid-cols-3 gap-3">
          <StatTile label="Available" value={availableFoods.length} />
          <StatTile label="Food Drops" value={foods.length} />
          <StatTile label="Closed" value={closedOrSoldOutCount} muted />
        </section>

        {highestSellingFood ? (
          <section className={`mt-5 overflow-hidden ${CARD}`}>
            <Link to={`/food/${highestSellingFood.id}`} className="block">
              <div className="relative h-36 bg-[#FFF0DF]">
                {highestSellingFood.image ? (
                  <img
                    src={highestSellingFood.image}
                    alt={highestSellingFood.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">
                    🍽️
                  </div>
                )}

                <div className="absolute left-3 top-3 rounded-full border border-[#CF743D]/40 bg-[#CF743D] px-3 py-1 text-[11px] font-black text-white">
                  🔥 Popular Today
                </div>
              </div>

              <div className="p-4">
                <h2 className="truncate text-lg font-black text-[#181411]">
                  {highestSellingFood.name}
                </h2>

                <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                  {highestSellingFood.seller_kitchen_name ||
                    highestSellingFood.seller ||
                    "Home Kitchen"}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#6B6258]">
                    {getFulfillmentText(highestSellingFood)}
                  </p>

                  <p className="text-lg font-black text-[#3F5128]">
                    ₹{highestSellingFood.price}
                  </p>
                </div>
              </div>
            </Link>
          </section>
        ) : null}

        {featuredFoods.length > 0 && selectedCategory === "All" && !searchTerm ? (
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                  Recommended
                </p>

                <h2 className="text-xl font-black text-[#181411]">
                  Popular today
                </h2>
              </div>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
              <div className="flex min-w-max gap-3">
                {featuredFoods.map((food) => (
                  <Link
                    key={food.id}
                    to={`/food/${food.id}`}
                    className={`w-[218px] shrink-0 overflow-hidden active:scale-[0.99] ${SOFT_CARD}`}
                  >
                    <div className="relative h-[120px] bg-[#FFF0DF]">
                      {food.image ? (
                        <img
                          src={food.image}
                          alt={food.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">
                          🍽️
                        </div>
                      )}

                      <div className="absolute left-3 top-3 rounded-full border border-[#CF743D]/40 bg-[#CF743D] px-3 py-1 text-[10px] font-black text-white">
                        {food.demand_badge?.label || "Fresh Drop"}
                      </div>
                    </div>

                    <div className="p-3">
                      <h3 className="truncate text-sm font-black text-[#181411]">
                        {food.name}
                      </h3>

                      <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                        {food.seller_kitchen_name ||
                          food.seller ||
                          "Home Kitchen"}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-base font-black text-[#3F5128]">
                          ₹{food.price}
                        </p>

                        <span className="rounded-full border border-[#D8C9B3] bg-[#FFF8EC] px-3 py-1 text-[11px] font-black text-[#3F5128]">
                          View
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Explore
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                {getCategoryHeading()}
              </h2>

              <p className="mt-1 text-sm font-semibold leading-relaxed text-[#6B6258]">
                {getCategorySubheading()}
              </p>
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 rounded-full border border-[#D8C9B3] bg-white px-4 py-2 text-xs font-black text-[#3F5128]"
              >
                View All
              </button>
            ) : null}
          </div>

          {loading ? (
            <div className={`p-8 text-center ${CARD}`}>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-2xl">
                🍽️
              </div>

              <p className="mt-4 font-bold text-[#6B6258]">
                Loading fresh food drops...
              </p>
            </div>
          ) : null}

          {!loading && errorMessage ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
              <p className="font-black text-red-700">
                Could not load marketplace.
              </p>
              <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
            </div>
          ) : null}

          {!loading && !errorMessage && filteredFoods.length === 0 ? (
            <div className={`p-8 text-center ${CARD}`}>
              <div className="text-5xl">🍽️</div>

              <p className="mt-4 font-black text-[#181411]">
                No dishes found.
              </p>

              <p className="mt-2 text-sm font-semibold text-[#6B6258]">
                Try another category, food type, or search term.
              </p>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-2xl border border-[#CF743D] bg-[#CF743D] px-6 py-3 font-black text-white"
                >
                  View All Food
                </button>
              ) : null}
            </div>
          ) : null}

          {!loading && !errorMessage && filteredFoods.length > 0 ? (
            <div className="space-y-3">
              {filteredFoods.map((item) => (
                <FoodCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {cartCount > 0 ? (
        <Link
          to="/cart"
          className="fixed bottom-24 left-4 right-4 z-[940] mx-auto flex max-w-md items-center justify-center gap-3 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-6 py-4 font-black text-white shadow-lg shadow-[#3F5128]/20 active:scale-[0.98]"
        >
          <span>🛒</span>
          <span>
            View Cart • {cartCount} {cartCount === 1 ? "item" : "items"}
          </span>
        </Link>
      ) : null}
    </main>
  );
}

function StatTile({ label, value, muted = false }) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#6B6258]">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-black ${
          muted ? "text-[#9A8E80]" : "text-[#3F5128]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-[#3F5128]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M6 6h15l-1.5 9h-12L6 6z" />
      <path d="M6 6L5 3H2" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

function ChevronDownIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-[#3F5128] transition-transform ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
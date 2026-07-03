import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FoodCard from "../components/FoodCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";

const CATEGORY_CHIPS = [
  "All",
  "Meals",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Sweets",
  "Drinks",
  "Tiffin",
  "Specials",
];

const FOOD_TYPE_CHIPS = ["All", "Veg", "Non-Veg"];

const CARD =
  "rounded-[26px] border border-[#EADFCE] bg-white/95 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

export default function Home() {
  const { user } = useAuth();

  const { cartItems } = useCart();

  const [searchParams] = useSearchParams();

  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  const [isSeller, setIsSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [homeFoods, setHomeFoods] = useState([]);
  const [profile, setProfile] = useState(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [activeFoodType, setActiveFoodType] = useState("All");
  const [searchText, setSearchText] = useState("");

  const [loadingFoods, setLoadingFoods] = useState(true);
  const [foodError, setFoodError] = useState("");

  useEffect(() => {
    checkUserRole();
  }, [user]);

  useEffect(() => {
    fetchHomeFoods();

    const foodsChannel = supabase
      .channel("merged-home-foods-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchHomeFoods(false);
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("merged-home-profiles-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchHomeFoods(false);
          checkUserRole();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  useEffect(() => {
    const query = searchParams.get("q");
    const shouldOpenSearch = searchParams.get("search") === "1";

    if (query) {
      setSearchText(query);
    }

    if (shouldOpenSearch) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();

        searchInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    }
  }, [searchParams]);

  async function checkUserRole() {
    if (!user) {
      setIsSeller(false);
      setIsAdmin(false);
      setProfile(null);
      return;
    }

    const metadataRole = String(
      user?.user_metadata?.role || ""
    ).toLowerCase();

    let { data, error } = await supabase
      .from("profiles")
      .select(
        "role, is_seller, full_name, apartment_name, block, flat_no, flat, avatar_url"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      const fallbackResult = await supabase
        .from("profiles")
        .select(
          "role, is_seller, full_name, apartment_name, block, flat_no, flat"
        )
        .eq("id", user.id)
        .maybeSingle();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      setIsSeller(
        metadataRole === "seller" || metadataRole === "admin"
      );

      setIsAdmin(metadataRole === "admin");
      setProfile(null);
      return;
    }

    const profileRole = String(data?.role || "").toLowerCase();

    const adminAllowed =
      profileRole === "admin" || metadataRole === "admin";

    setProfile(data || null);
    setIsAdmin(adminAllowed);

    setIsSeller(
      adminAllowed ||
        profileRole === "seller" ||
        data?.is_seller === true ||
        metadataRole === "seller"
    );
  }

  async function fetchHomeFoods(showLoading = true) {
    if (showLoading) {
      setLoadingFoods(true);
    }

    setFoodError("");

    const { data: foodData, error: foodFetchError } = await supabase
      .from("foods")
      .select("*")
      .order("id", { ascending: false });

    if (foodFetchError) {
      setHomeFoods([]);
      setFoodError(foodFetchError.message);
      setLoadingFoods(false);
      return;
    }

    const foods = foodData || [];

    const kitchenIds = [
      ...new Set(
        foods
          .map((food) => food.user_id || food.seller_id)
          .filter(Boolean)
      ),
    ];

    let kitchenMap = {};

    if (kitchenIds.length > 0) {
      const { data: kitchenProfiles } = await supabase
        .from("profiles")
        .select(
          "id, seller_online, seller_kitchen_name, delivery_available, pickup_available"
        )
        .in("id", kitchenIds);

      kitchenMap = (kitchenProfiles || []).reduce(
        (result, kitchenProfile) => {
          result[String(kitchenProfile.id)] = {
            seller_online:
              kitchenProfile.seller_online !== false,

            seller_kitchen_name:
              kitchenProfile.seller_kitchen_name || "",

            delivery_available:
              kitchenProfile.delivery_available !== false,

            pickup_available:
              kitchenProfile.pickup_available !== false,
          };

          return result;
        },
        {}
      );
    }

    const ratingMap = {};

    const { data: ratingData } = await supabase
      .from("food_ratings")
      .select("food_id, rating");

    (ratingData || []).forEach((ratingRow) => {
      const foodId = String(ratingRow.food_id || "");
      const ratingValue = Number(ratingRow.rating || 0);

      if (!foodId || ratingValue <= 0) return;

      if (!ratingMap[foodId]) {
        ratingMap[foodId] = {
          total: 0,
          count: 0,
        };
      }

      ratingMap[foodId].total += ratingValue;
      ratingMap[foodId].count += 1;
    });

    const enrichedFoods = foods.map((food) => {
      const kitchenId = food.user_id || food.seller_id;
      const kitchenProfile =
        kitchenMap[String(kitchenId)] || {};

      const foodRating =
        ratingMap[String(food.id)] || {
          total: 0,
          count: 0,
        };

      const ratingAverage =
        foodRating.count > 0
          ? foodRating.total / foodRating.count
          : 0;

      return {
        ...food,

        seller_id:
          food.seller_id || food.user_id || kitchenId,

        seller_online:
          kitchenProfile.seller_online !== undefined
            ? kitchenProfile.seller_online
            : food.seller_online !== false,

        seller_kitchen_name:
          kitchenProfile.seller_kitchen_name ||
          food.seller_kitchen_name ||
          food.seller ||
          "Home Kitchen",

        delivery_available:
          kitchenProfile.delivery_available !== undefined
            ? kitchenProfile.delivery_available
            : food.delivery_available !== false,

        pickup_available:
          kitchenProfile.pickup_available !== undefined
            ? kitchenProfile.pickup_available
            : food.pickup_available !== false,

        rating_average: ratingAverage,
        rating_count: foodRating.count,
      };
    });

    setHomeFoods(enrichedFoods);
    setLoadingFoods(false);
  }

  function getKitchenName(food) {
    return (
      food?.seller_kitchen_name ||
      food?.seller ||
      "Home Kitchen"
    );
  }

  function getInitial() {
    const name =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "N";

    return String(name).charAt(0).toUpperCase();
  }

  function clearFilters() {
    setSearchText("");
    setActiveCategory("All");
    setActiveFoodType("All");
  }

  function scrollToAllFood() {
    resultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function selectKitchen(kitchenName) {
    setSearchText(kitchenName);
    setActiveCategory("All");
    setActiveFoodType("All");

    window.setTimeout(() => {
      scrollToAllFood();
    }, 100);
  }

  const locationLabel = useMemo(() => {
    const apartment = profile?.apartment_name?.trim();
    const block = profile?.block?.trim();
    const flatNo = profile?.flat_no?.trim();
    const flat = profile?.flat?.trim();

    if (apartment && block) {
      return `${apartment}, ${block}`;
    }

    if (apartment) return apartment;
    if (flatNo) return `Flat ${flatNo}`;
    if (flat) return flat;

    return "Set your location";
  }, [profile]);

  const cartCount = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  const categoryCounts = useMemo(() => {
    const counts = {};

    CATEGORY_CHIPS.forEach((category) => {
      counts[category] = 0;
    });

    homeFoods.forEach((food) => {
      const category = String(
        food.category || "Meals"
      ).trim();

      counts.All += 1;

      if (counts[category] !== undefined) {
        counts[category] += 1;
      }
    });

    return counts;
  }, [homeFoods]);

  const filteredFoods = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return homeFoods.filter((food) => {
      const category = String(
        food?.category || ""
      ).toLowerCase();

      const type = String(
        food?.type || "Veg"
      ).toLowerCase();

      const name = String(
        food?.name || ""
      ).toLowerCase();

      const kitchen = String(
        getKitchenName(food)
      ).toLowerCase();

      const description = String(
        food?.description || ""
      ).toLowerCase();

      const preparationTime = String(
        food?.time || ""
      ).toLowerCase();

      const categoryMatch =
        activeCategory === "All" ||
        category === activeCategory.toLowerCase() ||
        category.includes(activeCategory.toLowerCase()) ||
        name.includes(activeCategory.toLowerCase());

      const typeMatch =
        activeFoodType === "All" ||
        type === activeFoodType.toLowerCase();

      const searchMatch =
        !search ||
        name.includes(search) ||
        kitchen.includes(search) ||
        category.includes(search) ||
        type.includes(search) ||
        description.includes(search) ||
        preparationTime.includes(search);

      return categoryMatch && typeMatch && searchMatch;
    });
  }, [
    homeFoods,
    activeCategory,
    activeFoodType,
    searchText,
  ]);

  const popularKitchens = useMemo(() => {
    const kitchenMap = new Map();

    homeFoods
      .filter((food) => {
        const stock = Number(food.stock || 0);

        return (
          stock > 0 &&
          food.seller_online !== false &&
          (food.delivery_available !== false ||
            food.pickup_available !== false)
        );
      })
      .forEach((food) => {
        const kitchenName = getKitchenName(food);

        const kitchenKey = String(
          food.seller_id ||
            food.user_id ||
            kitchenName.toLowerCase()
        );

        if (!kitchenMap.has(kitchenKey)) {
          kitchenMap.set(kitchenKey, {
            id: kitchenKey,
            name: kitchenName,
            image: food.image || "",
            items: [],
            ratingTotal: 0,
            ratingCount: 0,
          });
        }

        const kitchen = kitchenMap.get(kitchenKey);

        kitchen.items.push(food);

        if (!kitchen.image && food.image) {
          kitchen.image = food.image;
        }

        const foodRatingCount = Number(
          food.rating_count || 0
        );

        const foodRatingAverage = Number(
          food.rating_average || 0
        );

        kitchen.ratingTotal +=
          foodRatingAverage * foodRatingCount;

        kitchen.ratingCount += foodRatingCount;
      });

    return Array.from(kitchenMap.values())
      .map((kitchen) => ({
        ...kitchen,

        ratingAverage:
          kitchen.ratingCount > 0
            ? kitchen.ratingTotal / kitchen.ratingCount
            : 0,
      }))
      .sort((firstKitchen, secondKitchen) => {
        if (
          secondKitchen.ratingCount !==
          firstKitchen.ratingCount
        ) {
          return (
            secondKitchen.ratingCount -
            firstKitchen.ratingCount
          );
        }

        return (
          secondKitchen.items.length -
          firstKitchen.items.length
        );
      })
      .slice(0, 8);
  }, [homeFoods]);


  const hasActiveFilters =
    Boolean(searchText.trim()) ||
    activeCategory !== "All" ||
    activeFoodType !== "All";

  const shouldShowSellFood = true;

  const sellFoodPath =
    isSeller || isAdmin
      ? "/seller-dashboard"
      : "/seller-registration";

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[34px] font-black leading-none tracking-tight text-[#3F5128]">
              Nefo
            </h1>

            <Link
              to="/profile"
              className="mt-1 flex max-w-[230px] items-center gap-1 truncate text-left text-sm font-black text-[#6B6258]"
            >
              <LocationIcon />

              <span className="truncate">
                {locationLabel}
              </span>

              <ChevronDownIcon />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Cart"
            >
              <CartIcon />

              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#CF743D] px-1 text-[10px] font-black text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#CF743D]" />
              )}
            </Link>

            <Link
              to="/profile"
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#C86B37] bg-[#CF743D] text-sm font-black text-white shadow-[6px_6px_16px_rgba(63,81,40,0.1),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Profile"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitial()
              )}
            </Link>
          </div>
        </header>

        <section className="mt-5">
          <div className="flex items-center gap-3 rounded-[20px] border border-[#D8C9B3] bg-white/90 px-4 py-3 shadow-[inset_2px_2px_6px_rgba(63,81,40,0.04),inset_-2px_-2px_6px_rgba(255,255,255,0.9)]">
            <SearchIcon />

            <input
              ref={searchInputRef}
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80]"
              placeholder="Search food, kitchens or categories..."
            />

            {searchText ? (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0DF] text-lg font-black text-[#CF743D]"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
        </section>

        <section className="-mx-4 mt-4 overflow-x-auto px-4 scrollbar-hide">
          <div className="flex min-w-max gap-2">
            {FOOD_TYPE_CHIPS.map((foodType) => {
              const isActive =
                activeFoodType === foodType;

              return (
                <button
                  key={foodType}
                  type="button"
                  onClick={() =>
                    setActiveFoodType(foodType)
                  }
                  className={`rounded-full border px-5 py-2.5 text-sm font-black transition-all active:scale-95 ${
                    isActive
                      ? "border-[#CF743D] bg-[#FFF0DF] text-[#3F5128]"
                      : "border-[#EADFCE] bg-white/80 text-[#6B6258]"
                  }`}
                >
                  {foodType === "All"
                    ? "All food"
                    : foodType}
                </button>
              );
            })}
          </div>
        </section>

        <section className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
          <div className="flex min-w-max gap-2">
            {CATEGORY_CHIPS.map((category) => {
              const isActive =
                activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setActiveCategory(category)
                  }
                  className={`rounded-full border px-5 py-2.5 text-sm font-black transition-all active:scale-95 ${
                    isActive
                      ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                      : "border-[#EADFCE] bg-white/80 text-[#6B6258] shadow-[4px_4px_12px_rgba(63,81,40,0.05),-4px_-4px_12px_rgba(255,255,255,0.95)]"
                  }`}
                >
                  {category}

                  {category === "All" ? (
                    <span className="ml-1 opacity-70">
                      ({categoryCounts.All || 0})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {shouldShowSellFood ? (
          <section className="relative mt-4 overflow-hidden rounded-[24px] border border-[#4D612F] bg-[#3F5128] p-5 text-white shadow-lg shadow-[#3F5128]/15">
            <div className="absolute -right-7 -top-8 h-36 w-36 rounded-full bg-white/10" />

            <div className="absolute bottom-0 right-3 h-24 w-40 opacity-30">
              <MountainLineIcon />
            </div>

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                  Kitchen partner
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {isSeller || isAdmin
                    ? "Manage your kitchen"
                    : "Sell on Nefo"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-white/75">
                  {isSeller || isAdmin
                    ? "Manage orders, food and availability."
                    : "Start selling homemade food nearby."}
                </p>
              </div>

              <Link
                to={sellFoodPath}
                className="shrink-0 rounded-full border border-[#CF743D] bg-[#CF743D] px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/10 active:scale-95"
              >
                {isSeller || isAdmin ? "Open" : "Start"}
              </Link>
            </div>
          </section>
        ) : null}

        {!hasActiveFilters ? (
          <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black text-[#3F5128]">
                  Popular Kitchens
                </h2>

                <button
                  type="button"
                  onClick={scrollToAllFood}
                  className="inline-flex items-center gap-1 text-xs font-black text-[#CF743D]"
                >
                  See All <ChevronRightIcon />
                </button>
              </div>

              {loadingFoods ? (
                <div className="-mx-4 flex gap-3 overflow-hidden px-4">
                  <KitchenSkeleton />
                  <KitchenSkeleton />
                  <KitchenSkeleton />
                </div>
              ) : popularKitchens.length > 0 ? (
                <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
                  <div className="flex min-w-max gap-3">
                    {popularKitchens.map((kitchen) => (
                      <KitchenCard
                        key={kitchen.id}
                        kitchen={kitchen}
                        onSelect={selectKitchen}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyCard
                  title="No kitchens yet"
                  text="Nearby kitchens will appear here after dishes are uploaded."
                />
              )}
          </section>
        ) : null}

        <section
          ref={resultsRef}
          className="mt-7 scroll-mt-4"
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#CF743D]">
                Home Search
              </p>

              <h2 className="mt-1 text-xl font-black text-[#3F5128]">
                {hasActiveFilters
                  ? "Search Results"
                  : "All Food Near You"}
              </h2>

              {!loadingFoods ? (
                <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                  {filteredFoods.length}{" "}
                  {filteredFoods.length === 1
                    ? "dish"
                    : "dishes"}{" "}
                  found
                </p>
              ) : null}
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95"
              >
                Clear
              </button>
            ) : null}
          </div>

          {foodError ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
              <p className="font-black text-red-600">
                Food could not be loaded
              </p>

              <p className="mt-1 text-sm font-semibold text-red-500">
                {foodError}
              </p>

              <button
                type="button"
                onClick={() => fetchHomeFoods()}
                className="mt-4 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white"
              >
                Try Again
              </button>
            </div>
          ) : loadingFoods ? (
            <div className="space-y-3">
              <FoodSkeleton />
              <FoodSkeleton />
              <FoodSkeleton />
            </div>
          ) : filteredFoods.length > 0 ? (
            <div className="space-y-3">
              {filteredFoods.map((food) => (
                <FoodCard
                  key={food.id}
                  item={food}
                />
              ))}
            </div>
          ) : (
            <div className={`p-8 text-center ${CARD}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-3xl">
                🔎
              </div>

              <h3 className="mt-4 text-xl font-black text-[#181411]">
                No matching food
              </h3>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                Try another dish, kitchen, category, or food type.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-6 py-3 text-sm font-black text-white"
              >
                Show All Food
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KitchenCard({ kitchen, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(kitchen.name)}
      className="w-[138px] shrink-0 overflow-hidden rounded-[24px] border border-[#EADFCE] bg-white/90 text-left shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-[0.98]"
    >
      <div className="h-[98px] overflow-hidden bg-[#FFF0DF]">
        {kitchen.image ? (
          <img
            src={kitchen.image}
            alt={kitchen.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            🍲
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="truncate text-sm font-black text-[#181411]">
          {kitchen.name}
        </h3>

        {kitchen.ratingCount > 0 ? (
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#6B6258]">
            <span className="text-[#F59E0B]">★</span>

            <span>
              {kitchen.ratingAverage.toFixed(1)}
            </span>

            <span>
              ({kitchen.ratingCount})
            </span>
          </div>
        ) : (
          <p className="mt-1 text-[10px] font-bold text-[#6B6258]">
            {kitchen.items.length}{" "}
            {kitchen.items.length === 1
              ? "dish"
              : "dishes"}
          </p>
        )}
      </div>
    </button>
  );
}

function EmptyCard({ title, text }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#EADFCE] bg-white/85 p-6 text-center shadow-[6px_6px_16px_rgba(63,81,40,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]">
      <div className="pointer-events-none absolute -left-7 bottom-0 text-[90px] leading-none text-[#EADFCE]/70">
        ❧
      </div>

      <div className="pointer-events-none absolute -right-7 bottom-0 text-[90px] leading-none text-[#EADFCE]/70">
        ❧
      </div>

      <div className="relative z-10">
        <div className="text-4xl">🍲</div>

        <h3 className="mt-3 text-lg font-black text-[#181411]">
          {title}
        </h3>

        <p className="mt-1 text-sm font-semibold text-[#6B6258]">
          {text}
        </p>
      </div>
    </div>
  );
}

function KitchenSkeleton() {
  return (
    <div className="h-[154px] w-[138px] shrink-0 animate-pulse rounded-[24px] border border-[#EADFCE] bg-white/90 shadow-sm" />
  );
}

function FoodSkeleton() {
  return (
    <div className="h-[120px] animate-pulse rounded-[24px] border border-[#EADFCE] bg-white/90 shadow-sm" />
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-[#CF743D]"
      fill="currentColor"
    >
      <path d="M12 2.5A7.5 7.5 0 0 0 4.5 10c0 5.25 7.5 11.5 7.5 11.5S19.5 15.25 19.5 10A7.5 7.5 0 0 0 12 2.5Zm0 10.25A2.75 2.75 0 1 1 12 7.25a2.75 2.75 0 0 1 0 5.5Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
    >
      <path d="M9 6l6 6-6 6" />
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

function MountainLineIcon() {
  return (
    <svg
      viewBox="0 0 220 120"
      className="h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 92C35 58 59 44 84 67C112 23 140 16 169 58C188 36 203 42 216 68" />
      <path d="M12 104C47 84 72 80 103 93C134 106 164 93 211 83" />
      <path d="M52 91C72 70 94 70 113 87C134 66 154 62 177 81" />
      <path d="M96 75L118 61L142 77" />
      <path d="M118 61V92" />
    </svg>
  );
}
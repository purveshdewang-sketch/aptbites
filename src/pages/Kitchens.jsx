import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import FoodCard from "../components/FoodCard";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";

const AVAILABILITY_FILTERS = [
  {
    key: "all",
    label: "All Kitchens",
  },
  {
    key: "open",
    label: "Open Now",
  },
  {
    key: "delivery",
    label: "Delivery",
  },
  {
    key: "pickup",
    label: "Pickup",
  },
];

const CARD =
  "rounded-[26px] border border-[#EADFCE] bg-white/95 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getKitchenId(food) {
  return String(
    food?.seller_id ||
      food?.user_id ||
      ""
  );
}

function getKitchenName(food) {
  return (
    food?.seller_kitchen_name ||
    food?.seller ||
    "Home Kitchen"
  );
}

function isFoodAvailable(food) {
  const stock = Number(
    food?.stock || 0
  );

  const kitchenOnline =
    food?.seller_online !== false;

  const fulfillmentAvailable =
    food?.delivery_available !==
      false ||
    food?.pickup_available !==
      false;

  return (
    stock > 0 &&
    kitchenOnline &&
    fulfillmentAvailable
  );
}

export default function Kitchens() {
  const navigate = useNavigate();

  const { cartItems } = useCart();

  const menuSectionRef =
    useRef(null);

  const [foods, setFoods] =
    useState([]);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    activeAvailabilityFilter,
    setActiveAvailabilityFilter,
  ] = useState("all");

  const [
    selectedKitchenId,
    setSelectedKitchenId,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("All");

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    fetchKitchenData();

    const foodsChannel = supabase
      .channel(
        "NeFo-kitchens-foods"
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchKitchenData(false);
        }
      )
      .subscribe();

    const profilesChannel =
      supabase
        .channel(
          "NeFo-kitchens-profiles"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => {
            fetchKitchenData(false);
          }
        )
        .subscribe();

    const ratingsChannel =
      supabase
        .channel(
          "NeFo-kitchens-ratings"
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "food_ratings",
          },
          () => {
            fetchKitchenData(false);
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        foodsChannel
      );

      supabase.removeChannel(
        profilesChannel
      );

      supabase.removeChannel(
        ratingsChannel
      );
    };
  }, []);

  async function fetchKitchenData(
    showLoading = true
  ) {
    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage("");

    const {
      data: foodData,
      error: foodError,
    } = await supabase
      .from("foods")
      .select("*")
      .order("id", {
        ascending: false,
      });

    if (foodError) {
      setFoods([]);

      setErrorMessage(
        foodError.message
      );

      setLoading(false);
      return;
    }

    const foodRows =
      foodData || [];

    const kitchenIds = [
      ...new Set(
        foodRows
          .map((food) =>
            getKitchenId(food)
          )
          .filter(Boolean)
      ),
    ];

    let kitchenProfileMap = {};

    if (
      kitchenIds.length > 0
    ) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, seller_kitchen_name, seller_online, delivery_available, pickup_available"
        )
        .in("id", kitchenIds);

      if (!profileError) {
        kitchenProfileMap = (
          profileData || []
        ).reduce(
          (
            result,
            profile
          ) => {
            result[
              String(profile.id)
            ] = profile;

            return result;
          },
          {}
        );
      }
    }

    const ratingMap = {};

    const {
      data: ratingData,
      error: ratingError,
    } = await supabase
      .from("food_ratings")
      .select(
        "food_id, rating"
      );

    if (!ratingError) {
      (
        ratingData || []
      ).forEach((ratingRow) => {
        const foodId = String(
          ratingRow.food_id ||
            ""
        );

        const ratingValue =
          Number(
            ratingRow.rating || 0
          );

        if (
          !foodId ||
          ratingValue < 1 ||
          ratingValue > 5
        ) {
          return;
        }

        if (
          !ratingMap[foodId]
        ) {
          ratingMap[foodId] = {
            total: 0,
            count: 0,
          };
        }

        ratingMap[
          foodId
        ].total += ratingValue;

        ratingMap[
          foodId
        ].count += 1;
      });
    }

    const enrichedFoods =
      foodRows.map((food) => {
        const kitchenId =
          getKitchenId(food);

        const kitchenProfile =
          kitchenProfileMap[
            kitchenId
          ] || {};

        const ratingDataForFood =
          ratingMap[
            String(food.id)
          ] || {
            total: 0,
            count: 0,
          };

        const ratingAverage =
          ratingDataForFood.count >
          0
            ? ratingDataForFood.total /
              ratingDataForFood.count
            : 0;

        return {
          ...food,

          seller_id:
            food.seller_id ||
            food.user_id,

          seller_kitchen_name:
            kitchenProfile.seller_kitchen_name ||
            food.seller_kitchen_name ||
            food.seller ||
            "Home Kitchen",

          seller_full_name:
            kitchenProfile.full_name ||
            "",

          seller_avatar_url:
            kitchenProfile.avatar_url ||
            "",

          seller_online:
            kitchenProfile.seller_online !==
            undefined
              ? kitchenProfile.seller_online
              : food.seller_online !==
                false,

          delivery_available:
            kitchenProfile.delivery_available !==
            undefined
              ? kitchenProfile.delivery_available
              : food.delivery_available !==
                false,

          pickup_available:
            kitchenProfile.pickup_available !==
            undefined
              ? kitchenProfile.pickup_available
              : food.pickup_available !==
                false,

          rating_average:
            ratingAverage,

          rating_count:
            ratingDataForFood.count,
        };
      });

    setFoods(enrichedFoods);
    setLoading(false);
  }

  const cartCount =
    useMemo(() => {
      return cartItems.reduce(
        (total, item) =>
          total +
          Number(
            item.quantity || 0
          ),
        0
      );
    }, [cartItems]);

  const kitchens = useMemo(() => {
    const kitchenMap =
      new Map();

    foods.forEach((food) => {
      const kitchenName =
        getKitchenName(food);

      const kitchenId =
        getKitchenId(food) ||
        normalizeText(
          kitchenName
        );

      if (
        !kitchenMap.has(
          kitchenId
        )
      ) {
        kitchenMap.set(
          kitchenId,
          {
            id: kitchenId,
            name: kitchenName,
            sellerName:
              food.seller_full_name ||
              "",
            avatar:
              food.seller_avatar_url ||
              "",
            image:
              food.image || "",
            online:
              food.seller_online !==
              false,
            deliveryAvailable:
              food.delivery_available !==
              false,
            pickupAvailable:
              food.pickup_available !==
              false,
            items: [],
            availableItems: [],
            categories:
              new Set(),
            ratingTotal: 0,
            ratingCount: 0,
          }
        );
      }

      const kitchen =
        kitchenMap.get(
          kitchenId
        );

      kitchen.items.push(food);

      if (
        isFoodAvailable(food)
      ) {
        kitchen.availableItems.push(
          food
        );
      }

      const category = String(
        food.category ||
          "Meals"
      ).trim();

      if (category) {
        kitchen.categories.add(
          category
        );
      }

      if (
        !kitchen.image &&
        food.image
      ) {
        kitchen.image =
          food.image;
      }

      if (
        !kitchen.avatar &&
        food.seller_avatar_url
      ) {
        kitchen.avatar =
          food.seller_avatar_url;
      }

      const ratingCount =
        Number(
          food.rating_count || 0
        );

      const ratingAverage =
        Number(
          food.rating_average || 0
        );

      kitchen.ratingTotal +=
        ratingAverage *
        ratingCount;

      kitchen.ratingCount +=
        ratingCount;
    });

    return Array.from(
      kitchenMap.values()
    )
      .map((kitchen) => ({
        ...kitchen,

        categories:
          Array.from(
            kitchen.categories
          ).sort(),

        ratingAverage:
          kitchen.ratingCount >
          0
            ? kitchen.ratingTotal /
              kitchen.ratingCount
            : 0,

        isOpen:
          kitchen.online &&
          (kitchen.deliveryAvailable ||
            kitchen.pickupAvailable) &&
          kitchen.availableItems
            .length > 0,
      }))
      .sort(
        (
          firstKitchen,
          secondKitchen
        ) => {
          if (
            firstKitchen.isOpen !==
            secondKitchen.isOpen
          ) {
            return firstKitchen.isOpen
              ? -1
              : 1;
          }

          if (
            secondKitchen.ratingAverage !==
            firstKitchen.ratingAverage
          ) {
            return (
              secondKitchen.ratingAverage -
              firstKitchen.ratingAverage
            );
          }

          return (
            secondKitchen.availableItems
              .length -
            firstKitchen.availableItems
              .length
          );
        }
      );
  }, [foods]);

  const filteredKitchens =
    useMemo(() => {
      const search =
        normalizeText(
          searchText
        );

      return kitchens.filter(
        (kitchen) => {
          const availabilityMatch =
            activeAvailabilityFilter ===
              "all" ||
            (activeAvailabilityFilter ===
              "open" &&
              kitchen.isOpen) ||
            (activeAvailabilityFilter ===
              "delivery" &&
              kitchen.online &&
              kitchen.deliveryAvailable) ||
            (activeAvailabilityFilter ===
              "pickup" &&
              kitchen.online &&
              kitchen.pickupAvailable);

          if (
            !availabilityMatch
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          const kitchenName =
            normalizeText(
              kitchen.name
            );

          const sellerName =
            normalizeText(
              kitchen.sellerName
            );

          const dishMatch =
            kitchen.items.some(
              (food) => {
                const foodName =
                  normalizeText(
                    food.name
                  );

                const category =
                  normalizeText(
                    food.category
                  );

                const type =
                  normalizeText(
                    food.type
                  );

                const description =
                  normalizeText(
                    food.description
                  );

                return (
                  foodName.includes(
                    search
                  ) ||
                  category.includes(
                    search
                  ) ||
                  type.includes(
                    search
                  ) ||
                  description.includes(
                    search
                  )
                );
              }
            );

          return (
            kitchenName.includes(
              search
            ) ||
            sellerName.includes(
              search
            ) ||
            dishMatch
          );
        }
      );
    }, [
      kitchens,
      searchText,
      activeAvailabilityFilter,
    ]);

  const selectedKitchen =
    useMemo(() => {
      return (
        kitchens.find(
          (kitchen) =>
            kitchen.id ===
            selectedKitchenId
        ) || null
      );
    }, [
      kitchens,
      selectedKitchenId,
    ]);

  const selectedKitchenFoods =
    useMemo(() => {
      if (!selectedKitchen) {
        return [];
      }

      if (
        selectedCategory ===
        "All"
      ) {
        return selectedKitchen.items;
      }

      return selectedKitchen.items.filter(
        (food) =>
          normalizeText(
            food.category
          ) ===
          normalizeText(
            selectedCategory
          )
      );
    }, [
      selectedKitchen,
      selectedCategory,
    ]);

  function openKitchenMenu(
    kitchenId
  ) {
    setSelectedKitchenId(
      kitchenId
    );

    setSelectedCategory(
      "All"
    );

    window.setTimeout(() => {
      menuSectionRef.current?.scrollIntoView(
        {
          behavior: "smooth",
          block: "start",
        }
      );
    }, 100);
  }

  function closeKitchenMenu() {
    setSelectedKitchenId("");
    setSelectedCategory(
      "All"
    );
  }

  function clearFilters() {
    setSearchText("");

    setActiveAvailabilityFilter(
      "all"
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/95 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Go back"
            >
              <BackIcon />
            </button>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#CF743D]">
                NeFo
              </p>

              <h1 className="mt-1 text-3xl font-black leading-none text-[#3F5128]">
                Kitchens
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6B6258]">
                Homemade food from
                kitchens near you.
              </p>
            </div>
          </div>

          <Link
            to="/cart"
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/95 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Cart"
          >
            <CartIcon />

            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#CF743D] px-1 text-[10px] font-black text-white">
                {cartCount > 9
                  ? "9+"
                  : cartCount}
              </span>
            ) : null}
          </Link>
        </header>

        <section className="mt-5">
          <div className="flex items-center gap-3 rounded-[20px] border border-[#D8C9B3] bg-white/95 px-4 py-3 shadow-[inset_2px_2px_6px_rgba(63,81,40,0.04),inset_-2px_-2px_6px_rgba(255,255,255,0.9)]">
            <SearchIcon />

            <input
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80]"
              placeholder="Search kitchen, dish or category..."
            />

            {searchText ? (
              <button
                type="button"
                onClick={() =>
                  setSearchText("")
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-[#FFF0DF] text-lg font-black text-[#CF743D] active:scale-95"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
        </section>

        <section className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 scrollbar-hide">
          <div className="flex min-w-max gap-2">
            {AVAILABILITY_FILTERS.map(
              (filter) => {
                const active =
                  activeAvailabilityFilter ===
                  filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() =>
                      setActiveAvailabilityFilter(
                        filter.key
                      )
                    }
                    className={`rounded-full border px-5 py-2.5 text-sm font-black transition-all active:scale-95 ${
                      active
                        ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                        : "border-[#EADFCE] bg-white/90 text-[#6B6258]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatCard
            label="Kitchens"
            value={kitchens.length}
          />

          <StatCard
            label="Open"
            value={
              kitchens.filter(
                (kitchen) =>
                  kitchen.isOpen
              ).length
            }
          />

          <StatCard
            label="Dishes"
            value={foods.length}
            strong
          />
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#CF743D]">
                Neighbour kitchens
              </p>

              <h2 className="mt-1 text-xl font-black text-[#3F5128]">
                Explore kitchens
              </h2>

              {!loading ? (
                <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                  {
                    filteredKitchens.length
                  }{" "}
                  {filteredKitchens.length ===
                  1
                    ? "kitchen"
                    : "kitchens"}{" "}
                  found
                </p>
              ) : null}
            </div>

            {(searchText ||
              activeAvailabilityFilter !==
                "all") ? (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="shrink-0 rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95"
              >
                Clear
              </button>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
              <p className="font-black text-red-600">
                Kitchens could not
                load
              </p>

              <p className="mt-1 text-sm font-semibold text-red-500">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() =>
                  fetchKitchenData()
                }
                className="mt-4 rounded-2xl border border-red-600 bg-red-600 px-5 py-3 text-sm font-black text-white active:scale-95"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              <KitchenSkeleton />
              <KitchenSkeleton />
              <KitchenSkeleton />
            </div>
          ) : filteredKitchens.length >
            0 ? (
            <div className="space-y-4">
              {filteredKitchens.map(
                (kitchen) => (
                  <KitchenCard
                    key={
                      kitchen.id
                    }
                    kitchen={
                      kitchen
                    }
                    selected={
                      kitchen.id ===
                      selectedKitchenId
                    }
                    onOpen={() =>
                      openKitchenMenu(
                        kitchen.id
                      )
                    }
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              onClear={clearFilters}
            />
          )}
        </section>

        {selectedKitchen ? (
          <section
            ref={menuSectionRef}
            className="mt-8 scroll-mt-4"
          >
            <div
              className={`overflow-hidden ${CARD}`}
            >
              <div className="relative overflow-hidden border-b border-[#4D612F] bg-[#3F5128] p-5 text-white">
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />

                <div className="relative z-10">
                  <div className="flex items-start gap-3">
                    <KitchenImage
                      kitchen={
                        selectedKitchen
                      }
                      large
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-wide text-[#F3C06E]">
                        Kitchen menu
                      </p>

                      <h2 className="mt-1 truncate text-2xl font-black">
                        {
                          selectedKitchen.name
                        }
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                            selectedKitchen.isOpen
                              ? "border-green-300/30 bg-green-400/15 text-green-100"
                              : "border-red-300/30 bg-red-400/15 text-red-100"
                          }`}
                        >
                          {selectedKitchen.isOpen
                            ? "Open now"
                            : "Currently unavailable"}
                        </span>

                        {selectedKitchen.ratingCount >
                        0 ? (
                          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black text-white">
                            ★{" "}
                            {selectedKitchen.ratingAverage.toFixed(
                              1
                            )}{" "}
                            (
                            {
                              selectedKitchen.ratingCount
                            }
                            )
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        closeKitchenMenu
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl font-black text-white active:scale-95"
                      aria-label="Close menu"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedKitchen.deliveryAvailable ? (
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black text-white">
                        🚚 Delivery
                      </span>
                    ) : null}

                    {selectedKitchen.pickupAvailable ? (
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black text-white">
                        🛍️ Pickup
                      </span>
                    ) : null}

                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black text-white">
                      {
                        selectedKitchen.availableItems
                          .length
                      }{" "}
                      available
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="-mx-1 overflow-x-auto px-1 pb-2 scrollbar-hide">
                  <div className="flex min-w-max gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategory(
                          "All"
                        )
                      }
                      className={`rounded-full border px-4 py-2.5 text-xs font-black active:scale-95 ${
                        selectedCategory ===
                        "All"
                          ? "border-[#3F5128] bg-[#3F5128] text-white"
                          : "border-[#D8C9B3] bg-[#FFFDF7] text-[#3F5128]"
                      }`}
                    >
                      All (
                      {
                        selectedKitchen.items
                          .length
                      }
                      )
                    </button>

                    {selectedKitchen.categories.map(
                      (category) => {
                        const categoryCount =
                          selectedKitchen.items.filter(
                            (food) =>
                              normalizeText(
                                food.category
                              ) ===
                              normalizeText(
                                category
                              )
                          ).length;

                        const active =
                          selectedCategory ===
                          category;

                        return (
                          <button
                            key={
                              category
                            }
                            type="button"
                            onClick={() =>
                              setSelectedCategory(
                                category
                              )
                            }
                            className={`rounded-full border px-4 py-2.5 text-xs font-black active:scale-95 ${
                              active
                                ? "border-[#CF743D] bg-[#FFF0DF] text-[#3F5128]"
                                : "border-[#D8C9B3] bg-[#FFFDF7] text-[#6B6258]"
                            }`}
                          >
                            {category} (
                            {
                              categoryCount
                            }
                            )
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {selectedKitchenFoods.length >
                0 ? (
                  <div className="mt-4 space-y-3">
                    {selectedKitchenFoods.map(
                      (food) => (
                        <FoodCard
                          key={
                            food.id
                          }
                          item={
                            food
                          }
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[22px] border border-[#EADFCE] bg-[#FFFDF7] p-6 text-center">
                    <div className="text-3xl">
                      🍽️
                    </div>

                    <p className="mt-3 font-black text-[#181411]">
                      No dishes in this
                      category
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategory(
                          "All"
                        )
                      }
                      className="mt-4 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-5 py-3 text-sm font-black text-white active:scale-95"
                    >
                      View Full Menu
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function KitchenCard({
  kitchen,
  selected,
  onOpen,
}) {
  const previewDishes =
    kitchen.items
      .slice(0, 3)
      .map((food) => food.name)
      .filter(Boolean);

  return (
    <article
      className={`overflow-hidden rounded-[26px] border bg-white/95 shadow-[8px_8px_22px_rgba(63,81,40,0.07),-8px_-8px_22px_rgba(255,255,255,0.95)] ${
        selected
          ? "border-[#3F5128]"
          : "border-[#EADFCE]"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <KitchenImage
            kitchen={kitchen}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-[#181411]">
                  {kitchen.name}
                </h3>

                {kitchen.sellerName ? (
                  <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                    By{" "}
                    {
                      kitchen.sellerName
                    }
                  </p>
                ) : null}
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black ${
                  kitchen.isOpen
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {kitchen.isOpen
                  ? "Open"
                  : "Closed"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#6B6258]">
              {kitchen.ratingCount >
              0 ? (
                <span className="text-[#3F5128]">
                  <span className="text-[#F59E0B]">
                    ★
                  </span>{" "}
                  {kitchen.ratingAverage.toFixed(
                    1
                  )}{" "}
                  (
                  {
                    kitchen.ratingCount
                  }
                  )
                </span>
              ) : (
                <span>
                  New kitchen
                </span>
              )}

              <span>
                {
                  kitchen.availableItems
                    .length
                }{" "}
                available
              </span>

              <span>
                {
                  kitchen.items.length
                }{" "}
                total
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {kitchen.deliveryAvailable ? (
            <span className="rounded-full border border-[#EADFCE] bg-[#FFFDF7] px-3 py-1.5 text-[10px] font-black text-[#3F5128]">
              🚚 Delivery
            </span>
          ) : null}

          {kitchen.pickupAvailable ? (
            <span className="rounded-full border border-[#EADFCE] bg-[#FFFDF7] px-3 py-1.5 text-[10px] font-black text-[#3F5128]">
              🛍️ Pickup
            </span>
          ) : null}

          {kitchen.categories
            .slice(0, 2)
            .map((category) => (
              <span
                key={category}
                className="rounded-full border border-[#EADFCE] bg-[#FFF0DF] px-3 py-1.5 text-[10px] font-black text-[#CF743D]"
              >
                {category}
              </span>
            ))}
        </div>

        {previewDishes.length >
        0 ? (
          <p className="mt-3 line-clamp-2 text-xs font-semibold leading-relaxed text-[#6B6258]">
            {previewDishes.join(
              " • "
            )}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#EADFCE] bg-[#FFFDF7] px-4 py-3">
        <p className="text-xs font-bold text-[#6B6258]">
          {kitchen.isOpen
            ? "Accepting orders"
            : "Menu can still be viewed"}
        </p>

        <button
          type="button"
          onClick={onOpen}
          className={`inline-flex items-center gap-1 rounded-full border px-4 py-2.5 text-xs font-black active:scale-95 ${
            selected
              ? "border-[#CF743D] bg-[#FFF0DF] text-[#CF743D]"
              : "border-[#3F5128] bg-[#3F5128] text-white"
          }`}
        >
          {selected
            ? "Menu Open"
            : "View Menu"}

          <ChevronRightIcon />
        </button>
      </div>
    </article>
  );
}

function KitchenImage({
  kitchen,
  large = false,
}) {
  const imageSource =
    kitchen.avatar ||
    kitchen.image ||
    "";

  const sizeClass = large
    ? "h-16 w-16"
    : "h-20 w-20";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-[#D8C9B3] bg-[#FFF0DF] ${sizeClass}`}
    >
      {imageSource ? (
        <img
          src={imageSource}
          alt={kitchen.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className={`font-black text-[#3F5128] ${
            large
              ? "text-2xl"
              : "text-3xl"
          }`}
        >
          {String(
            kitchen.name ||
              "K"
          )
            .charAt(0)
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  strong = false,
}) {
  return (
    <div className="rounded-[20px] border border-[#EADFCE] bg-white/95 p-3 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[9px] font-black uppercase tracking-wide text-[#6B6258]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          strong
            ? "text-[#CF743D]"
            : "text-[#3F5128]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function KitchenSkeleton() {
  return (
    <div className="animate-pulse rounded-[26px] border border-[#EADFCE] bg-white/95 p-4">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 rounded-[20px] bg-[#F1E8DC]" />

        <div className="flex-1">
          <div className="h-5 w-2/3 rounded-full bg-[#F1E8DC]" />

          <div className="mt-3 h-3 w-1/2 rounded-full bg-[#F1E8DC]" />

          <div className="mt-3 h-3 w-3/4 rounded-full bg-[#F1E8DC]" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="h-7 w-20 rounded-full bg-[#F1E8DC]" />
        <div className="h-7 w-20 rounded-full bg-[#F1E8DC]" />
      </div>
    </div>
  );
}

function EmptyState({
  onClear,
}) {
  return (
    <div
      className={`p-8 text-center ${CARD}`}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-3xl">
        🏠
      </div>

      <h3 className="mt-4 text-xl font-black text-[#181411]">
        No kitchens found
      </h3>

      <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
        Try another kitchen name,
        dish, category or
        availability option.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-5 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-6 py-3 text-sm font-black text-white active:scale-95"
      >
        Show All Kitchens
      </button>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-[#6B6258]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
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
      <path d="M3 4h2l2 11h10l2-8H7" />

      <circle
        cx="9"
        cy="19"
        r="1.5"
      />

      <circle
        cx="17"
        cy="19"
        r="1.5"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
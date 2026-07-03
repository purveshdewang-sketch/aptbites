import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabaseClient";

const FILTERS = [
  "All",
  "Open",
  "Delivery",
  "Pickup",
];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getSellerId(food) {
  return String(
    food?.user_id ||
      food?.seller_id ||
      ""
  );
}

function getFoodKitchenName(food) {
  return (
    food?.seller_kitchen_name ||
    food?.seller ||
    "Home Kitchen"
  );
}

export default function Kitchens() {
  const navigate = useNavigate();

  const [kitchens, setKitchens] =
    useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    fetchKitchens();

    const foodsChannel = supabase
      .channel("all-kitchens-foods-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchKitchens(false);
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("all-kitchens-profiles-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchKitchens(false);
        }
      )
      .subscribe();

    const ratingsChannel = supabase
      .channel("all-kitchens-ratings-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_ratings",
        },
        () => {
          fetchKitchens(false);
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

  async function fetchProfiles() {
    const fullResult = await supabase
      .from("profiles")
      .select(
        "id, role, is_seller, seller_application_status, seller_kitchen_name, seller_online, delivery_available, pickup_available, full_name, avatar_url"
      );

    if (!fullResult.error) {
      return fullResult;
    }

    return supabase
      .from("profiles")
      .select(
        "id, role, is_seller, seller_application_status, seller_kitchen_name, seller_online, delivery_available, pickup_available, full_name"
      );
  }

  async function fetchKitchens(
    showLoading = true
  ) {
    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage("");

    const [
      profilesResult,
      foodsResult,
      ratingsResult,
    ] = await Promise.all([
      fetchProfiles(),

      supabase
        .from("foods")
        .select("*")
        .order("id", {
          ascending: false,
        }),

      supabase
        .from("food_ratings")
        .select("food_id, rating"),
    ]);

    if (
      profilesResult.error &&
      foodsResult.error
    ) {
      setKitchens([]);

      setErrorMessage(
        profilesResult.error.message ||
          foodsResult.error.message ||
          "Kitchens could not be loaded."
      );

      setLoading(false);
      return;
    }

    const profiles =
      profilesResult.data || [];

    const foods =
      foodsResult.data || [];

    const ratings =
      ratingsResult.data || [];

    const ratingMap = {};

    ratings.forEach((ratingRow) => {
      const foodId = String(
        ratingRow.food_id || ""
      );

      const ratingValue = Number(
        ratingRow.rating || 0
      );

      if (
        !foodId ||
        ratingValue <= 0
      ) {
        return;
      }

      if (!ratingMap[foodId]) {
        ratingMap[foodId] = {
          total: 0,
          count: 0,
        };
      }

      ratingMap[foodId].total +=
        ratingValue;

      ratingMap[foodId].count += 1;
    });

    const kitchenMap = new Map();

    profiles
      .filter((profile) => {
        const role = normalizeText(
          profile.role
        );

        const hasKitchenName =
          Boolean(
            String(
              profile.seller_kitchen_name ||
                ""
            ).trim()
          );

        return (
          profile.is_seller === true ||
          role === "seller" ||
          role === "admin" ||
          hasKitchenName
        );
      })
      .forEach((profile) => {
        const profileId = String(
          profile.id || ""
        );

        if (!profileId) return;

        const kitchenName =
          profile.seller_kitchen_name ||
          profile.full_name ||
          "Home Kitchen";

        kitchenMap.set(profileId, {
          id: profileId,
          name: kitchenName,
          ownerName:
            profile.full_name || "",
          image:
            profile.avatar_url || "",
          sellerOnline:
            profile.seller_online !==
            false,
          deliveryAvailable:
            profile.delivery_available !==
            false,
          pickupAvailable:
            profile.pickup_available !==
            false,
          applicationStatus:
            profile.seller_application_status ||
            "",
          foods: [],
          availableFoods: 0,
          ratingTotal: 0,
          ratingCount: 0,
        });
      });

    foods.forEach((food) => {
      const sellerId =
        getSellerId(food);

      if (!sellerId) return;

      if (!kitchenMap.has(sellerId)) {
        kitchenMap.set(sellerId, {
          id: sellerId,
          name:
            getFoodKitchenName(food),
          ownerName: "",
          image: food.image || "",
          sellerOnline:
            food.seller_online !==
            false,
          deliveryAvailable:
            food.delivery_available !==
            false,
          pickupAvailable:
            food.pickup_available !==
            false,
          applicationStatus: "",
          foods: [],
          availableFoods: 0,
          ratingTotal: 0,
          ratingCount: 0,
        });
      }

      const kitchen =
        kitchenMap.get(sellerId);

      kitchen.foods.push(food);

      if (
        !kitchen.image &&
        food.image
      ) {
        kitchen.image = food.image;
      }

      if (
        Number(food.stock || 0) > 0
      ) {
        kitchen.availableFoods += 1;
      }

      const foodRating =
        ratingMap[
          String(food.id)
        ] || {
          total: 0,
          count: 0,
        };

      kitchen.ratingTotal +=
        foodRating.total;

      kitchen.ratingCount +=
        foodRating.count;
    });

    const nextKitchens = Array.from(
      kitchenMap.values()
    )
      .map((kitchen) => ({
        ...kitchen,

        ratingAverage:
          kitchen.ratingCount > 0
            ? kitchen.ratingTotal /
              kitchen.ratingCount
            : 0,

        searchableFoodNames:
          kitchen.foods
            .map((food) => food.name)
            .filter(Boolean)
            .join(" "),
      }))
      .sort((first, second) => {
        if (
          first.sellerOnline !==
          second.sellerOnline
        ) {
          return first.sellerOnline
            ? -1
            : 1;
        }

        if (
          second.foods.length !==
          first.foods.length
        ) {
          return (
            second.foods.length -
            first.foods.length
          );
        }

        return first.name.localeCompare(
          second.name
        );
      });

    setKitchens(nextKitchens);
    setLoading(false);
  }

  const filteredKitchens =
    useMemo(() => {
      const search =
        normalizeText(searchText);

      return kitchens.filter(
        (kitchen) => {
          const matchesSearch =
            !search ||
            normalizeText(
              kitchen.name
            ).includes(search) ||
            normalizeText(
              kitchen.ownerName
            ).includes(search) ||
            normalizeText(
              kitchen.searchableFoodNames
            ).includes(search);

          const matchesFilter =
            activeFilter === "All" ||
            (activeFilter === "Open" &&
              kitchen.sellerOnline) ||
            (activeFilter ===
              "Delivery" &&
              kitchen.deliveryAvailable) ||
            (activeFilter === "Pickup" &&
              kitchen.pickupAvailable);

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      kitchens,
      searchText,
      activeFilter,
    ]);

  function openKitchen(kitchen) {
    const query =
      encodeURIComponent(kitchen.name);

    navigate(
      `/?q=${query}&search=1`
    );
  }

  function clearFilters() {
    setSearchText("");
    setActiveFilter("All");
  }

  const hasActiveFilters =
    Boolean(searchText.trim()) ||
    activeFilter !== "All";

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8C9B3] bg-white/95 text-[#3F5128] shadow-[5px_5px_14px_rgba(63,81,40,0.08),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Back to home"
          >
            <BackIcon />
          </Link>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#CF743D]">
              Discover
            </p>

            <h1 className="text-2xl font-black text-[#3F5128]">
              All Kitchens
            </h1>
          </div>
        </header>

        <section className="mt-5 rounded-[24px] border border-[#4D612F] bg-[#3F5128] p-5 text-white shadow-lg shadow-[#3F5128]/15">
          <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
            Nefo kitchens
          </p>

          <h2 className="mt-1 text-xl font-black">
            Find food made nearby
          </h2>

          <p className="mt-2 text-sm font-semibold leading-relaxed text-white/75">
            Browse every kitchen, check
            availability and open its
            current food menu.
          </p>
        </section>

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
              placeholder="Search kitchens or food..."
            />

            {searchText ? (
              <button
                type="button"
                onClick={() =>
                  setSearchText("")
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-[#FFF0DF] text-lg font-black text-[#CF743D]"
                aria-label="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
        </section>

        <section className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 scrollbar-hide">
          <div className="flex min-w-max gap-2">
            {FILTERS.map((filter) => {
              const isActive =
                activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setActiveFilter(
                      filter
                    )
                  }
                  className={`rounded-full border px-5 py-2.5 text-sm font-black transition-all active:scale-95 ${
                    isActive
                      ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                      : "border-[#EADFCE] bg-white/90 text-[#6B6258]"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[#3F5128]">
                Kitchens
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

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95"
              >
                Clear
              </button>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
              <p className="font-black text-red-600">
                Kitchens could not be
                loaded
              </p>

              <p className="mt-1 text-sm font-semibold text-red-500">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() =>
                  fetchKitchens()
                }
                className="mt-4 rounded-2xl border border-red-600 bg-red-600 px-5 py-3 text-sm font-black text-white"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 gap-3">
              <KitchenSkeleton />
              <KitchenSkeleton />
              <KitchenSkeleton />
              <KitchenSkeleton />
            </div>
          ) : filteredKitchens.length >
            0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredKitchens.map(
                (kitchen) => (
                  <KitchenCard
                    key={kitchen.id}
                    kitchen={kitchen}
                    onOpen={openKitchen}
                  />
                )
              )}
            </div>
          ) : (
            <div className="rounded-[26px] border border-[#EADFCE] bg-white/95 p-8 text-center shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-3xl">
                🍲
              </div>

              <h3 className="mt-4 text-xl font-black text-[#181411]">
                No kitchens found
              </h3>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                Try another kitchen,
                dish or service filter.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-6 py-3 text-sm font-black text-white"
              >
                Show All Kitchens
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function KitchenCard({
  kitchen,
  onOpen,
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onOpen(kitchen)
      }
      className="overflow-hidden rounded-[24px] border border-[#D8C9B3] bg-white/95 text-left shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] transition-all active:scale-[0.98]"
    >
      <div className="relative h-[125px] overflow-hidden border-b border-[#EADFCE] bg-[#FFF0DF]">
        {kitchen.image ? (
          <img
            src={kitchen.image}
            alt={kitchen.name}
            className={`h-full w-full object-cover ${
              kitchen.sellerOnline
                ? ""
                : "grayscale opacity-60"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            🍲
          </div>
        )}

        <div className="absolute left-2 top-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-black shadow-sm ${
              kitchen.sellerOnline
                ? "border-[#BFD0A7] bg-white/95 text-[#3F5128]"
                : "border-red-200 bg-red-50/95 text-red-600"
            }`}
          >
            {kitchen.sellerOnline
              ? "● Open"
              : "● Closed"}
          </span>
        </div>

        {kitchen.ratingCount > 0 ? (
          <div className="absolute bottom-2 right-2 rounded-full border border-[#EADFCE] bg-white/95 px-2 py-1 text-[9px] font-black text-[#3F5128] shadow-sm">
            <span className="text-[#F59E0B]">
              ★
            </span>{" "}
            {kitchen.ratingAverage.toFixed(
              1
            )}
          </div>
        ) : null}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-[#181411]">
          {kitchen.name}
        </h3>

        {kitchen.ownerName &&
        kitchen.ownerName !==
          kitchen.name ? (
          <p className="mt-1 truncate text-[10px] font-semibold text-[#6B6258]">
            By {kitchen.ownerName}
          </p>
        ) : null}

        <p className="mt-2 text-[11px] font-black text-[#3F5128]">
          {kitchen.foods.length}{" "}
          {kitchen.foods.length === 1
            ? "dish"
            : "dishes"}
        </p>

        <div className="mt-2 flex flex-wrap gap-1">
          {kitchen.deliveryAvailable ? (
            <span className="rounded-full border border-[#D8C9B3] bg-[#FFF0DF] px-2 py-1 text-[8px] font-black text-[#3F5128]">
              🚚 Delivery
            </span>
          ) : null}

          {kitchen.pickupAvailable ? (
            <span className="rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-2 py-1 text-[8px] font-black text-[#3F5128]">
              🛍️ Pickup
            </span>
          ) : null}

          {!kitchen.deliveryAvailable &&
          !kitchen.pickupAvailable ? (
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[8px] font-black text-red-600">
              Not taking orders
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#EADFCE] pt-3">
          <span className="text-[10px] font-bold text-[#6B6258]">
            View food
          </span>

          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3F5128] bg-[#3F5128] text-white">
            <ChevronRightIcon />
          </span>
        </div>
      </div>
    </button>
  );
}

function KitchenSkeleton() {
  return (
    <div className="h-[285px] animate-pulse rounded-[24px] border border-[#EADFCE] bg-white/90" />
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
      <path d="M11 18l-6-6 6-6" />
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
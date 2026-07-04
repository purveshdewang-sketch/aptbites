import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { useCart } from "../context/CartContext";

const FAVORITES_STORAGE_KEY =
  "NeFo_favorite_foods";

function getFoodId(value) {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  return String(
    value?.id ||
      value?.food_id ||
      value?.foodId ||
      ""
  );
}

function readFavorites() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedValue =
      window.localStorage.getItem(
        FAVORITES_STORAGE_KEY
      );

    if (!savedValue) {
      return [];
    }

    const parsedValue =
      JSON.parse(savedValue);

    return Array.isArray(parsedValue)
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favorites)
    );

    window.dispatchEvent(
      new CustomEvent(
        "NeFo_favorites_updated"
      )
    );
  } catch {
    // The card remains usable even if storage is unavailable.
  }
}

function isFavoriteFood(foodId) {
  if (!foodId) {
    return false;
  }

  return readFavorites().some(
    (favoriteItem) =>
      getFoodId(favoriteItem) ===
      String(foodId)
  );
}

function buildFavoriteItem(food) {
  return {
    ...food,

    seller_id:
      food?.seller_id ||
      food?.user_id ||
      null,

    favorite_saved_at:
      new Date().toISOString(),
  };
}

function formatPrice(value) {
  const numericValue =
    Number(value || 0);

  if (
    Number.isNaN(numericValue)
  ) {
    return value || "0";
  }

  return numericValue.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  );
}

export default function FoodCard({
  item,
}) {
  const {
    cartItems = [],
    addToCart,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const food = item || {};

  const foodId = getFoodId(food);

  const [liked, setLiked] =
    useState(() =>
      isFavoriteFood(foodId)
    );

  const [imageFailed, setImageFailed] =
    useState(false);

  useEffect(() => {
    setImageFailed(false);
    setLiked(
      isFavoriteFood(foodId)
    );
  }, [foodId]);

  useEffect(() => {
    function syncFavoriteState() {
      setLiked(
        isFavoriteFood(foodId)
      );
    }

    window.addEventListener(
      "NeFo_favorites_updated",
      syncFavoriteState
    );

    window.addEventListener(
      "storage",
      syncFavoriteState
    );

    return () => {
      window.removeEventListener(
        "NeFo_favorites_updated",
        syncFavoriteState
      );

      window.removeEventListener(
        "storage",
        syncFavoriteState
      );
    };
  }, [foodId]);

  const cartItem = useMemo(() => {
    return cartItems.find(
      (currentItem) =>
        getFoodId(currentItem) ===
        foodId
    );
  }, [
    cartItems,
    foodId,
  ]);

  const quantity =
    Number(
      cartItem?.quantity || 0
    );

  const stock =
    Number(food?.stock || 0);

  const sellerOnline =
    food?.seller_online !==
    false;

  const deliveryAvailable =
    food?.delivery_available !==
    false;

  const pickupAvailable =
    food?.pickup_available !==
    false;

  const fulfillmentAvailable =
    deliveryAvailable ||
    pickupAvailable;

  const isSoldOut =
    stock <= 0;

  const isBlocked =
    !sellerOnline ||
    !fulfillmentAvailable ||
    isSoldOut;

  const kitchenName =
    food?.seller_kitchen_name ||
    food?.seller ||
    "Home Kitchen";

  const foodType =
    food?.type || "Veg";

  const isNonVeg =
    String(foodType)
      .trim()
      .toLowerCase() ===
    "non-veg";

  const preparationTime =
    food?.time ||
    food?.delivery_time ||
    "30-40 min";

  const ratingAverage =
    Number(
      food?.rating_average || 0
    );

  const ratingCount =
    Number(
      food?.rating_count || 0
    );

  const imageSource =
    food?.image ||
    food?.image_url ||
    "";

  function getUnavailableLabel() {
    if (!sellerOnline) {
      return "Kitchen Closed";
    }

    if (!fulfillmentAvailable) {
      return "Unavailable";
    }

    if (isSoldOut) {
      return "Sold Out";
    }

    return "";
  }

  function handleAddToCart() {
    if (!foodId || isBlocked) {
      return;
    }

    if (
      typeof addToCart ===
      "function"
    ) {
      addToCart(food);
    }
  }

  function handleIncrease() {
    if (
      isBlocked ||
      quantity >= stock
    ) {
      return;
    }

    if (
      typeof increaseQuantity ===
      "function"
    ) {
      increaseQuantity(food.id);
    }
  }

  function handleDecrease() {
    if (
      quantity <= 0 ||
      typeof decreaseQuantity !==
        "function"
    ) {
      return;
    }

    decreaseQuantity(food.id);
  }

  function handleToggleFavorite(
    event
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!foodId) {
      return;
    }

    const currentFavorites =
      readFavorites();

    const alreadyFavorite =
      currentFavorites.some(
        (favoriteItem) =>
          getFoodId(
            favoriteItem
          ) === foodId
      );

    if (alreadyFavorite) {
      const nextFavorites =
        currentFavorites.filter(
          (favoriteItem) =>
            getFoodId(
              favoriteItem
            ) !== foodId
        );

      saveFavorites(
        nextFavorites
      );

      setLiked(false);
      return;
    }

    const nextFavorites = [
      buildFavoriteItem(food),

      ...currentFavorites.filter(
        (favoriteItem) =>
          getFoodId(
            favoriteItem
          ) !== foodId
      ),
    ];

    saveFavorites(
      nextFavorites
    );

    setLiked(true);
  }

  if (!foodId) {
    return null;
  }

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#D8C9B3] bg-white/95 shadow-[7px_7px_18px_rgba(63,81,40,0.07),-7px_-7px_18px_rgba(255,255,255,0.95)]">
      <div className="flex min-h-[142px]">
        <Link
          to={`/food/${foodId}`}
          className="relative block w-[124px] shrink-0 overflow-hidden border-r border-[#EADFCE] bg-[#FFF0DF]"
          aria-label={`View ${food.name || "dish"}`}
        >
          {imageSource &&
          !imageFailed ? (
            <img
              src={imageSource}
              alt={
                food?.name ||
                "Food"
              }
              className={`h-full min-h-[142px] w-full object-cover ${
                isBlocked
                  ? "grayscale opacity-60"
                  : ""
              }`}
              onError={() =>
                setImageFailed(true)
              }
            />
          ) : (
            <div className="flex h-full min-h-[142px] w-full items-center justify-center text-4xl">
              🍽️
            </div>
          )}

          <div className="absolute left-2 top-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md border bg-white/95 ${
                isNonVeg
                  ? "border-red-500"
                  : "border-green-600"
              }`}
              aria-label={
                isNonVeg
                  ? "Non-vegetarian"
                  : "Vegetarian"
              }
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isNonVeg
                    ? "bg-red-500"
                    : "bg-green-600"
                }`}
              />
            </span>
          </div>

          {isBlocked ? (
            <div className="absolute inset-x-2 bottom-2 rounded-xl border border-white/30 bg-black/65 px-2 py-1.5 text-center text-[9px] font-black uppercase tracking-wide text-white backdrop-blur-sm">
              {getUnavailableLabel()}
            </div>
          ) : null}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col p-3">
          <div className="flex items-start gap-2">
            <Link
              to={`/food/${foodId}`}
              className="min-w-0 flex-1"
            >
              <h3 className="line-clamp-2 text-[15px] font-black leading-tight text-[#181411]">
                {food?.name ||
                  "Homemade Food"}
              </h3>

              <p className="mt-1 truncate text-[10px] font-bold text-[#6B6258]">
                {kitchenName}
              </p>
            </Link>

            <button
              type="button"
              onClick={
                handleToggleFavorite
              }
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 ${
                liked
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-[#EADFCE] bg-[#FFFDF7] text-[#6B6258]"
              }`}
              aria-label={
                liked
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              <HeartIcon
                filled={liked}
              />
            </button>
          </div>

          <Link
            to={`/food/${foodId}`}
            className="mt-2 block"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-[#6B6258]">
              {ratingCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[#3F5128]">
                  <span className="text-[#F59E0B]">
                    ★
                  </span>

                  <span>
                    {ratingAverage.toFixed(
                      1
                    )}
                  </span>

                  <span className="text-[#8B8177]">
                    ({ratingCount})
                  </span>
                </span>
              ) : (
                <span className="text-[#3F5128]">
                  New
                </span>
              )}

              <span aria-hidden="true">
                •
              </span>

              <span>
                {preparationTime}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {deliveryAvailable ? (
                <span className="rounded-full border border-[#EADFCE] bg-[#FFF8EC] px-2 py-1 text-[8px] font-black text-[#3F5128]">
                  Delivery
                </span>
              ) : null}

              {pickupAvailable ? (
                <span className="rounded-full border border-[#EADFCE] bg-[#FFFDF7] px-2 py-1 text-[8px] font-black text-[#3F5128]">
                  Pickup
                </span>
              ) : null}
            </div>
          </Link>

          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <div className="min-w-0">
              <p className="text-lg font-black leading-none text-[#181411]">
                ₹
                {formatPrice(
                  food?.price
                )}
              </p>

              {!sellerOnline ? (
                <p className="mt-1 text-[9px] font-black text-red-600">
                  Kitchen closed
                </p>
              ) : isSoldOut ? (
                <p className="mt-1 text-[9px] font-black text-red-600">
                  Sold out
                </p>
              ) : null}
            </div>

            {quantity > 0 &&
            !isBlocked ? (
              <div className="flex h-10 shrink-0 items-center overflow-hidden rounded-xl border border-[#3F5128] bg-[#FFFDF7] shadow-sm">
                <button
                  type="button"
                  onClick={
                    handleDecrease
                  }
                  className="flex h-full w-9 items-center justify-center text-lg font-black text-[#3F5128] active:bg-[#FFF0DF]"
                  aria-label={`Decrease ${food.name} quantity`}
                >
                  −
                </button>

                <span className="flex h-full min-w-8 items-center justify-center border-x border-[#D8C9B3] px-1 text-xs font-black text-[#3F5128]">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={
                    handleIncrease
                  }
                  disabled={
                    quantity >= stock
                  }
                  className="flex h-full w-9 items-center justify-center text-lg font-black text-[#3F5128] active:bg-[#FFF0DF] disabled:cursor-not-allowed disabled:text-[#B7ADA1]"
                  aria-label={`Increase ${food.name} quantity`}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={
                  handleAddToCart
                }
                disabled={isBlocked}
                className={`h-10 min-w-[78px] shrink-0 rounded-xl border px-4 text-xs font-black transition-all active:scale-95 ${
                  isBlocked
                    ? "cursor-not-allowed border-[#D8C9B3] bg-[#F3EEE7] text-[#9A8E80]"
                    : "border-[#3F5128] bg-[#3F5128] text-white shadow-md shadow-[#3F5128]/15"
                }`}
              >
                {isBlocked
                  ? getUnavailableLabel()
                  : "Add"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function HeartIcon({
  filled,
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={
        filled
          ? "currentColor"
          : "none"
      }
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
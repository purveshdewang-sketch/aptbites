import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const FAVORITES_STORAGE_KEY = "Nefo_favorite_foods";

const CARD =
  "rounded-[26px] border border-[#EADFCE] bg-white/95 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_BADGE =
  "rounded-full border border-[#D8C9B3] bg-[#FFFDF7] font-black text-[#3F5128]";

function getFavoriteId(item) {
  return String(item?.id || "");
}

function readFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent("Nefo_favorites_updated"));
}

function isItemFavorite(item) {
  const itemId = getFavoriteId(item);

  if (!itemId) return false;

  return readFavorites().some(
    (favorite) => getFavoriteId(favorite) === itemId
  );
}

function buildFavoriteItem(item) {
  return {
    ...item,
    seller_id: item.seller_id || item.user_id,
    favorite_saved_at: new Date().toISOString(),
  };
}

export default function FoodCard({ item }) {
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity } =
    useCart();

  const [toast, setToast] = useState(null);
  const [favorite, setFavorite] = useState(() => isItemFavorite(item));

  const cartItem = cartItems.find(
    (cartItem) => String(cartItem.id) === String(item.id)
  );

  const quantity = cartItem ? cartItem.quantity : 0;
  const stock = Number(item.stock || 0);

  const demandBadge = item.demand_badge || null;
  const demandLabel =
    typeof demandBadge === "string" ? demandBadge : demandBadge?.label;

  const kitchenName =
    item.seller_kitchen_name || item.seller || "Home Kitchen";

  const imageSrc = item.image || "/Nefo-logo.png";

  const kitchenIsClosed = item.seller_online === false;
  const deliveryAvailable = item.delivery_available !== false;
  const pickupAvailable = item.pickup_available !== false;
  const fulfillmentUnavailable = !deliveryAvailable && !pickupAvailable;

  const isSoldOut = stock <= 0;

  const isBlocked =
    kitchenIsClosed || isSoldOut || fulfillmentUnavailable;

  useEffect(() => {
    setFavorite(isItemFavorite(item));

    function syncFavoriteState() {
      setFavorite(isItemFavorite(item));
    }

    window.addEventListener(
      "Nefo_favorites_updated",
      syncFavoriteState
    );

    window.addEventListener("storage", syncFavoriteState);

    return () => {
      window.removeEventListener(
        "Nefo_favorites_updated",
        syncFavoriteState
      );

      window.removeEventListener("storage", syncFavoriteState);
    };
  }, [item]);

  function showToast({
    icon = "✅",
    title = "Done",
    message = "",
    actionLabel = "",
    href = "",
  }) {
    setToast({
      icon,
      title,
      message,
      actionLabel,
      href,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 1500);
  }

  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (kitchenIsClosed) {
      alert("This kitchen is closed right now.");
      return;
    }

    if (fulfillmentUnavailable) {
      alert(
        "This kitchen is not taking delivery or pickup orders right now."
      );
      return;
    }

    if (isSoldOut) {
      alert("This dish is sold out.");
      return;
    }

    addToCart({
      ...item,
      seller_id: item.seller_id || item.user_id,
    });

    showToast({
      icon: "✅",
      title: "Added to cart",
      message: `${item.name} added successfully.`,
      actionLabel: "View Cart",
      href: "/cart",
    });
  }

  function handleToggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    const itemId = getFavoriteId(item);

    if (!itemId) return;

    const currentFavorites = readFavorites();

    const alreadyFavorite = currentFavorites.some(
      (favoriteItem) =>
        getFavoriteId(favoriteItem) === itemId
    );

    if (alreadyFavorite) {
      const nextFavorites = currentFavorites.filter(
        (favoriteItem) =>
          getFavoriteId(favoriteItem) !== itemId
      );

      saveFavorites(nextFavorites);
      setFavorite(false);

      showToast({
        icon: "♡",
        title: "Removed from favorites",
        message: `${item.name} removed from your favorites.`,
        actionLabel: "View Favorites",
        href: "/favorites",
      });

      return;
    }

    const favoriteItem = buildFavoriteItem(item);

    const nextFavorites = [
      favoriteItem,
      ...currentFavorites.filter(
        (favoriteItem) =>
          getFavoriteId(favoriteItem) !== itemId
      ),
    ];

    saveFavorites(nextFavorites);
    setFavorite(true);

    showToast({
      icon: "❤️",
      title: "Added to favorites",
      message: `${item.name} saved to your favorites.`,
      actionLabel: "View Favorites",
      href: "/favorites",
    });
  }

  function handleDecrease(event) {
    event.preventDefault();
    event.stopPropagation();

    decreaseQuantity(item.id);
  }

  function handleIncrease(event) {
    event.preventDefault();
    event.stopPropagation();

    if (quantity >= stock) {
      alert("Maximum available quantity reached.");
      return;
    }

    increaseQuantity(item.id);
  }

  function getAvailabilityText() {
    if (kitchenIsClosed) return "Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold out";

    return "Available";
  }

  function getAvailabilityClass() {
    if (kitchenIsClosed || fulfillmentUnavailable || isSoldOut) {
      return "text-red-500";
    }

    return "text-[#3F5128]";
  }

  function getBlockedLabel() {
    if (kitchenIsClosed) return "Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold out";

    return "Unavailable";
  }

  function getButtonLabel() {
    if (kitchenIsClosed) return "Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold Out";

    return "ADD";
  }

  function FulfillmentBadges({ compact = false }) {
    if (fulfillmentUnavailable) {
      return (
        <span
          className={`rounded-full border border-red-200 bg-red-50 font-black text-red-600 ${
            compact
              ? "px-2 py-0.5 text-[9px]"
              : "px-3 py-1.5 text-[11px]"
          }`}
        >
          Not taking orders
        </span>
      );
    }

    return (
      <>
        {deliveryAvailable ? (
          <span
            className={`rounded-full border border-[#D8C9B3] bg-[#FFF0DF] font-black text-[#3F5128] ${
              compact
                ? "px-2 py-0.5 text-[9px]"
                : "px-3 py-1.5 text-[11px]"
            }`}
          >
            🚚 Delivery
          </span>
        ) : null}

        {pickupAvailable ? (
          <span
            className={`${SOFT_BADGE} ${
              compact
                ? "px-2 py-0.5 text-[9px]"
                : "px-3 py-1.5 text-[11px]"
            }`}
          >
            🛍️ Pickup
          </span>
        ) : null}
      </>
    );
  }

  return (
    <>
      {toast ? (
        <div className="fixed left-3 right-3 top-24 z-[999] rounded-[24px] border border-[#D8C9B3] bg-white p-4 shadow-2xl shadow-[#3F5128]/20 sm:left-1/2 sm:right-auto sm:w-[340px] sm:-translate-x-1/2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#EADFCE] bg-[#FFF0DF] text-xl">
              {toast.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-black text-[#3F5128]">
                {toast.title}
              </p>

              {toast.message ? (
                <p className="mt-1 truncate text-sm font-semibold text-[#6B6258]">
                  {toast.message}
                </p>
              ) : null}
            </div>
          </div>

          {toast.href && toast.actionLabel ? (
            <Link
              to={toast.href}
              className="mt-4 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 text-center font-black text-white"
            >
              {toast.actionLabel}
            </Link>
          ) : null}
        </div>
      ) : null}

      <article
        className={`${CARD} overflow-hidden transition-all duration-300 ${
          kitchenIsClosed || fulfillmentUnavailable
            ? "border-red-200"
            : "hover:border-[#CF743D] hover:shadow-xl hover:shadow-[#3F5128]/10"
        }`}
      >
        <div className="sm:hidden">
          <Link to={`/food/${item.id}`} className="block p-2.5">
            <div className="flex gap-3">
              <div className="relative h-[116px] w-[116px] shrink-0 overflow-hidden rounded-[22px] border border-[#D8C9B3] bg-[#FFF0DF]">
                <img
                  src={imageSrc}
                  alt={item.name}
                  className={`h-full w-full object-cover ${
                    kitchenIsClosed || fulfillmentUnavailable
                      ? "grayscale opacity-45"
                      : ""
                  }`}
                />

                <div className="absolute left-2 top-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black shadow-sm ${
                      item.type === "Non-Veg"
                        ? "bg-red-500 text-white"
                        : "bg-[#6F7F43] text-white"
                    }`}
                  >
                    {item.type || "Veg"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full border text-base shadow-lg active:scale-95 ${
                    favorite
                      ? "border-[#CF743D] bg-white text-[#CF743D]"
                      : "border-[#EADFCE] bg-white/95 text-[#3F5128]"
                  }`}
                  aria-label={
                    favorite
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                >
                  {favorite ? "♥" : "♡"}
                </button>

                {demandLabel &&
                !kitchenIsClosed &&
                !isSoldOut &&
                !fulfillmentUnavailable ? (
                  <div className="absolute bottom-2 left-2 right-2 rounded-xl border border-[#EADFCE] bg-white/95 px-2 py-1 backdrop-blur">
                    <p className="truncate text-[9px] font-black text-[#CF743D]">
                      🔥 {demandLabel}
                    </p>
                  </div>
                ) : null}

                {isBlocked ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/65 px-2 text-center">
                    <p className="text-[11px] font-black text-white">
                      {getBlockedLabel()}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3
                      className={`line-clamp-2 text-[15px] font-black leading-tight ${
                        kitchenIsClosed || fulfillmentUnavailable
                          ? "text-[#9A8E80]"
                          : "text-[#181411]"
                      }`}
                    >
                      {item.name}
                    </h3>

                    <p className="mt-1 truncate text-[11px] font-semibold text-[#6B6258]">
                      {kitchenName}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-lg font-black ${
                      kitchenIsClosed || fulfillmentUnavailable
                        ? "text-[#9A8E80]"
                        : "text-[#3F5128]"
                    }`}
                  >
                    ₹{item.price}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <FulfillmentBadges compact />
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <p className="truncate text-[11px] text-[#6B6258]">
                    Ready{" "}
                    <span className="font-bold text-[#181411]">
                      {item.time || "Soon"}
                    </span>
                  </p>

                  <span className="text-[#D8C9B3]">•</span>

                  <p
                    className={`text-[11px] font-black ${getAvailabilityClass()}`}
                  >
                    {getAvailabilityText()}
                  </p>
                </div>

                {item.description ? (
                  <p className="mt-1.5 line-clamp-1 text-[11px] text-[#6B6258]">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          </Link>

          <div className="flex justify-end px-2.5 pb-2.5">
            {quantity === 0 || isBlocked ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isBlocked}
                className={`h-10 min-w-[92px] rounded-2xl border px-3 text-xs font-black transition-all ${
                  isBlocked
                    ? "cursor-not-allowed border-red-100 bg-[#F1E8DC] text-[#9A8E80]"
                    : "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/20 active:scale-95"
                }`}
              >
                {getButtonLabel()}
              </button>
            ) : (
              <div className="flex items-center overflow-hidden rounded-2xl border border-[#3F5128] bg-[#3F5128] font-black text-white shadow-lg shadow-[#3F5128]/15">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="h-10 w-9 text-lg active:bg-[#4D612F]"
                >
                  −
                </button>

                <span className="flex h-10 min-w-9 items-center justify-center bg-[#CF743D] text-xs text-white">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= stock}
                  className={`h-10 w-9 text-lg ${
                    quantity >= stock
                      ? "cursor-not-allowed opacity-40"
                      : "active:bg-[#4D612F]"
                  }`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:block">
          <Link to={`/food/${item.id}`} className="block">
            <div className="relative aspect-[4/3] overflow-hidden border-b border-[#EADFCE] bg-[#FFF0DF]">
              <img
                src={imageSrc}
                alt={item.name}
                className={`h-full w-full object-cover transition-all duration-500 ${
                  kitchenIsClosed || fulfillmentUnavailable
                    ? "grayscale opacity-45"
                    : "hover:scale-105"
                }`}
              />

              <div className="absolute left-3 top-3 flex flex-wrap gap-2 pr-24">
                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${
                    item.type === "Non-Veg"
                      ? "bg-red-500 text-white"
                      : "bg-[#6F7F43] text-white"
                  }`}
                >
                  {item.type || "Veg"}
                </span>

                {demandLabel &&
                !kitchenIsClosed &&
                !isSoldOut &&
                !fulfillmentUnavailable ? (
                  <span className="w-fit rounded-full border border-[#EADFCE] bg-white/95 px-3 py-1.5 text-xs font-black text-[#CF743D] shadow-sm">
                    🔥 {demandLabel}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border text-xl shadow-lg active:scale-95 ${
                  favorite
                    ? "border-[#CF743D] bg-white text-[#CF743D]"
                    : "border-[#EADFCE] bg-white/95 text-[#3F5128]"
                }`}
                aria-label={
                  favorite
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                {favorite ? "♥" : "♡"}
              </button>

              <div className="absolute right-3 top-16 z-20">
                {kitchenIsClosed ? (
                  <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    CLOSED
                  </span>
                ) : fulfillmentUnavailable ? (
                  <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    OFF
                  </span>
                ) : isSoldOut ? (
                  <span className="rounded-full bg-[#181411] px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    SOLD OUT
                  </span>
                ) : (
                  <span className="rounded-full border border-[#D8C9B3] bg-white/95 px-3 py-1.5 text-xs font-black text-[#3F5128] shadow-sm">
                    Available
                  </span>
                )}
              </div>

              <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-2">
                <FulfillmentBadges />
              </div>

              {isBlocked ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 px-4 text-center">
                  <div className="rounded-2xl border border-[#EADFCE] bg-white/95 px-5 py-4 font-black text-[#3F5128] shadow-xl">
                    <p className="text-lg leading-tight">
                      {kitchenIsClosed
                        ? "Kitchen Closed"
                        : fulfillmentUnavailable
                        ? "Not Taking Orders"
                        : "Sold Out"}
                    </p>

                    <p className="mt-1 text-xs text-[#6B6258]">
                      Ordering is temporarily unavailable
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-4">
              <div className="min-h-[122px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className={`truncate text-xl font-black ${
                        kitchenIsClosed || fulfillmentUnavailable
                          ? "text-[#9A8E80]"
                          : "text-[#181411]"
                      }`}
                    >
                      {item.name}
                    </h3>

                    <p className="mt-1 truncate text-sm text-[#6B6258]">
                      Kitchen: {kitchenName}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-2xl font-black ${
                      kitchenIsClosed || fulfillmentUnavailable
                        ? "text-[#9A8E80]"
                        : "text-[#3F5128]"
                    }`}
                  >
                    ₹{item.price}
                  </p>
                </div>

                {item.description ? (
                  <p className="mt-3 line-clamp-2 text-sm text-[#6B6258]">
                    {item.description}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <FulfillmentBadges />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-[#6B6258]">
                  Ready{" "}
                  <span className="font-bold text-[#181411]">
                    {item.time || "Soon"}
                  </span>
                </p>

                <p
                  className={`text-sm font-black ${getAvailabilityClass()}`}
                >
                  {getAvailabilityText()}
                </p>
              </div>
            </div>
          </Link>

          <div className="px-4 pb-4">
            {quantity === 0 || isBlocked ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isBlocked}
                className={`w-full rounded-2xl border py-4 text-base font-black transition-all duration-200 ${
                  isBlocked
                    ? "cursor-not-allowed border-red-100 bg-[#F1E8DC] text-[#9A8E80]"
                    : "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
                }`}
              >
                {isBlocked
                  ? getButtonLabel()
                  : "+ Add to Cart"}
              </button>
            ) : (
              <div className="flex items-center justify-between overflow-hidden rounded-2xl border border-[#3F5128] bg-[#3F5128] font-black text-white shadow-lg shadow-[#3F5128]/15">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="flex-1 py-4 text-xl hover:bg-[#4D612F]"
                >
                  −
                </button>

                <span className="min-w-[70px] bg-[#CF743D] px-5 py-4 text-center text-lg text-white">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= stock}
                  className={`flex-1 py-4 text-xl ${
                    quantity >= stock
                      ? "cursor-not-allowed opacity-40"
                      : "hover:bg-[#4D612F]"
                  }`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
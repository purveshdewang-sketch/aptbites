import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const FAVORITES_STORAGE_KEY = "NeFo_favorite_foods";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#EADFCE] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

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
  window.dispatchEvent(new CustomEvent("NeFo_favorites_updated"));
}

function getFavoriteId(item) {
  return String(item?.id || "");
}

export default function Favorites() {
  const navigate = useNavigate();
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity } =
    useCart();

  const [favorites, setFavorites] = useState(() => readFavorites());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    function syncFavorites() {
      setFavorites(readFavorites());
    }

    window.addEventListener("NeFo_favorites_updated", syncFavorites);
    window.addEventListener("storage", syncFavorites);

    return () => {
      window.removeEventListener("NeFo_favorites_updated", syncFavorites);
      window.removeEventListener("storage", syncFavorites);
    };
  }, []);

  const availableFavorites = useMemo(() => {
    return favorites.filter((item) => {
      const stock = Number(item.stock || 0);
      const kitchenClosed = item.seller_online === false;
      const deliveryAvailable = item.delivery_available !== false;
      const pickupAvailable = item.pickup_available !== false;
      const fulfillmentUnavailable = !deliveryAvailable && !pickupAvailable;

      return stock > 0 && !kitchenClosed && !fulfillmentUnavailable;
    });
  }, [favorites]);

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

    setTimeout(() => {
      setToast(null);
    }, 1500);
  }

  function getKitchenName(item) {
    return item.seller_kitchen_name || item.seller || "Home Kitchen";
  }

  function getImage(item) {
    return item.image || "/NeFo-logo.png";
  }

  function getCartQuantity(item) {
    const cartItem = cartItems.find(
      (cartItem) => String(cartItem.id) === String(item.id)
    );

    return Number(cartItem?.quantity || 0);
  }

  function isBlocked(item) {
    const stock = Number(item.stock || 0);
    const kitchenClosed = item.seller_online === false;
    const deliveryAvailable = item.delivery_available !== false;
    const pickupAvailable = item.pickup_available !== false;
    const fulfillmentUnavailable = !deliveryAvailable && !pickupAvailable;

    return stock <= 0 || kitchenClosed || fulfillmentUnavailable;
  }

  function getBlockedLabel(item) {
    const stock = Number(item.stock || 0);
    const kitchenClosed = item.seller_online === false;
    const deliveryAvailable = item.delivery_available !== false;
    const pickupAvailable = item.pickup_available !== false;
    const fulfillmentUnavailable = !deliveryAvailable && !pickupAvailable;

    if (kitchenClosed) return "Kitchen closed";
    if (fulfillmentUnavailable) return "Not taking orders";
    if (stock <= 0) return "Sold out";

    return "Unavailable";
  }

  function removeFavorite(item) {
    const itemId = getFavoriteId(item);

    const nextFavorites = favorites.filter(
      (favorite) => getFavoriteId(favorite) !== itemId
    );

    saveFavorites(nextFavorites);
    setFavorites(nextFavorites);

    showToast({
      icon: "♡",
      title: "Removed from favorites",
      message: `${item.name} removed.`,
    });
  }

  function clearFavorites() {
    saveFavorites([]);
    setFavorites([]);

    showToast({
      icon: "♡",
      title: "Favorites cleared",
      message: "All saved foods were removed.",
    });
  }

  function handleAddToCart(item) {
    if (isBlocked(item)) {
      alert(getBlockedLabel(item));
      return;
    }

    const cartReadyItem = {
      ...item,
      seller_id: item.seller_id || item.user_id,
    };

    addToCart(cartReadyItem);

    showToast({
      icon: "✅",
      title: "Added to cart",
      message: `${item.name} added successfully.`,
      actionLabel: "View Cart",
      href: "/cart",
    });
  }

  function handleIncrease(item) {
    const stock = Number(item.stock || 0);
    const quantity = getCartQuantity(item);

    if (quantity >= stock) {
      alert(`Only ${stock} available.`);
      return;
    }

    increaseQuantity(item.id);
  }

  if (favorites.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-32 text-[#181411]">
        <div className="mx-auto max-w-md">
          <header className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Go back"
            >
              <BackIcon />
            </button>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Saved Foods
              </p>

              <h1 className="mt-1 text-3xl font-black text-[#3F5128]">
                Favorites
              </h1>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
                Foods you save with the heart button will appear here.
              </p>
            </div>
          </header>

          <section className={`mt-6 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl text-[#CF743D]">
              ♡
            </div>

            <h2 className="mt-5 text-2xl font-black text-[#181411]">
              No favorites yet
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Tap the heart on any food to save it here.
            </p>

            <Link
              to="/marketplace"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
            >
              Browse Food
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-32 text-[#181411]">
      {toast ? (
        <div className="fixed left-3 right-3 top-24 z-[999] rounded-[24px] border border-[#D8C9B3] bg-white p-4 shadow-2xl shadow-[#3F5128]/20 sm:left-1/2 sm:right-auto sm:w-[340px] sm:-translate-x-1/2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#EADFCE] bg-[#FFF0DF] text-xl">
              {toast.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-black text-[#3F5128]">{toast.title}</p>

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

      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Saved Foods
            </p>

            <h1 className="mt-1 text-3xl font-black text-[#3F5128]">
              Favorites
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              {favorites.length} saved food{favorites.length === 1 ? "" : "s"} •{" "}
              {availableFavorites.length} available now
            </p>
          </div>

          <button
            type="button"
            onClick={clearFavorites}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-500 active:scale-95"
          >
            Clear
          </button>
        </header>

        <section className="mt-5 space-y-4">
          {favorites.map((item) => {
            const quantity = getCartQuantity(item);
            const blocked = isBlocked(item);
            const stock = Number(item.stock || 0);

            return (
              <article key={item.id} className={`overflow-hidden ${CARD}`}>
                <div className="p-3">
                  <div className="flex gap-3">
                    <Link
                      to={`/food/${item.id}`}
                      className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-[24px] border border-[#D8C9B3] bg-[#FFF0DF]"
                    >
                      <img
                        src={getImage(item)}
                        alt={item.name}
                        className={`h-full w-full object-cover ${
                          blocked ? "grayscale opacity-50" : ""
                        }`}
                      />

                      {blocked ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-2 text-center">
                          <p className="text-[10px] font-black text-white">
                            {getBlockedLabel(item)}
                          </p>
                        </div>
                      ) : null}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link to={`/food/${item.id}`}>
                            <h2 className="line-clamp-2 text-base font-black leading-tight text-[#181411]">
                              {item.name}
                            </h2>
                          </Link>

                          <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                            {getKitchenName(item)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFavorite(item)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#CF743D] bg-white text-lg font-black text-[#CF743D] active:scale-95"
                          aria-label="Remove favorite"
                        >
                          ♥
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-lg font-black text-[#3F5128]">
                          ₹{item.price}
                        </p>

                        <p
                          className={`text-xs font-black ${
                            blocked ? "text-red-500" : "text-[#3F5128]"
                          }`}
                        >
                          {blocked ? getBlockedLabel(item) : `${stock} left`}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.delivery_available !== false ? (
                          <span className="rounded-full border border-[#D8C9B3] bg-[#FFF0DF] px-2 py-1 text-[10px] font-black text-[#3F5128]">
                            🚚 Delivery
                          </span>
                        ) : null}

                        {item.pickup_available !== false ? (
                          <span className="rounded-full border border-[#EADFCE] bg-[#FFFDF7] px-2 py-1 text-[10px] font-black text-[#3F5128]">
                            🛍️ Pickup
                          </span>
                        ) : null}
                      </div>

                      {item.description ? (
                        <p className="mt-2 line-clamp-1 text-xs font-semibold text-[#6B6258]">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    {quantity === 0 || blocked ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        disabled={blocked}
                        className={`w-full rounded-2xl border py-3 text-sm font-black transition-all active:scale-[0.98] ${
                          blocked
                            ? "cursor-not-allowed border-red-100 bg-[#F1E8DC] text-[#9A8E80]"
                            : "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                        }`}
                      >
                        {blocked ? getBlockedLabel(item) : "+ Add to Cart"}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between overflow-hidden rounded-2xl border border-[#3F5128] bg-[#3F5128] font-black text-white shadow-lg shadow-[#3F5128]/15">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="flex-1 py-3 text-xl active:bg-[#4D612F]"
                        >
                          −
                        </button>

                        <span className="min-w-[70px] bg-[#CF743D] px-5 py-3 text-center text-base text-white">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleIncrease(item)}
                          disabled={quantity >= stock}
                          className={`flex-1 py-3 text-xl ${
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
              </article>
            );
          })}
        </section>

        <section className={`mt-5 p-5 text-center ${SOFT_CARD}`}>
          <p className="font-black text-[#3F5128]">Looking for more?</p>

          <p className="mt-1 text-sm font-semibold text-[#6B6258]">
            Browse nearby kitchens and save more foods.
          </p>

          <Link
            to="/marketplace"
            className="mt-4 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white active:scale-[0.98]"
          >
            Browse Food
          </Link>
        </section>
      </div>
    </main>
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
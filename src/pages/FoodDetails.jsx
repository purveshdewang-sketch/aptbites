import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FoodCard from "../components/FoodCard";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../context/CartContext";

const KITCHEN_MENU_CATEGORIES = [
  "Meals",
  "Breakfast",
  "Snacks",
  "Sweets",
  "Drinks",
  "Tiffin",
  "Specials",
];

export default function FoodDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { cartItems, addToCart, increaseQuantity, decreaseQuantity, cartCount } =
    useCart();

  const [food, setFood] = useState(null);
  const [kitchenFoods, setKitchenFoods] = useState([]);
  const [kitchenOnline, setKitchenOnline] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [selectedKitchenCategory, setSelectedKitchenCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [liked, setLiked] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const cartItem = cartItems.find(
    (cartItem) => String(cartItem.id) === String(id)
  );

  const quantity = cartItem ? cartItem.quantity : 0;

  const computedCartCount = useMemo(() => {
    if (typeof cartCount === "number") return cartCount;

    return cartItems.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }, [cartCount, cartItems]);

  const stock = Number(food?.stock || 0);
  const category = food?.category || "Meals";
  const kitchenName =
    food?.seller_kitchen_name || food?.seller || "Home Kitchen";
  const sellerDoorNo = food?.seller_door_no || "";

  const kitchenIsClosed =
    kitchenOnline === false || food?.seller_online === false;
  const fulfillmentUnavailable =
    deliveryAvailable === false && pickupAvailable === false;
  const isSoldOut = stock <= 0;
  const isLowStock = stock > 0 && stock <= 2;
  const isSellingFast = stock > 2 && stock <= 5;
  const isBlocked = kitchenIsClosed || fulfillmentUnavailable || isSoldOut;

  const deliveryTime = food?.time || food?.delivery_time || "30-40 min";
  const distanceText =
    food?.distance_text ||
    food?.distance ||
    (food?.distance_km ? `${food.distance_km} km` : "4.2 km");

  useEffect(() => {
    fetchFoodDetails();

    const foodsChannel = supabase
      .channel(`food-details-foods-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foods" },
        () => fetchFoodDetails(false)
      )
      .subscribe();

    const profilesChannel = supabase
      .channel(`food-details-profiles-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchFoodDetails(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [id]);

  async function fetchKitchenProfile(kitchenId) {
    if (!kitchenId) {
      return {
        seller_online: true,
        seller_kitchen_name: "",
        seller_door_no: "",
        seller_about: "",
        seller_specialty: "",
        delivery_available: true,
        pickup_available: true,
      };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, seller_online, seller_kitchen_name, seller_door_no, seller_about, seller_specialty, delivery_available, pickup_available"
      )
      .eq("id", kitchenId)
      .maybeSingle();

    if (!error) {
      return {
        seller_online: data?.seller_online !== false,
        seller_kitchen_name: data?.seller_kitchen_name || "",
        seller_door_no: data?.seller_door_no || "",
        seller_about: data?.seller_about || "",
        seller_specialty: data?.seller_specialty || "",
        delivery_available: data?.delivery_available !== false,
        pickup_available: data?.pickup_available !== false,
      };
    }

    const { data: fallbackData } = await supabase
      .from("profiles")
      .select(
        "id, seller_online, seller_kitchen_name, seller_about, seller_specialty, delivery_available, pickup_available"
      )
      .eq("id", kitchenId)
      .maybeSingle();

    return {
      seller_online: fallbackData?.seller_online !== false,
      seller_kitchen_name: fallbackData?.seller_kitchen_name || "",
      seller_door_no: "",
      seller_about: fallbackData?.seller_about || "",
      seller_specialty: fallbackData?.seller_specialty || "",
      delivery_available: fallbackData?.delivery_available !== false,
      pickup_available: fallbackData?.pickup_available !== false,
    };
  }

  async function fetchFoodDetails(showLoading = true) {
    if (showLoading) setLoading(true);

    setMessage("");

    const { data: foodData, error: foodError } = await supabase
      .from("foods")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (foodError) {
      setMessage(foodError.message);
      setFood(null);
      setLoading(false);
      return;
    }

    if (!foodData) {
      setFood(null);
      setKitchenFoods([]);
      setMessage("This dish is no longer available.");
      setLoading(false);
      return;
    }

    const kitchenId = foodData.user_id || foodData.seller_id;
    const kitchenProfile = await fetchKitchenProfile(kitchenId);

    const finalKitchenName =
      kitchenProfile.seller_kitchen_name ||
      foodData.seller_kitchen_name ||
      foodData.seller ||
      "Home Kitchen";

    const enrichedFood = {
      ...foodData,
      seller_id: kitchenId,
      seller_online: kitchenProfile.seller_online,
      seller_kitchen_name: finalKitchenName,
      seller_door_no: kitchenProfile.seller_door_no || foodData.seller_door_no || "",
      seller_about: kitchenProfile.seller_about || foodData.seller_about || "",
      seller_specialty:
        kitchenProfile.seller_specialty || foodData.seller_specialty || "",
      delivery_available: kitchenProfile.delivery_available,
      pickup_available: kitchenProfile.pickup_available,
    };

    setFood(enrichedFood);
    setKitchenOnline(kitchenProfile.seller_online);
    setDeliveryAvailable(kitchenProfile.delivery_available);
    setPickupAvailable(kitchenProfile.pickup_available);

    const { data: allFoodsData } = await supabase
      .from("foods")
      .select("*")
      .order("id", { ascending: false });

    const currentSellerNames = [
      finalKitchenName,
      foodData.seller_kitchen_name,
      foodData.seller,
    ]
      .filter(Boolean)
      .map((name) => String(name).trim().toLowerCase());

    const enrichedKitchenFoods = (allFoodsData || [])
      .filter((item) => {
        if (String(item.id) === String(id)) return false;

        const itemKitchenId = item.user_id || item.seller_id;

        const itemNames = [item.seller_kitchen_name, item.seller]
          .filter(Boolean)
          .map((name) => String(name).trim().toLowerCase());

        const sameKitchenId =
          kitchenId &&
          itemKitchenId &&
          String(itemKitchenId) === String(kitchenId);

        const sameKitchenName = itemNames.some((name) =>
          currentSellerNames.includes(name)
        );

        return sameKitchenId || sameKitchenName;
      })
      .map((item) => ({
        ...item,
        seller_id: item.user_id || item.seller_id || kitchenId,
        seller_online: kitchenProfile.seller_online,
        seller_kitchen_name:
          kitchenProfile.seller_kitchen_name ||
          item.seller_kitchen_name ||
          item.seller ||
          finalKitchenName,
        seller_door_no: kitchenProfile.seller_door_no || item.seller_door_no || "",
        delivery_available: kitchenProfile.delivery_available,
        pickup_available: kitchenProfile.pickup_available,
      }));

    setKitchenFoods(enrichedKitchenFoods);
    setLoading(false);
  }

  const availableKitchenFoods = useMemo(() => {
    return kitchenFoods.filter(
      (item) =>
        Number(item.stock || 0) > 0 &&
        item.seller_online !== false &&
        (item.delivery_available !== false || item.pickup_available !== false)
    );
  }, [kitchenFoods]);

  const kitchenCategoryCounts = useMemo(() => {
    const counts = { All: kitchenFoods.length };

    KITCHEN_MENU_CATEGORIES.forEach((categoryName) => {
      counts[categoryName] = 0;
    });

    kitchenFoods.forEach((item) => {
      const itemCategory = item.category || "Meals";

      if (counts[itemCategory] !== undefined) {
        counts[itemCategory] += 1;
      }
    });

    return counts;
  }, [kitchenFoods]);

  const visibleKitchenFoods = useMemo(() => {
    if (selectedKitchenCategory === "All") return kitchenFoods;

    return kitchenFoods.filter(
      (item) => (item.category || "Meals") === selectedKitchenCategory
    );
  }, [kitchenFoods, selectedKitchenCategory]);

  function handleAddToCart() {
    if (!food) return;

    if (kitchenIsClosed) {
      alert("This kitchen is closed right now.");
      return;
    }

    if (fulfillmentUnavailable) {
      alert("This kitchen is not taking delivery or pickup orders right now.");
      return;
    }

    if (isSoldOut) {
      alert("This dish is sold out.");
      return;
    }

    addToCart(food);
  }

  function handleIncrease() {
    if (quantity >= stock) {
      alert(`Only ${stock} available.`);
      return;
    }

    increaseQuantity(food.id);
  }

  function handleDecrease() {
    decreaseQuantity(food.id);
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: food?.name || "Nefo food",
          text: `Check out ${food?.name || "this dish"} on Nefo`,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);

      setTimeout(() => {
        setShowShareToast(false);
      }, 1400);
    } catch {
      setShowShareToast(true);

      setTimeout(() => {
        setShowShareToast(false);
      }, 1400);
    }
  }

  function getAvailabilityText() {
    if (kitchenIsClosed) return "Ordering temporarily unavailable";
    if (fulfillmentUnavailable) return "Kitchen is not taking orders right now";
    if (isSoldOut) return "Sold out";
    if (isLowStock) return `Only ${stock} portions left`;
    if (isSellingFast) return `${stock} portions left • selling fast`;
    return `${stock} portions available`;
  }

  function getAvailabilityClass() {
    if (kitchenIsClosed || fulfillmentUnavailable || isSoldOut || isLowStock) {
      return "text-red-500";
    }

    return "text-[#0B8F80]";
  }

  function getKitchenStatusText() {
    if (kitchenIsClosed) return "Kitchen Closed";
    if (fulfillmentUnavailable) return "Not Taking Orders";
    return "Open now";
  }

  function getMainButtonLabel() {
    if (kitchenIsClosed) return "Kitchen Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold Out";
    return "Add to Cart";
  }

  function getTypeLabel() {
    return food?.type || "Veg";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-8 text-[#111827]">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-[28px] border border-[#E8F4F1] bg-white/90 p-8 text-center shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#41D3BD]/12 text-3xl">
              🍽️
            </div>
            <p className="mt-4 font-bold text-[#51615D]">
              Loading dish details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!food) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-8 text-[#111827]">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-[28px] border border-[#E8F4F1] bg-white/90 p-8 text-center shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
            <div className="text-5xl">🍽️</div>

            <h1 className="mt-4 text-3xl font-black text-[#111827]">
              Dish not found
            </h1>

            <p className="mt-3 text-[#51615D]">
              {message || "This dish may have been removed."}
            </p>

            <Link
              to="/marketplace"
              className="mt-7 block rounded-2xl bg-[#073B35] py-4 font-black text-white shadow-lg shadow-[#073B35]/15"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] pb-32 text-[#111827]">
      {showShareToast ? (
        <div className="fixed left-4 right-4 top-5 z-[999] mx-auto max-w-md rounded-[22px] border border-[#E8F4F1] bg-white/95 px-4 py-3 text-center text-sm font-black text-[#073B35] shadow-2xl shadow-[#073B35]/15">
          Link copied
        </div>
      ) : null}

      <section className="mx-auto max-w-md px-4 pb-6 pt-3">
        <div className="relative overflow-hidden rounded-[30px] bg-[#D7F5EF] shadow-[8px_8px_22px_rgba(7,59,53,0.1),-8px_-8px_22px_rgba(255,255,255,0.95)]">
          <div className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#073B35] shadow-lg shadow-black/10 backdrop-blur active:scale-95"
              aria-label="Go back"
            >
              <BackIcon />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLiked((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#073B35] shadow-lg shadow-black/10 backdrop-blur active:scale-95"
                aria-label="Save dish"
              >
                <HeartIcon filled={liked} />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#073B35] shadow-lg shadow-black/10 backdrop-blur active:scale-95"
                aria-label="Share dish"
              >
                <ShareIcon />
              </button>
            </div>
          </div>

          <div className="h-[295px] w-full overflow-hidden">
            {food.image ? (
              <img
                src={food.image}
                alt={food.name}
                className={`h-full w-full object-cover ${
                  kitchenIsClosed || fulfillmentUnavailable
                    ? "grayscale opacity-60"
                    : ""
                }`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">
                🍽️
              </div>
            )}
          </div>

          {isBlocked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-5 text-center">
              <div className="rounded-3xl bg-white/95 px-5 py-4 shadow-xl">
                <p className="text-lg font-black text-[#073B35]">
                  {getMainButtonLabel()}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#51615D]">
                  Ordering is temporarily unavailable.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <section className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-[#111827]">
                {food.name}
              </h1>

              <div className="mt-2 flex min-w-0 items-center gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#41D3BD] text-[10px] font-black text-white">
                  {kitchenName.charAt(0).toUpperCase()}
                </div>

                <p className="truncate text-xs font-bold text-[#51615D]">
                  {kitchenName}
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-1 text-right">
              <div className="flex items-center justify-end gap-1 text-xs font-black text-[#111827]">
                <span className="text-[#F59E0B]">★</span>
                <span>4.8</span>
                <span className="font-bold text-[#51615D]">(120+)</span>
              </div>

              <p className={`mt-1 text-[10px] font-black ${getAvailabilityClass()}`}>
                {getKitchenStatusText()}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-2xl font-black text-[#111827]">₹{food.price}</p>

            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black ${
                food.type === "Non-Veg"
                  ? "bg-red-50 text-red-600"
                  : "bg-[#41D3BD]/15 text-[#073B35]"
              }`}
            >
              {getTypeLabel()}
            </span>
          </div>

          {food.description ? (
            <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
              {food.description}
            </p>
          ) : (
            <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
              Fresh homemade food prepared by {kitchenName}.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <InfoCard
              value={deliveryTime}
              label={
                deliveryAvailable
                  ? "Delivery time"
                  : pickupAvailable
                  ? "Pickup time"
                  : "Time"
              }
            />

            <InfoCard value={distanceText} label="Distance" />
          </div>

          <div className="mt-4 rounded-[24px] border border-[#E8F4F1] bg-white/90 p-4 shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]">
            <h2 className="text-base font-black text-[#111827]">
              About Kitchen
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              {food.seller_about ||
                `${kitchenName} serves fresh homemade food prepared with care.`}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {food.seller_specialty ? (
                <span className="rounded-full bg-[#41D3BD]/12 px-3 py-1.5 text-[10px] font-black text-[#073B35]">
                  {food.seller_specialty}
                </span>
              ) : null}

              {sellerDoorNo ? (
                <span className="rounded-full bg-[#FFFFF2] px-3 py-1.5 text-[10px] font-black text-[#073B35]">
                  Door No. {sellerDoorNo}
                </span>
              ) : null}

              <span
                className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
                  kitchenIsClosed
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {getKitchenStatusText()}
              </span>
            </div>
          </div>

          <p className={`mt-3 text-xs font-black ${getAvailabilityClass()}`}>
            {getAvailabilityText()}
          </p>
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#0B8F80]">
                More from kitchen
              </p>

              <h2 className="mt-1 truncate text-xl font-black text-[#111827]">
                {kitchenName} menu
              </h2>
            </div>

            <Link
              to="/marketplace"
              className="shrink-0 text-xs font-black text-[#0B8F80]"
            >
              See All
            </Link>
          </div>

          {kitchenFoods.length > 0 ? (
            <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
              <div className="flex min-w-max gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedKitchenCategory("All")}
                  className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black ${
                    selectedKitchenCategory === "All"
                      ? "bg-[#073B35] text-white"
                      : "bg-white/90 text-[#51615D]"
                  }`}
                >
                  All ({kitchenCategoryCounts.All || 0})
                </button>

                {KITCHEN_MENU_CATEGORIES.filter(
                  (categoryName) => kitchenCategoryCounts[categoryName] > 0
                ).map((categoryName) => (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => setSelectedKitchenCategory(categoryName)}
                    className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black ${
                      selectedKitchenCategory === categoryName
                        ? "bg-[#073B35] text-white"
                        : "bg-white/90 text-[#51615D]"
                    }`}
                  >
                    {categoryName} ({kitchenCategoryCounts[categoryName]})
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {kitchenFoods.length === 0 ? (
            <div className="rounded-[24px] border border-[#E8F4F1] bg-white/90 p-5 text-center shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]">
              <div className="text-3xl">🍽️</div>

              <p className="mt-3 font-black text-[#111827]">
                No other dishes from this kitchen.
              </p>

              <p className="mt-1 text-sm font-semibold text-[#51615D]">
                Explore other nearby kitchens in the marketplace.
              </p>
            </div>
          ) : visibleKitchenFoods.length === 0 ? (
            <div className="rounded-[24px] border border-[#E8F4F1] bg-white/90 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#51615D]">
                No dishes in this category right now.
              </p>
            </div>
          ) : (
            <>
              {availableKitchenFoods.length > 0 ? (
                <p className="mb-3 text-xs font-bold text-[#51615D]">
                  {availableKitchenFoods.length} available from this kitchen.
                </p>
              ) : null}

              <div className="space-y-3">
                {visibleKitchenFoods.map((item) => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </section>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8F4F1] bg-[#FFFFF2]/95 px-4 pb-4 pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex h-14 shrink-0 items-center overflow-hidden rounded-2xl border border-[#E8F4F1] bg-white/90 shadow-[4px_4px_12px_rgba(7,59,53,0.06),-4px_-4px_12px_rgba(255,255,255,0.95)]">
            <button
              type="button"
              onClick={handleDecrease}
              disabled={quantity <= 0}
              className={`flex h-14 w-12 items-center justify-center text-xl font-black ${
                quantity <= 0
                  ? "cursor-not-allowed text-[#B8C9C5]"
                  : "text-[#073B35] active:bg-[#E8F4F1]"
              }`}
            >
              −
            </button>

            <span className="flex h-14 min-w-10 items-center justify-center text-sm font-black text-[#073B35]">
              {quantity || 1}
            </span>

            <button
              type="button"
              onClick={quantity === 0 ? handleAddToCart : handleIncrease}
              disabled={isBlocked || quantity >= stock}
              className={`flex h-14 w-12 items-center justify-center text-xl font-black ${
                isBlocked || quantity >= stock
                  ? "cursor-not-allowed text-[#B8C9C5]"
                  : "text-[#073B35] active:bg-[#E8F4F1]"
              }`}
            >
              +
            </button>
          </div>

          {quantity === 0 || isBlocked ? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isBlocked}
              className={`h-14 flex-1 rounded-2xl text-sm font-black transition-all active:scale-[0.98] ${
                isBlocked
                  ? "cursor-not-allowed border border-red-100 bg-[#EAF7F4] text-[#8AA5A0]"
                  : "bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15"
              }`}
            >
              <span className="block">{getMainButtonLabel()}</span>
              {!isBlocked ? (
                <span className="block text-[10px] font-bold opacity-80">
                  ₹{food.price}
                </span>
              ) : null}
            </button>
          ) : (
            <Link
              to="/cart"
              className="flex h-14 flex-1 flex-col items-center justify-center rounded-2xl bg-[#073B35] text-sm font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.98]"
            >
              <span>Go to Cart</span>
              <span className="text-[10px] font-bold opacity-80">
                {computedCartCount} {computedCartCount === 1 ? "item" : "items"}
              </span>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoCard({ value, label }) {
  return (
    <div className="rounded-[20px] border border-[#E8F4F1] bg-white/90 p-4 text-center shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-sm font-black text-[#111827]">{value}</p>
      <p className="mt-1 text-[10px] font-bold text-[#51615D]">{label}</p>
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

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.8l6.8-4.6" />
      <path d="M8.6 13.2l6.8 4.6" />
    </svg>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FoodCard from "../components/FoodCard";
import Navbar from "../components/Navbar";
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

  const cartItem = cartItems.find(
    (cartItem) => String(cartItem.id) === String(id)
  );

  const quantity = cartItem ? cartItem.quantity : 0;

  const stock = Number(food?.stock || 0);
  const category = food?.category || "Meals";
  const kitchenName =
    food?.seller_kitchen_name || food?.seller || "Home Kitchen";

  const kitchenIsClosed =
    kitchenOnline === false || food?.seller_online === false;
  const fulfillmentUnavailable =
    deliveryAvailable === false && pickupAvailable === false;
  const isSoldOut = stock <= 0;
  const isLowStock = stock > 0 && stock <= 2;
  const isSellingFast = stock > 2 && stock <= 5;
  const isBlocked = kitchenIsClosed || fulfillmentUnavailable || isSoldOut;

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

    let kitchenProfile = {
      seller_online: true,
      seller_kitchen_name: "",
      delivery_available: true,
      pickup_available: true,
    };

    if (kitchenId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id, seller_online, seller_kitchen_name, delivery_available, pickup_available"
        )
        .eq("id", kitchenId)
        .maybeSingle();

      kitchenProfile = {
        seller_online: profileData?.seller_online !== false,
        seller_kitchen_name: profileData?.seller_kitchen_name || "",
        delivery_available: profileData?.delivery_available !== false,
        pickup_available: profileData?.pickup_available !== false,
      };
    }

    const enrichedFood = {
      ...foodData,
      seller_id: kitchenId,
      seller_online: kitchenProfile.seller_online,
      seller_kitchen_name:
        kitchenProfile.seller_kitchen_name ||
        foodData.seller_kitchen_name ||
        foodData.seller ||
        "Home Kitchen",
      delivery_available: kitchenProfile.delivery_available,
      pickup_available: kitchenProfile.pickup_available,
    };

    setFood(enrichedFood);
    setKitchenOnline(kitchenProfile.seller_online);
    setDeliveryAvailable(kitchenProfile.delivery_available);
    setPickupAvailable(kitchenProfile.pickup_available);

    if (kitchenId) {
      const { data: otherFoodsData } = await supabase
        .from("foods")
        .select("*")
        .or(`user_id.eq.${kitchenId},seller_id.eq.${kitchenId}`)
        .neq("id", id)
        .order("id", { ascending: false });

      const enrichedKitchenFoods = (otherFoodsData || []).map((item) => ({
        ...item,
        seller_id: kitchenId,
        seller_online: kitchenProfile.seller_online,
        seller_kitchen_name:
          kitchenProfile.seller_kitchen_name ||
          item.seller_kitchen_name ||
          item.seller ||
          "Home Kitchen",
        delivery_available: kitchenProfile.delivery_available,
        pickup_available: kitchenProfile.pickup_available,
      }));

      setKitchenFoods(enrichedKitchenFoods);
    } else {
      setKitchenFoods([]);
    }

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

    return "text-[#073B35]";
  }

  function getKitchenStatusText() {
    if (kitchenIsClosed) return "Kitchen Closed";
    if (fulfillmentUnavailable) return "Not Taking Orders";
    return "Kitchen Open";
  }

  function getMainButtonLabel() {
    if (kitchenIsClosed) return "Kitchen Closed";
    if (fulfillmentUnavailable) return "Unavailable";
    if (isSoldOut) return "Sold Out";
    return "Add to Cart";
  }

  function FulfillmentBadges({ compact = false }) {
    if (fulfillmentUnavailable) {
      return (
        <span
          className={`bg-red-50 text-red-600 border border-red-100 font-black rounded-full ${
            compact ? "text-[10px] px-2.5 py-1" : "text-xs px-3 py-1.5"
          }`}
        >
          Not taking orders
        </span>
      );
    }

    return (
      <>
        {deliveryAvailable && (
          <span
            className={`bg-[#41D3BD]/12 text-[#073B35] border border-[#41D3BD]/25 font-black rounded-full ${
              compact ? "text-[10px] px-2.5 py-1" : "text-xs px-3 py-1.5"
            }`}
          >
            🚚 Delivery
          </span>
        )}

        {pickupAvailable && (
          <span
            className={`bg-[#FFFFF2] text-[#073B35] border border-[#D7F5EF] font-black rounded-full ${
              compact ? "text-[10px] px-2.5 py-1" : "text-xs px-3 py-1.5"
            }`}
          >
            🛍️ Pickup
          </span>
        )}
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-8 flex items-center justify-center">
          <div className="bg-white border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-3xl">
              🍽️
            </div>
            <p className="text-[#51615D] font-bold mt-4">
              Loading dish details...
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!food) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-sm">
            <div className="text-5xl">🍽️</div>
            <h1 className="text-3xl font-black mt-4 text-[#111827]">
              Dish not found
            </h1>
            <p className="text-[#51615D] mt-3">
              {message || "This dish may have been removed."}
            </p>
            <Link
              to="/marketplace"
              className="block mt-7 bg-[#073B35] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15"
            >
              Back to Marketplace
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] pb-36 sm:pb-32">
        <section className="px-3 pt-3 sm:px-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-[#51615D] font-black mb-3 bg-white border border-[#D7F5EF] px-4 py-2 rounded-2xl shadow-sm text-sm active:scale-95"
            >
              ← Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-4 lg:gap-8">
              <div className="relative bg-white border border-[#D7F5EF] rounded-3xl overflow-hidden shadow-sm">
                <div className="relative h-[360px] sm:h-[520px] lg:h-[620px] bg-[#D7F5EF] overflow-hidden">
                  <img
                    src={food.image}
                    alt={food.name}
                    className={`w-full h-full object-cover ${
                      kitchenIsClosed || fulfillmentUnavailable
                        ? "grayscale opacity-60"
                        : ""
                    }`}
                  />

                  <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-24">
                    <span
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm ${
                        food.type === "Non-Veg"
                          ? "bg-red-500 text-white"
                          : "bg-[#41D3BD] text-[#073B35]"
                      }`}
                    >
                      {food.type || "Veg"}
                    </span>

                    <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-white/95 text-[#073B35] border border-[#D7F5EF] shadow-sm">
                      {category}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm ${
                        kitchenIsClosed || fulfillmentUnavailable
                          ? "bg-red-600 text-white"
                          : isSoldOut
                          ? "bg-[#111827] text-white"
                          : isLowStock
                          ? "bg-red-500 text-white"
                          : isSellingFast
                          ? "bg-[#41D3BD] text-[#073B35]"
                          : "bg-white/95 text-[#073B35] border border-[#D7F5EF]"
                      }`}
                    >
                      {kitchenIsClosed
                        ? "CLOSED"
                        : fulfillmentUnavailable
                        ? "OFF"
                        : isSoldOut
                        ? "SOLD OUT"
                        : isLowStock
                        ? `Only ${stock}`
                        : isSellingFast
                        ? "Fast"
                        : "Available"}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-white/95 backdrop-blur border border-white/70 rounded-3xl p-3 shadow-lg">
                      <p className="text-[#1A9F8D] text-[10px] font-black uppercase tracking-wide">
                        Fresh from kitchen
                      </p>

                      <h2 className="text-[#073B35] text-lg font-black mt-1 truncate">
                        {kitchenName}
                      </h2>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <FulfillmentBadges compact />
                      </div>

                      <p className="text-[#51615D] text-[11px] mt-2">
                        Exact kitchen door/location is not shown publicly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#D7F5EF] rounded-3xl p-4 sm:p-6 lg:p-8 h-fit shadow-sm">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border ${
                    kitchenIsClosed || fulfillmentUnavailable
                      ? "bg-red-50 border-red-100 text-red-600"
                      : "bg-[#41D3BD]/12 border-[#41D3BD]/25 text-[#073B35]"
                  }`}
                >
                  <span>🌿</span>
                  <span>{getKitchenStatusText()}</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black mt-4 leading-tight tracking-tight text-[#111827]">
                  {food.name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="bg-[#073B35] text-white font-black px-4 py-2 rounded-2xl text-2xl shadow-lg shadow-[#073B35]/15">
                    ₹{food.price}
                  </span>

                  <span className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D] font-bold px-4 py-2 rounded-2xl text-sm">
                    Ready {food.time || "Soon"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <FulfillmentBadges />
                </div>

                {food.description && (
                  <p className="text-[#51615D] leading-relaxed mt-5 text-sm sm:text-base">
                    {food.description}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                    <p className="text-[#51615D] text-[10px] font-bold uppercase">
                      Availability
                    </p>
                    <p className={`font-black mt-2 text-sm ${getAvailabilityClass()}`}>
                      {getAvailabilityText()}
                    </p>
                  </div>

                  <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                    <p className="text-[#51615D] text-[10px] font-bold uppercase">
                      Category
                    </p>
                    <p className="font-black mt-2 text-[#073B35] text-sm">
                      {category}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block mt-6">
                  {quantity === 0 || isBlocked ? (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isBlocked}
                      className={`w-full font-black py-5 rounded-2xl transition-all duration-200 shadow-lg text-lg ${
                        isBlocked
                          ? "bg-[#EAF7F4] text-[#8AA5A0] cursor-not-allowed border border-red-100"
                          : "bg-[#073B35] active:scale-[0.98] text-white shadow-[#073B35]/15"
                      }`}
                    >
                      {getMainButtonLabel()}
                    </button>
                  ) : (
                    <div className="h-16 grid grid-cols-3 overflow-hidden rounded-2xl bg-[#073B35] text-white font-black shadow-lg shadow-[#073B35]/15">
                      <button
                        type="button"
                        onClick={handleDecrease}
                        className="text-2xl active:bg-[#0B5149]"
                      >
                        −
                      </button>

                      <span className="bg-[#41D3BD] text-[#073B35] flex items-center justify-center text-xl font-black">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={handleIncrease}
                        disabled={quantity >= stock}
                        className={`text-2xl ${
                          quantity >= stock
                            ? "opacity-40 cursor-not-allowed"
                            : "active:bg-[#0B5149]"
                        }`}
                      >
                        +
                      </button>
                    </div>
                  )}

                  <Link
                    to="/cart"
                    className="block text-center mt-4 border border-[#D7F5EF] bg-[#FFFFF2] text-[#51615D] font-black py-4 rounded-2xl"
                  >
                    View Cart
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-3 sm:px-6 py-4 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div className="min-w-0">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-[11px]">
                  More from kitchen
                </p>

                <h2 className="text-2xl sm:text-3xl font-black mt-1 text-[#111827] truncate">
                  {kitchenName} menu
                </h2>
              </div>

              <Link
                to="/marketplace"
                className="hidden sm:block text-[#1A9F8D] font-black"
              >
                Marketplace →
              </Link>
            </div>

            {kitchenFoods.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setSelectedKitchenCategory("All")}
                  className={`shrink-0 px-4 py-2.5 rounded-2xl border font-black text-xs ${
                    selectedKitchenCategory === "All"
                      ? "bg-[#073B35] text-white border-[#073B35]"
                      : "bg-white text-[#51615D] border-[#D7F5EF]"
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
                    className={`shrink-0 px-4 py-2.5 rounded-2xl border font-black text-xs ${
                      selectedKitchenCategory === categoryName
                        ? "bg-[#073B35] text-white border-[#073B35]"
                        : "bg-white text-[#51615D] border-[#D7F5EF]"
                    }`}
                  >
                    {categoryName} ({kitchenCategoryCounts[categoryName]})
                  </button>
                ))}
              </div>
            )}

            {kitchenFoods.length === 0 ? (
              <div className="bg-white border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-sm">
                <p className="text-[#51615D]">
                  No other dishes from this kitchen right now.
                </p>
              </div>
            ) : visibleKitchenFoods.length === 0 ? (
              <div className="bg-white border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-sm">
                <p className="text-[#51615D]">
                  No dishes in this category right now.
                </p>
              </div>
            ) : (
              <>
                {availableKitchenFoods.length > 0 && (
                  <p className="text-[#51615D] text-sm mb-4">
                    {availableKitchenFoods.length} available from this kitchen.
                  </p>
                )}

                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleKitchenFoods.map((item) => (
                    <FoodCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF] px-3 pt-3 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-16 shrink-0 bg-white border border-[#D7F5EF] rounded-2xl px-3 py-2 shadow-sm">
              <p className="text-[#51615D] text-[9px] font-black uppercase">
                Price
              </p>
              <p className="text-[#073B35] text-lg font-black">
                ₹{food.price}
              </p>
            </div>

            {quantity === 0 || isBlocked ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isBlocked}
                className={`flex-1 h-14 font-black rounded-2xl transition-all ${
                  isBlocked
                    ? "bg-[#EAF7F4] text-[#8AA5A0] cursor-not-allowed border border-red-100"
                    : "bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.98]"
                }`}
              >
                {getMainButtonLabel()}
              </button>
            ) : (
              <div className="flex-1 h-14 grid grid-cols-3 overflow-hidden rounded-2xl bg-[#073B35] text-white font-black shadow-lg shadow-[#073B35]/15">
                <button
                  type="button"
                  onClick={handleDecrease}
                  className="text-xl active:bg-[#0B5149]"
                >
                  −
                </button>

                <span className="bg-[#41D3BD] text-[#073B35] flex items-center justify-center text-lg font-black">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={quantity >= stock}
                  className={`text-xl ${
                    quantity >= stock ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  +
                </button>
              </div>
            )}
          </div>

          {cartCount > 0 && (
            <Link
              to="/cart"
              className="block text-center mt-2 bg-[#41D3BD] text-[#073B35] font-black py-3 rounded-2xl"
            >
              View Cart • {cartCount} {cartCount === 1 ? "item" : "items"}
            </Link>
          )}
        </div>

        {cartCount > 0 && (
          <Link
            to="/cart"
            className="hidden sm:flex fixed bottom-5 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-[#073B35] active:scale-[0.98] text-white font-black px-6 py-4 rounded-2xl shadow-lg shadow-[#073B35]/20 items-center justify-center gap-3"
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
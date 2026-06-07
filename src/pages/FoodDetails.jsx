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
    food?.seller || food?.seller_kitchen_name || "Home Kitchen";

  const kitchenIsClosed =
    kitchenOnline === false || food?.seller_online === false;
  const isSoldOut = stock <= 0;
  const isLowStock = stock > 0 && stock <= 2;
  const isSellingFast = stock > 2 && stock <= 5;
  const isBlocked = kitchenIsClosed || isSoldOut;

  useEffect(() => {
    fetchFoodDetails();

    const foodsChannel = supabase
      .channel(`food-details-foods-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchFoodDetails(false);
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel(`food-details-profiles-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchFoodDetails(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [id]);

  async function fetchFoodDetails(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

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

    let currentKitchenOnline = true;

    if (kitchenId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, seller_online")
        .eq("id", kitchenId)
        .maybeSingle();

      currentKitchenOnline = profileData?.seller_online !== false;
    }

    const enrichedFood = {
      ...foodData,
      seller_online: currentKitchenOnline,
    };

    setFood(enrichedFood);
    setKitchenOnline(currentKitchenOnline);

    if (kitchenId) {
      const { data: otherFoodsData } = await supabase
        .from("foods")
        .select("*")
        .or(`user_id.eq.${kitchenId},seller_id.eq.${kitchenId}`)
        .neq("id", id)
        .order("id", { ascending: false });

      const enrichedKitchenFoods = (otherFoodsData || []).map((item) => ({
        ...item,
        seller_online: currentKitchenOnline,
      }));

      setKitchenFoods(enrichedKitchenFoods);
    } else {
      setKitchenFoods([]);
    }

    setLoading(false);
  }

  const availableKitchenFoods = useMemo(() => {
    return kitchenFoods.filter((item) => Number(item.stock || 0) > 0);
  }, [kitchenFoods]);

  const kitchenCategoryCounts = useMemo(() => {
    const counts = {
      All: kitchenFoods.length,
    };

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
    if (isSoldOut) return "Sold out";
    if (isLowStock) return `Only ${stock} portions left`;
    if (isSellingFast) return `${stock} portions left • selling fast`;
    return `${stock} portions available`;
  }

  function getAvailabilityClass() {
    if (kitchenIsClosed || isSoldOut || isLowStock) {
      return "text-red-500";
    }

    return "text-[#073B35]";
  }

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-xl shadow-[#073B35]/5">
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

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-xl shadow-[#073B35]/5">
            <div className="text-5xl">🍽️</div>

            <h1 className="text-3xl font-black mt-4 text-[#111827]">
              Dish not found
            </h1>

            <p className="text-[#51615D] mt-3">
              {message || "This dish may have been removed."}
            </p>

            <Link
              to="/marketplace"
              className="block mt-7 bg-[#073B35] hover:bg-[#0B5149] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15"
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

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] pb-32">
        <section className="relative px-4 sm:px-6 py-5 sm:py-10">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#41D3BD]/20 rounded-full blur-[100px]" />
          <div className="absolute top-64 -left-28 w-80 h-80 bg-[#41D3BD]/10 rounded-full blur-[120px]" />

          <div className="relative max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-[#51615D] hover:text-[#073B35] font-black mb-4 transition-all bg-white/80 border border-[#D7F5EF] px-4 py-2 rounded-2xl shadow-sm"
            >
              ← Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5 lg:gap-10">
              <div className="relative bg-white border border-[#D7F5EF] rounded-[2rem] overflow-hidden shadow-xl shadow-[#073B35]/5">
                <div className="relative aspect-square bg-[#D7F5EF] overflow-hidden">
                  <img
                    src={food.image}
                    alt={food.name}
                    className={`w-full h-full object-cover ${
                      kitchenIsClosed ? "grayscale opacity-60" : ""
                    }`}
                  />

                  <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/55 to-transparent" />

                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2">
                    <span
                      className={`text-xs font-black px-3 py-1.5 rounded-full shadow-sm ${
                        food.type === "Non-Veg"
                          ? "bg-red-500 text-white"
                          : "bg-[#41D3BD] text-[#073B35]"
                      }`}
                    >
                      {food.type || "Veg"}
                    </span>

                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-white/95 text-[#073B35] border border-[#D7F5EF] shadow-sm">
                      {category}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    {kitchenIsClosed ? (
                      <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-600 text-white shadow-sm">
                        CLOSED
                      </span>
                    ) : isSoldOut ? (
                      <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#111827] text-white shadow-sm">
                        SOLD OUT
                      </span>
                    ) : isLowStock ? (
                      <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-500 text-white shadow-sm">
                        Only {stock} left
                      </span>
                    ) : isSellingFast ? (
                      <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#41D3BD] text-[#073B35] shadow-sm">
                        Selling Fast
                      </span>
                    ) : (
                      <span className="text-xs font-black px-3 py-1.5 rounded-full bg-white/95 text-[#073B35] border border-[#D7F5EF] shadow-sm">
                        Available
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/95 backdrop-blur border border-white/70 rounded-[1.5rem] p-4 shadow-xl">
                      <p className="text-[#1A9F8D] text-xs font-black uppercase tracking-wide">
                        Fresh from kitchen
                      </p>

                      <h2 className="text-[#073B35] text-xl font-black mt-1 truncate">
                        {kitchenName}
                      </h2>

                      <p className="text-[#51615D] text-xs mt-1">
                        Exact kitchen door/location is not shown publicly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-8 h-fit shadow-xl shadow-[#073B35]/5">
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>🌿</span>
                  <span>{kitchenIsClosed ? "Kitchen Closed" : "Kitchen Open"}</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-4 leading-[0.98] tracking-tight text-[#111827]">
                  {food.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <span className="bg-[#073B35] text-white font-black px-5 py-2 rounded-2xl text-2xl shadow-lg shadow-[#073B35]/15">
                    ₹{food.price}
                  </span>

                  <span className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D] font-bold px-4 py-2 rounded-2xl">
                    Ready {food.time || "Soon"}
                  </span>

                  <span
                    className={`border font-bold px-4 py-2 rounded-2xl ${
                      kitchenIsClosed
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-[#41D3BD]/30 bg-[#41D3BD]/12 text-[#073B35]"
                    }`}
                  >
                    {kitchenIsClosed ? "Closed" : "Open"}
                  </span>
                </div>

                {food.description && (
                  <p className="text-[#51615D] leading-relaxed mt-6 text-base sm:text-lg">
                    {food.description}
                  </p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                    <p className="text-[#51615D] text-xs font-bold uppercase">
                      Availability
                    </p>

                    <p className={`font-black mt-2 ${getAvailabilityClass()}`}>
                      {getAvailabilityText()}
                    </p>
                  </div>

                  <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4">
                    <p className="text-[#51615D] text-xs font-bold uppercase">
                      Category
                    </p>

                    <p className="font-black mt-2 text-[#073B35]">
                      {category}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  {quantity === 0 || kitchenIsClosed ? (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isBlocked}
                      className={`w-full font-black py-5 rounded-2xl transition-all duration-200 shadow-lg text-lg ${
                        isBlocked
                          ? "bg-[#EAF7F4] text-[#8AA5A0] cursor-not-allowed border border-red-100"
                          : "bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.98] text-white shadow-[#073B35]/15"
                      }`}
                    >
                      {kitchenIsClosed
                        ? "Kitchen Closed"
                        : isSoldOut
                        ? "Unavailable"
                        : "+ Add to Cart"}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-[#073B35] text-white font-black shadow-lg shadow-[#073B35]/15">
                      <button
                        type="button"
                        onClick={handleDecrease}
                        className="flex-1 py-5 text-2xl hover:bg-[#0B5149] active:scale-95 transition-all duration-200"
                      >
                        −
                      </button>

                      <span className="px-6 py-5 bg-[#41D3BD] text-[#073B35] text-xl min-w-[90px] text-center">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={handleIncrease}
                        disabled={quantity >= stock}
                        className={`flex-1 py-5 text-2xl transition-all duration-200 ${
                          quantity >= stock
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-[#0B5149] active:scale-95"
                        }`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/cart"
                  className="block text-center mt-4 border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] font-black py-4 rounded-2xl transition-all"
                >
                  View Cart
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-4 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  More from kitchen
                </p>

                <h2 className="text-2xl sm:text-3xl font-black mt-1 text-[#111827]">
                  {kitchenName} menu
                </h2>
              </div>

              <Link
                to="/marketplace"
                className="hidden sm:block text-[#1A9F8D] hover:text-[#073B35] font-black transition-all"
              >
                View Marketplace →
              </Link>
            </div>

            {kitchenFoods.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-3 mb-5 scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setSelectedKitchenCategory("All")}
                  className={`shrink-0 px-4 py-3 rounded-2xl border font-black text-sm ${
                    selectedKitchenCategory === "All"
                      ? "bg-[#073B35] text-white border-[#073B35]"
                      : "bg-white/85 text-[#51615D] border-[#D7F5EF]"
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
                    className={`shrink-0 px-4 py-3 rounded-2xl border font-black text-sm ${
                      selectedKitchenCategory === categoryName
                        ? "bg-[#073B35] text-white border-[#073B35]"
                        : "bg-white/85 text-[#51615D] border-[#D7F5EF]"
                    }`}
                  >
                    {categoryName} ({kitchenCategoryCounts[categoryName]})
                  </button>
                ))}
              </div>
            )}

            {kitchenFoods.length === 0 ? (
              <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D]">
                  No other dishes from this kitchen right now.
                </p>
              </div>
            ) : visibleKitchenFoods.length === 0 ? (
              <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D]">
                  No dishes in this category right now.
                </p>
              </div>
            ) : (
              <>
                {availableKitchenFoods.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[#51615D] text-sm">
                      {availableKitchenFoods.length} available from this kitchen.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                  {visibleKitchenFoods.map((item) => (
                    <FoodCard key={item.id} item={item} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {cartCount > 0 && (
          <Link
            to="/cart"
            className="fixed bottom-5 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.98] text-white font-black px-6 py-4 rounded-2xl shadow-2xl shadow-[#073B35]/25 flex items-center justify-center gap-3 transition-all"
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
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FoodCard from "../components/FoodCard";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../context/CartContext";

const SELLER_MENU_CATEGORIES = [
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
  const [sellerFoods, setSellerFoods] = useState([]);
  const [sellerOnline, setSellerOnline] = useState(true);
  const [selectedSellerCategory, setSelectedSellerCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const cartItem = cartItems.find(
    (cartItem) => String(cartItem.id) === String(id)
  );

  const quantity = cartItem ? cartItem.quantity : 0;

  const stock = Number(food?.stock || 0);
  const category = food?.category || "Meals";

  const sellerIsClosed = sellerOnline === false || food?.seller_online === false;
  const isSoldOut = stock <= 0;
  const isLowStock = stock > 0 && stock <= 2;
  const isSellingFast = stock > 2 && stock <= 5;
  const isBlocked = sellerIsClosed || isSoldOut;

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
      setSellerFoods([]);
      setMessage("This dish is no longer available.");
      setLoading(false);
      return;
    }

    const sellerId = foodData.user_id || foodData.seller_id;

    let currentSellerOnline = true;

    if (sellerId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, seller_online")
        .eq("id", sellerId)
        .maybeSingle();

      currentSellerOnline = profileData?.seller_online !== false;
    }

    const enrichedFood = {
      ...foodData,
      seller_online: currentSellerOnline,
    };

    setFood(enrichedFood);
    setSellerOnline(currentSellerOnline);

    if (sellerId) {
      const { data: otherFoodsData } = await supabase
        .from("foods")
        .select("*")
        .or(`user_id.eq.${sellerId},seller_id.eq.${sellerId}`)
        .neq("id", id)
        .order("id", { ascending: false });

      const enrichedSellerFoods = (otherFoodsData || []).map((item) => ({
        ...item,
        seller_online: currentSellerOnline,
      }));

      setSellerFoods(enrichedSellerFoods);
    } else {
      setSellerFoods([]);
    }

    setLoading(false);
  }

  const availableSellerFoods = useMemo(() => {
    return sellerFoods.filter((item) => Number(item.stock || 0) > 0);
  }, [sellerFoods]);

  const sellerCategoryCounts = useMemo(() => {
    const counts = {
      All: sellerFoods.length,
    };

    SELLER_MENU_CATEGORIES.forEach((categoryName) => {
      counts[categoryName] = 0;
    });

    sellerFoods.forEach((item) => {
      const itemCategory = item.category || "Meals";

      if (counts[itemCategory] !== undefined) {
        counts[itemCategory] += 1;
      }
    });

    return counts;
  }, [sellerFoods]);

  const visibleSellerFoods = useMemo(() => {
    if (selectedSellerCategory === "All") return sellerFoods;

    return sellerFoods.filter(
      (item) => (item.category || "Meals") === selectedSellerCategory
    );
  }, [sellerFoods, selectedSellerCategory]);

  function handleAddToCart() {
    if (!food) return;

    if (sellerIsClosed) {
      alert("Seller is closed right now.");
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

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-xl shadow-[#073B35]/5">
            <p className="text-[#51615D] font-bold">Loading dish...</p>
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
              className="block mt-7 bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black py-4 rounded-2xl shadow-lg shadow-[#41D3BD]/20"
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
        <section className="px-4 sm:px-6 py-5 sm:py-10">
          <div className="max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[#51615D] hover:text-[#1A9F8D] font-bold mb-4 transition-all"
            >
              ← Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5 lg:gap-10">
              <div className="relative bg-white/85 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden shadow-xl shadow-[#073B35]/5">
                <img
                  src={food.image}
                  alt={food.name}
                  className={`w-full aspect-square object-cover ${
                    sellerIsClosed ? "grayscale opacity-60" : ""
                  }`}
                />

                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2">
                  <span
                    className={`text-xs font-black px-3 py-1.5 rounded-full ${
                      food.type === "Non-Veg"
                        ? "bg-red-500 text-white"
                        : "bg-[#41D3BD] text-[#073B35]"
                    }`}
                  >
                    {food.type}
                  </span>

                  <span className="text-xs font-black px-3 py-1.5 rounded-full bg-white/90 text-[#073B35] border border-[#D7F5EF]">
                    {category}
                  </span>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  {sellerIsClosed ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-600 text-white">
                      CLOSED
                    </span>
                  ) : isSoldOut ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#111827] text-white">
                      Sold Out
                    </span>
                  ) : isLowStock ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-500 text-white">
                      Only {stock} left
                    </span>
                  ) : isSellingFast ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-[#41D3BD] text-[#073B35]">
                      Selling Fast
                    </span>
                  ) : (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-white/90 text-[#073B35] border border-[#D7F5EF]">
                      Available
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white/85 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-8 h-fit shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
                  {food.seller}
                </p>

                <h1 className="text-3xl sm:text-6xl font-black mt-3 leading-tight text-[#111827]">
                  {food.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <span className="bg-[#41D3BD] text-[#073B35] font-black px-5 py-2 rounded-2xl text-2xl shadow-lg shadow-[#41D3BD]/20">
                    ₹{food.price}
                  </span>

                  <span className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D] font-bold px-4 py-2 rounded-2xl">
                    Ready: {food.time}
                  </span>

                  <span
                    className={`border font-bold px-4 py-2 rounded-2xl ${
                      sellerIsClosed
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-[#41D3BD]/30 bg-[#41D3BD]/12 text-[#073B35]"
                    }`}
                  >
                    {sellerIsClosed ? "Seller Closed" : "Seller Open"}
                  </span>
                </div>

                {food.description && (
                  <p className="text-[#51615D] leading-relaxed mt-6 text-base sm:text-lg">
                    {food.description}
                  </p>
                )}

                <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[#51615D] text-sm">Availability</p>
                      <p
                        className={`font-black mt-1 ${
                          sellerIsClosed
                            ? "text-red-500"
                            : isSoldOut
                            ? "text-[#9AA7A3]"
                            : isLowStock
                            ? "text-red-500"
                            : "text-[#073B35]"
                        }`}
                      >
                        {sellerIsClosed
                          ? "Ordering temporarily unavailable"
                          : isSoldOut
                          ? "Sold out"
                          : `${stock} portions left`}
                      </p>
                    </div>

                    <div className="text-4xl">🍽️</div>
                  </div>
                </div>

                <div className="mt-6">
                  {quantity === 0 || sellerIsClosed ? (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isBlocked}
                      className={`w-full font-black py-5 rounded-2xl transition-all duration-200 shadow-lg text-lg ${
                        isBlocked
                          ? "bg-[#D7F5EF] text-[#8AA5A0] cursor-not-allowed border border-[#D7F5EF]"
                          : "bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.98] text-[#073B35] shadow-[#41D3BD]/20"
                      }`}
                    >
                      {sellerIsClosed
                        ? "Seller Closed"
                        : isSoldOut
                        ? "Unavailable"
                        : "+ Add to Cart"}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-[#41D3BD] text-[#073B35] font-black shadow-lg shadow-[#41D3BD]/20">
                      <button
                        type="button"
                        onClick={handleDecrease}
                        className="flex-1 py-5 text-2xl hover:bg-[#55E4CF] active:scale-95 transition-all duration-200"
                      >
                        −
                      </button>

                      <span className="px-6 py-5 bg-[#55E4CF] text-xl min-w-[90px] text-center">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={handleIncrease}
                        disabled={quantity >= stock}
                        className={`flex-1 py-5 text-2xl transition-all duration-200 ${
                          quantity >= stock
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-[#55E4CF] active:scale-95"
                        }`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/cart"
                  className="block text-center mt-4 border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] font-bold py-4 rounded-2xl transition-all"
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
                <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
                  More from seller
                </p>

                <h2 className="text-2xl sm:text-3xl font-black mt-1 text-[#111827]">
                  {food.seller} menu
                </h2>
              </div>

              <Link
                to="/marketplace"
                className="hidden sm:block text-[#1A9F8D] hover:text-[#073B35] font-bold transition-all"
              >
                View Marketplace →
              </Link>
            </div>

            {sellerFoods.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-3 mb-5">
                <button
                  type="button"
                  onClick={() => setSelectedSellerCategory("All")}
                  className={`shrink-0 px-4 py-3 rounded-2xl border font-black text-sm ${
                    selectedSellerCategory === "All"
                      ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD]"
                      : "bg-white/85 text-[#51615D] border-[#D7F5EF]"
                  }`}
                >
                  All ({sellerCategoryCounts.All || 0})
                </button>

                {SELLER_MENU_CATEGORIES.filter(
                  (categoryName) => sellerCategoryCounts[categoryName] > 0
                ).map((categoryName) => (
                  <button
                    key={categoryName}
                    type="button"
                    onClick={() => setSelectedSellerCategory(categoryName)}
                    className={`shrink-0 px-4 py-3 rounded-2xl border font-black text-sm ${
                      selectedSellerCategory === categoryName
                        ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD]"
                        : "bg-white/85 text-[#51615D] border-[#D7F5EF]"
                    }`}
                  >
                    {categoryName} ({sellerCategoryCounts[categoryName]})
                  </button>
                ))}
              </div>
            )}

            {sellerFoods.length === 0 ? (
              <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D]">
                  No other dishes from this seller right now.
                </p>
              </div>
            ) : visibleSellerFoods.length === 0 ? (
              <div className="bg-white/85 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
                <p className="text-[#51615D]">
                  No dishes in this category right now.
                </p>
              </div>
            ) : (
              <>
                {availableSellerFoods.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[#51615D] text-sm">
                      {availableSellerFoods.length} available from this seller.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                  {visibleSellerFoods.map((item) => (
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
            className="fixed bottom-5 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.98] text-[#073B35] font-black px-6 py-4 rounded-2xl shadow-2xl shadow-[#41D3BD]/25 flex items-center justify-center gap-3 transition-all"
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
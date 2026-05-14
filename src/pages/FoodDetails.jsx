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

        <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="bg-[#111] border border-[#222] rounded-3xl p-8 text-center">
            <p className="text-gray-400 font-bold">Loading dish...</p>
          </div>
        </main>
      </>
    );
  }

  if (!food) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-[#111] border border-[#222] rounded-3xl p-8 text-center">
            <div className="text-5xl">🍽️</div>

            <h1 className="text-3xl font-black mt-4">Dish not found</h1>

            <p className="text-gray-500 mt-3">
              {message || "This dish may have been removed."}
            </p>

            <Link
              to="/marketplace"
              className="block mt-7 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl"
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

      <main className="min-h-screen bg-black text-white pb-32">
        <section className="px-4 sm:px-6 py-5 sm:py-10">
          <div className="max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-yellow-400 font-bold mb-4"
            >
              ← Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5 lg:gap-10">
              <div className="relative bg-[#111] border border-[#222] rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden">
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
                        : "bg-green-500 text-black"
                    }`}
                  >
                    {food.type}
                  </span>

                  <span className="text-xs font-black px-3 py-1.5 rounded-full bg-black/70 text-yellow-400 border border-yellow-500/20">
                    {category}
                  </span>
                </div>

                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  {sellerIsClosed ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-600 text-white">
                      CLOSED
                    </span>
                  ) : isSoldOut ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-gray-800 text-gray-400">
                      Sold Out
                    </span>
                  ) : isLowStock ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-red-500 text-white">
                      Only {stock} left
                    </span>
                  ) : isSellingFast ? (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-yellow-500 text-black">
                      Selling Fast
                    </span>
                  ) : (
                    <span className="text-xs font-black px-3 py-1.5 rounded-full bg-black/70 text-yellow-400 border border-yellow-500/20">
                      Available
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-[#111] border border-[#222] rounded-[1.75rem] sm:rounded-[2rem] p-5 sm:p-8 h-fit">
                <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                  {food.seller}
                </p>

                <h1 className="text-3xl sm:text-6xl font-black mt-3 leading-tight">
                  {food.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <span className="bg-yellow-500 text-black font-black px-5 py-2 rounded-2xl text-2xl">
                    ₹{food.price}
                  </span>

                  <span className="bg-black border border-[#333] text-gray-300 font-bold px-4 py-2 rounded-2xl">
                    Ready: {food.time}
                  </span>

                  <span
                    className={`border font-bold px-4 py-2 rounded-2xl ${
                      sellerIsClosed
                        ? "border-red-500/30 text-red-300"
                        : "border-green-500/30 text-green-300"
                    }`}
                  >
                    {sellerIsClosed ? "Seller Closed" : "Seller Open"}
                  </span>
                </div>

                {food.description && (
                  <p className="text-gray-400 leading-relaxed mt-6 text-base sm:text-lg">
                    {food.description}
                  </p>
                )}

                <div className="mt-6 bg-black/40 border border-[#222] rounded-3xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">Availability</p>
                      <p
                        className={`font-black mt-1 ${
                          sellerIsClosed
                            ? "text-red-400"
                            : isSoldOut
                            ? "text-gray-500"
                            : isLowStock
                            ? "text-red-400"
                            : "text-yellow-400"
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
                          ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-red-500/20"
                          : "bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black shadow-yellow-500/20"
                      }`}
                    >
                      {sellerIsClosed
                        ? "Seller Closed"
                        : isSoldOut
                        ? "Unavailable"
                        : "+ Add to Cart"}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between overflow-hidden rounded-2xl bg-yellow-500 text-black font-black shadow-lg shadow-yellow-500/20">
                      <button
                        type="button"
                        onClick={handleDecrease}
                        className="flex-1 py-5 text-2xl hover:bg-yellow-400 active:scale-95 transition-all duration-200"
                      >
                        −
                      </button>

                      <span className="px-6 py-5 bg-yellow-400 text-xl min-w-[90px] text-center">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={handleIncrease}
                        disabled={quantity >= stock}
                        className={`flex-1 py-5 text-2xl transition-all duration-200 ${
                          quantity >= stock
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-yellow-400 active:scale-95"
                        }`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/cart"
                  className="block text-center mt-4 border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 font-bold py-4 rounded-2xl transition-all"
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
                <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                  More from seller
                </p>

                <h2 className="text-2xl sm:text-3xl font-black mt-1">
                  {food.seller} menu
                </h2>
              </div>

              <Link
                to="/marketplace"
                className="hidden sm:block text-yellow-400 hover:text-yellow-300 font-bold"
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
                      ? "bg-yellow-500 text-black border-yellow-400"
                      : "bg-[#111] text-gray-300 border-[#333]"
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
                        ? "bg-yellow-500 text-black border-yellow-400"
                        : "bg-[#111] text-gray-300 border-[#333]"
                    }`}
                  >
                    {categoryName} ({sellerCategoryCounts[categoryName]})
                  </button>
                ))}
              </div>
            )}

            {sellerFoods.length === 0 ? (
              <div className="bg-[#111] border border-[#222] rounded-3xl p-8 text-center">
                <p className="text-gray-500">
                  No other dishes from this seller right now.
                </p>
              </div>
            ) : visibleSellerFoods.length === 0 ? (
              <div className="bg-[#111] border border-[#222] rounded-3xl p-8 text-center">
                <p className="text-gray-500">
                  No dishes in this category right now.
                </p>
              </div>
            ) : (
              <>
                {availableSellerFoods.length > 0 && (
                  <div className="mb-5">
                    <p className="text-gray-500 text-sm">
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
            className="fixed bottom-5 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-auto bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-black px-6 py-4 rounded-2xl shadow-2xl shadow-yellow-500/20 flex items-center justify-center gap-3 transition-all"
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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";

const CATEGORY_CHIPS = [
  "All",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Sweets",
  "Drinks",
];

export default function Home() {
  const { user } = useAuth();
  const { cartItems, addToCart, increaseQuantity, decreaseQuantity } = useCart();

  const [isSeller, setIsSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [homeFoods, setHomeFoods] = useState([]);
  const [profile, setProfile] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [toastFood, setToastFood] = useState(null);

  useEffect(() => {
    async function checkUserRole() {
      if (!user) {
        setIsSeller(false);
        setIsAdmin(false);
        setProfile(null);
        return;
      }

      const metadataRole = String(user?.user_metadata?.role || "").toLowerCase();

      if (metadataRole === "seller") {
        setIsSeller(true);
      }

      if (metadataRole === "admin") {
        setIsAdmin(true);
        setIsSeller(true);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "role, is_seller, full_name, apartment_name, block, flat_no, flat"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setIsSeller(metadataRole === "seller" || metadataRole === "admin");
        setIsAdmin(metadataRole === "admin");
        setProfile(null);
        return;
      }

      const profileRole = String(data?.role || "").toLowerCase();

      setProfile(data || null);
      setIsAdmin(profileRole === "admin" || metadataRole === "admin");

      setIsSeller(
        profileRole === "seller" ||
          profileRole === "admin" ||
          data?.is_seller === true ||
          metadataRole === "seller" ||
          metadataRole === "admin"
      );
    }

    checkUserRole();
  }, [user]);

  useEffect(() => {
    fetchHomeFoods();

    const foodsChannel = supabase
      .channel("home-foods-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchHomeFoods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
    };
  }, []);

  async function fetchHomeFoods() {
    setLoadingFoods(true);

    const { data, error } = await supabase
      .from("foods")
      .select(
  "id, name, seller, seller_kitchen_name, price, image, category, type, stock, time, description, seller_online, delivery_available, pickup_available, demand_badge"
)
      .order("id", { ascending: false })
      .limit(24);

    if (error) {
      setHomeFoods([]);
      setLoadingFoods(false);
      return;
    }

    const foodsWithImages = (data || []).filter((food) => food.image);

    setHomeFoods(foodsWithImages);
    setLoadingFoods(false);
  }

  function getKitchenName(food) {
    return food?.seller_kitchen_name || food?.seller || "Home Kitchen";
  }

  function getInitial() {
    const name =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "N";

    return String(name).charAt(0).toUpperCase();
  }

  function showAddedToast(food) {
    setToastFood(food);

    setTimeout(() => {
      setToastFood(null);
    }, 1400);
  }

  const locationLabel = useMemo(() => {
    const apartment = profile?.apartment_name?.trim();
    const block = profile?.block?.trim();
    const flatNo = profile?.flat_no?.trim();
    const flat = profile?.flat?.trim();

    if (apartment && block) return `${apartment}, ${block}`;
    if (apartment) return apartment;
    if (flatNo) return `Flat ${flatNo}`;
    if (flat) return flat;

    return "Set your location";
  }, [profile]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + Number(item.quantity || 0), 0);
  }, [cartItems]);

  const filteredFoods = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return homeFoods.filter((food) => {
      const category = String(food?.category || food?.type || "").toLowerCase();
      const name = String(food?.name || "").toLowerCase();
      const kitchen = String(getKitchenName(food)).toLowerCase();

      const categoryMatch =
        activeCategory === "All" ||
        category.includes(activeCategory.toLowerCase()) ||
        name.includes(activeCategory.toLowerCase());

      const searchMatch =
        !search || name.includes(search) || kitchen.includes(search);

      return categoryMatch && searchMatch;
    });
  }, [homeFoods, activeCategory, searchText]);

  const popularKitchens = useMemo(() => {
    const kitchenMap = new Map();

    homeFoods.forEach((food) => {
      const kitchenName = getKitchenName(food);
      const key = kitchenName.toLowerCase();

      if (!kitchenMap.has(key)) {
        kitchenMap.set(key, {
          name: kitchenName,
          image: food.image,
          items: [],
          minPrice: Number(food.price || 0),
        });
      }

      const kitchen = kitchenMap.get(key);
      kitchen.items.push(food);

      if (Number(food.price || 0) < kitchen.minPrice) {
        kitchen.minPrice = Number(food.price || 0);
      }

      if (!kitchen.image && food.image) {
        kitchen.image = food.image;
      }
    });

    return Array.from(kitchenMap.values()).slice(0, 6);
  }, [homeFoods]);

  const recommendedFoods = useMemo(() => {
    return filteredFoods.slice(0, 10);
  }, [filteredFoods]);

  const shouldShowSellFood = !user || isSeller || isAdmin;
  const sellFoodPath =
    user && (isSeller || isAdmin) ? "/seller-dashboard" : "/seller-login";

  return (
    <main className="min-h-screen bg-[#FFFFF2] px-4 py-4 pb-28 text-[#111827]">
      {toastFood ? (
        <div className="fixed left-3 right-3 top-5 z-[999] mx-auto max-w-md rounded-[24px] border border-[#D7F5EF] bg-white/95 p-4 shadow-2xl shadow-[#073B35]/15">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#41D3BD]/15 text-xl">
              ✅
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-black text-[#073B35]">Added to cart</p>
              <p className="truncate text-xs font-semibold text-[#51615D]">
                {toastFood.name} added successfully.
              </p>
            </div>

            <Link
              to="/cart"
              className="rounded-full bg-[#073B35] px-4 py-2 text-xs font-black text-white"
            >
              View
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-none tracking-tight text-[#073B35]">
              Nefo
            </h1>

            <button
              type="button"
              className="mt-1 flex max-w-[220px] items-center gap-1 truncate text-left text-xs font-black text-[#073B35]"
            >
              <span className="truncate">{locationLabel}</span>
              <ChevronDownIcon />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Cart"
            >
              <CartIcon />

              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#41D3BD] px-1 text-[10px] font-black text-[#073B35]">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#41D3BD]" />
              )}
            </Link>

            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#41D3BD] text-sm font-black text-white shadow-[6px_6px_16px_rgba(7,59,53,0.1),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Profile"
            >
              {getInitial()}
            </Link>
          </div>
        </header>

        <section className="mt-4">
          <div className="flex items-center gap-2 rounded-2xl border border-[#BDEFE6] bg-white/90 px-4 py-3 shadow-[inset_2px_2px_6px_rgba(7,59,53,0.04),inset_-2px_-2px_6px_rgba(255,255,255,0.9)]">
            <SearchIcon />

            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#111827] outline-none placeholder:text-[#8AA5A0]"
              placeholder="Search for food, kitchens..."
            />
          </div>
        </section>

        <section className="mt-4 -mx-4 overflow-x-auto px-4 scrollbar-hide">
          <div className="flex min-w-max gap-2">
            {CATEGORY_CHIPS.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-4 py-2 text-[11px] font-black transition-all active:scale-95 ${
                    isActive
                      ? "bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15"
                      : "bg-white/90 text-[#111827] shadow-[4px_4px_12px_rgba(7,59,53,0.06),-4px_-4px_12px_rgba(255,255,255,0.95)]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        {shouldShowSellFood ? (
          <section className="mt-4 rounded-[24px] bg-[#073B35] p-4 text-white shadow-lg shadow-[#073B35]/15">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#41D3BD]">
                  Kitchen partner
                </p>
                <h2 className="mt-1 text-lg font-black">
                  {isSeller || isAdmin ? "Manage your kitchen" : "Sell on Nefo"}
                </h2>
              </div>

              <Link
                to={sellFoodPath}
                className="shrink-0 rounded-full bg-[#41D3BD] px-4 py-2 text-xs font-black text-[#073B35] active:scale-95"
              >
                {isSeller || isAdmin ? "Open" : "Start"}
              </Link>
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-[#111827]">
              Popular Kitchens
            </h2>

            <Link
              to="/marketplace"
              className="text-xs font-black text-[#0B8F80]"
            >
              See All
            </Link>
          </div>

          {loadingFoods ? (
            <div className="-mx-4 flex gap-3 overflow-hidden px-4">
              <KitchenSkeleton />
              <KitchenSkeleton />
              <KitchenSkeleton />
            </div>
          ) : popularKitchens.length > 0 ? (
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
              <div className="flex min-w-max gap-3">
                {popularKitchens.map((kitchen) => (
                  <KitchenCard key={kitchen.name} kitchen={kitchen} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyCard
              title="No kitchens yet"
              text="Nearby kitchens will appear here after dishes are uploaded."
            />
          )}
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-[#111827]">
              Recommended for you
            </h2>

            <Link
              to="/marketplace"
              className="text-xs font-black text-[#0B8F80]"
            >
              See All
            </Link>
          </div>

          {loadingFoods ? (
            <div className="space-y-3">
              <FoodSkeleton />
              <FoodSkeleton />
              <FoodSkeleton />
            </div>
          ) : recommendedFoods.length > 0 ? (
            <div className="space-y-3">
              {recommendedFoods.map((food) => (
                <RecommendedFoodCard
                  key={food.id}
                  food={food}
                  cartItems={cartItems}
                  addToCart={addToCart}
                  increaseQuantity={increaseQuantity}
                  decreaseQuantity={decreaseQuantity}
                  onAdded={showAddedToast}
                />
              ))}
            </div>
          ) : (
            <EmptyCard
              title="No matching food"
              text="Try another category or search term."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function KitchenCard({ kitchen }) {
  const firstFood = kitchen.items?.[0];

  return (
    <Link
      to={firstFood ? `/food/${firstFood.id}` : "/marketplace"}
      className="w-[122px] shrink-0 overflow-hidden rounded-[22px] border border-[#E8F4F1] bg-white/90 shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-[0.98]"
    >
      <div className="h-[92px] overflow-hidden bg-[#D7F5EF]">
        {kitchen.image ? (
          <img
            src={kitchen.image}
            alt={kitchen.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            🍲
          </div>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="truncate text-xs font-black text-[#111827]">
          {kitchen.name}
        </h3>

        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#51615D]">
          <span className="text-[#F59E0B]">★</span>
          <span>4.8</span>
          <span>•</span>
          <span>{kitchen.items.length} items</span>
        </div>
      </div>
    </Link>
  );
}

function RecommendedFoodCard({
  food,
  cartItems,
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  onAdded,
}) {
  const cartItem = cartItems.find((cartItem) => cartItem.id === food.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const stock = Number(food.stock || 0);
  const kitchenIsClosed = food.seller_online === false;
  const deliveryAvailable = food.delivery_available !== false;
  const pickupAvailable = food.pickup_available !== false;
  const fulfillmentUnavailable = !deliveryAvailable && !pickupAvailable;
  const soldOut = stock <= 0;
  const blocked = kitchenIsClosed || fulfillmentUnavailable || soldOut;

  function handleAdd(event) {
    event.preventDefault();
    event.stopPropagation();

    if (kitchenIsClosed) {
      alert("This kitchen is closed right now.");
      return;
    }

    if (fulfillmentUnavailable) {
      alert("This kitchen is not taking delivery or pickup orders right now.");
      return;
    }

    if (soldOut) return;

    addToCart(food);
    onAdded(food);
  }

  function handleDecrease(event) {
    event.preventDefault();
    event.stopPropagation();
    decreaseQuantity(food.id);
  }

  function handleIncrease(event) {
    event.preventDefault();
    event.stopPropagation();

    if (quantity >= stock) {
      alert(`Only ${stock} available.`);
      return;
    }

    increaseQuantity(food.id);
  }

  function getButtonLabel() {
    if (kitchenIsClosed) return "Closed";
    if (fulfillmentUnavailable) return "Off";
    if (soldOut) return "Out";
    return "Add";
  }

  return (
    <Link
      to={`/food/${food.id}`}
      className={`flex gap-3 rounded-[24px] border bg-white/90 p-3 shadow-[6px_6px_16px_rgba(7,59,53,0.07),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-[0.99] ${
        blocked ? "border-red-100" : "border-[#E8F4F1]"
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] bg-[#D7F5EF]">
        {food.image ? (
          <img
            src={food.image}
            alt={food.name}
            className={`h-full w-full object-cover ${
              blocked ? "grayscale opacity-50" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            🍽️
          </div>
        )}

        {blocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#073B35]">
              {getButtonLabel()}
            </span>
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 py-1">
        <h3
          className={`truncate text-sm font-black ${
            blocked ? "text-[#9AA7A3]" : "text-[#111827]"
          }`}
        >
          {food.name}
        </h3>

        <p className="mt-0.5 truncate text-xs font-semibold text-[#51615D]">
          {food.seller_kitchen_name || food.seller || "Home Kitchen"}
        </p>

        <div className="mt-1 flex items-center gap-1 text-xs font-bold text-[#51615D]">
          <span className="text-[#F59E0B]">★</span>
          <span>4.8</span>
          <span>•</span>
          <span>{food.time || "Soon"}</span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p
            className={`text-sm font-black ${
              blocked ? "text-[#9AA7A3]" : "text-[#073B35]"
            }`}
          >
            ₹{food.price}
          </p>

          {quantity === 0 || blocked ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={blocked}
              className={`min-w-[72px] rounded-full px-4 py-2 text-[11px] font-black transition-all active:scale-95 ${
                blocked
                  ? "cursor-not-allowed bg-[#E8F4F1] text-[#8AA5A0]"
                  : "bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15"
              }`}
            >
              {getButtonLabel()}
            </button>
          ) : (
            <div className="flex items-center overflow-hidden rounded-full bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15">
              <button
                type="button"
                onClick={handleDecrease}
                className="flex h-8 w-8 items-center justify-center text-base font-black active:bg-[#0B5149]"
              >
                −
              </button>

              <span className="flex h-8 min-w-8 items-center justify-center bg-[#41D3BD] px-2 text-xs font-black text-[#073B35]">
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleIncrease}
                disabled={quantity >= stock}
                className={`flex h-8 w-8 items-center justify-center text-base font-black ${
                  quantity >= stock
                    ? "cursor-not-allowed opacity-40"
                    : "active:bg-[#0B5149]"
                }`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyCard({ title, text }) {
  return (
    <div className="rounded-[24px] border border-[#E8F4F1] bg-white/90 p-5 text-center shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]">
      <div className="text-3xl">🍲</div>
      <h3 className="mt-3 text-base font-black text-[#111827]">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-[#51615D]">{text}</p>
    </div>
  );
}

function KitchenSkeleton() {
  return (
    <div className="h-[140px] w-[122px] shrink-0 animate-pulse rounded-[22px] bg-white/90 shadow-sm" />
  );
}

function FoodSkeleton() {
  return (
    <div className="h-[120px] animate-pulse rounded-[24px] bg-white/90 shadow-sm" />
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M6 9l6 6 6-6" />
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
      <path d="M6 6h15l-1.5 9h-12L6 6z" />
      <path d="M6 6L5 3H2" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-[#0B8F80]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
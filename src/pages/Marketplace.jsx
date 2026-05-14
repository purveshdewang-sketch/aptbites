import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FoodCard from "../components/FoodCard";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../context/CartContext";

export default function Marketplace() {
  const { cartCount } = useCart();

  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchFoods();

    const foodsChannel = supabase
      .channel("foods-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
        },
        () => {
          fetchFoods();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("seller-status-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchFoods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(foodsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  async function fetchFoods() {
    setLoading(true);
    setErrorMessage("");

    const { data: foodData, error: foodError } = await supabase
      .from("foods")
      .select("*")
      .order("id", { ascending: false });

    if (foodError) {
      setErrorMessage(foodError.message);
      setFoods([]);
      setLoading(false);
      return;
    }

    const sellerIds = [
      ...new Set(
        (foodData || [])
          .map((food) => food.user_id || food.seller_id)
          .filter(Boolean)
      ),
    ];

    let sellerStatusMap = {};

    if (sellerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, seller_online")
        .in("id", sellerIds);

      sellerStatusMap = (profileData || []).reduce((map, profile) => {
        map[profile.id] = profile.seller_online !== false;
        return map;
      }, {});
    }

    const enrichedFoods = (foodData || []).map((food) => {
      const sellerId = food.user_id || food.seller_id;

      return {
        ...food,
        seller_online: sellerStatusMap[sellerId] !== false,
      };
    });

    setFoods(enrichedFoods);
    setLoading(false);
  }

  const filteredFoods = useMemo(() => {
    return foods.filter((item) => {
      const searchValue = searchTerm.trim().toLowerCase();

      const matchesSearch =
        searchValue === "" ||
        item.name?.toLowerCase().includes(searchValue) ||
        item.seller?.toLowerCase().includes(searchValue) ||
        item.time?.toLowerCase().includes(searchValue) ||
        item.category?.toLowerCase().includes(searchValue);

      const matchesType = selectedType === "All" || item.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [foods, searchTerm, selectedType]);

  const closedSellerFoods = useMemo(() => {
    return filteredFoods.filter((item) => item.seller_online === false);
  }, [filteredFoods]);

  const closedSellerNames = useMemo(() => {
    return [
      ...new Set(
        closedSellerFoods
          .map((item) => item.seller)
          .filter(Boolean)
      ),
    ];
  }, [closedSellerFoods]);

  const availableFoods = useMemo(() => {
    return foods.filter(
      (item) => Number(item.stock || 0) > 0 && item.seller_online !== false
    );
  }, [foods]);

  const lowStockCount = useMemo(() => {
    return foods.filter(
      (item) =>
        item.seller_online !== false &&
        Number(item.stock || 0) > 0 &&
        Number(item.stock || 0) <= 2
    ).length;
  }, [foods]);

  function clearFilters() {
    setSearchTerm("");
    setSelectedType("All");
    setTypeDropdownOpen(false);
  }

  function getTypeLabel(type) {
    if (type === "All") return "All Food Types";
    return type;
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white overflow-hidden pb-28">
        <section className="relative px-4 sm:px-6 pt-6 pb-6 sm:py-10 border-b border-[#1f1f1f]">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/10 rounded-full blur-[90px]" />

          <div className="relative max-w-7xl mx-auto">
            <p className="text-yellow-400 font-semibold tracking-wide text-sm uppercase">
              Marketplace
            </p>

            <h1 className="text-[2.15rem] sm:text-5xl md:text-6xl font-black text-white mt-3 leading-[1.03] tracking-tight">
              Fresh homemade food
              <span className="block text-yellow-400">
                from your community.
              </span>
            </h1>

            <p className="text-gray-400 text-[15px] sm:text-lg mt-5 max-w-2xl leading-relaxed">
              Discover meals, snacks, desserts, and special dishes prepared by
              trusted home chefs inside your neighbourhood.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase font-bold">
                  Available Now
                </p>
                <p className="text-2xl font-black text-yellow-400 mt-1">
                  {availableFoods.length}
                </p>
              </div>

              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase font-bold">
                  Selling Fast
                </p>
                <p className="text-2xl font-black text-red-400 mt-1">
                  {lowStockCount}
                </p>
              </div>

              <div className="hidden sm:block bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase font-bold">
                  Food Drops
                </p>
                <p className="text-2xl font-black text-white mt-1">
                  {foods.length}
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 lg:flex lg:items-center lg:gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search dishes, seller, category, or ready time..."
                className="bg-[#111111] border border-[#2a2a2a] text-white rounded-2xl px-5 py-4 w-full lg:max-w-lg outline-none focus:border-yellow-500 transition-all duration-200 text-base"
              />

              <div className="relative w-full lg:w-60">
                <button
                  type="button"
                  onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                  className="w-full bg-[#111111] border border-[#2a2a2a] hover:border-yellow-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between transition-all duration-200"
                >
                  <span className="font-semibold">
                    {getTypeLabel(selectedType)}
                  </span>

                  <span className="text-yellow-400 text-xs">
                    {typeDropdownOpen ? "▲" : "▼"}
                  </span>
                </button>

                {typeDropdownOpen && (
                  <div className="absolute z-40 mt-3 w-full bg-[#111111] border border-[#2a2a2a] rounded-2xl shadow-2xl shadow-yellow-500/10 overflow-hidden">
                    {["All", "Veg", "Non-Veg"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSelectedType(type);
                          setTypeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-4 font-semibold transition-all duration-200 ${
                          selectedType === type
                            ? "bg-yellow-500 text-black"
                            : "text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400"
                        }`}
                      >
                        {getTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={
                  searchTerm || selectedType !== "All" ? clearFilters : undefined
                }
                className={`font-bold px-8 py-4 rounded-2xl transition-all duration-200 min-h-[56px] ${
                  searchTerm || selectedType !== "All"
                    ? "border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                    : "bg-yellow-500 hover:bg-yellow-400 text-black"
                }`}
              >
                {searchTerm || selectedType !== "All" ? "Clear" : "Search"}
              </button>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-7 sm:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Today’s Specials
                </h2>

                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  {searchTerm || selectedType !== "All"
                    ? `Showing ${getTypeLabel(selectedType)} results ${
                        searchTerm ? `for "${searchTerm}"` : ""
                      }`
                    : "Limited homemade food drops available now."}
                </p>
              </div>

              {(searchTerm || selectedType !== "All") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="hidden sm:block border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black px-5 py-3 rounded-2xl font-semibold transition-all duration-200"
                >
                  View All
                </button>
              )}
            </div>

            

            {!loading && !errorMessage && filteredFoods.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {filteredFoods.map((item) => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
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
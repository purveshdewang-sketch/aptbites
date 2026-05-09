import { useEffect, useMemo, useState } from "react";
import FoodCard from "../components/FoodCard";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";

export default function Marketplace() {
  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchFoods();

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchFoods() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setFoods([]);
    } else {
      setFoods(data || []);
    }

    setLoading(false);
  }

  const filteredFoods = useMemo(() => {
    return foods.filter((item) => {
      const searchValue = searchTerm.trim().toLowerCase();

      const matchesSearch =
        searchValue === "" ||
        item.name?.toLowerCase().includes(searchValue) ||
        item.seller?.toLowerCase().includes(searchValue) ||
        item.time?.toLowerCase().includes(searchValue);

      const matchesType =
        selectedType === "All" || item.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [foods, searchTerm, selectedType]);

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

      <main className="min-h-screen bg-black text-white overflow-hidden">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 pt-7 pb-6 sm:py-10 border-b border-[#1f1f1f]">
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/10 rounded-full blur-[90px]" />

          <div className="relative max-w-7xl mx-auto">
            <p className="text-yellow-400 font-semibold tracking-wide text-sm uppercase">
              Marketplace
            </p>

            <h1 className="text-[2.25rem] sm:text-5xl md:text-6xl font-black text-white mt-3 leading-[1.03] tracking-tight">
              Fresh homemade food
              <span className="block text-yellow-400">
                from your community.
              </span>
            </h1>

            <p className="text-gray-400 text-[15px] sm:text-lg mt-5 max-w-2xl leading-relaxed">
              Discover meals, snacks, desserts, and special dishes prepared by
              trusted home chefs inside your apartment complex.
            </p>

            {/* Search + Filters */}
            <div className="mt-7 grid grid-cols-1 gap-3 lg:flex lg:items-center lg:gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search dishes, seller, or ready time..."
                className="bg-[#111111] border border-[#2a2a2a] text-white rounded-2xl px-5 py-4 w-full lg:max-w-lg outline-none focus:border-yellow-500 transition-all duration-200"
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
                  searchTerm || selectedType !== "All"
                    ? clearFilters
                    : undefined
                }
                className={`font-bold px-8 py-4 rounded-2xl transition-all duration-200 ${
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

        {/* Grid */}
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

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="bg-[#111111] border border-[#222] rounded-[1.75rem] overflow-hidden animate-pulse"
                  >
                    <div className="h-44 sm:h-48 bg-[#1a1a1a]" />
                    <div className="p-5 space-y-4">
                      <div className="h-5 bg-[#1a1a1a] rounded-full w-3/4" />
                      <div className="h-4 bg-[#1a1a1a] rounded-full w-1/2" />
                      <div className="h-10 bg-[#1a1a1a] rounded-2xl" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-950/40 border border-red-500/50 text-red-300 rounded-3xl p-5">
                <p className="font-bold">Failed to load foods</p>
                <p className="text-sm mt-1">{errorMessage}</p>

                <button
                  type="button"
                  onClick={fetchFoods}
                  className="mt-4 bg-red-500 hover:bg-red-400 text-black font-bold px-5 py-3 rounded-2xl"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !errorMessage && foods.length === 0 && (
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-8 text-center">
                <h3 className="text-2xl font-bold text-white">
                  No food available yet
                </h3>

                <p className="text-gray-500 mt-2">
                  Ask a seller to add today’s homemade food drop.
                </p>
              </div>
            )}

            {!loading &&
              !errorMessage &&
              foods.length > 0 &&
              filteredFoods.length === 0 && (
                <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-8 text-center">
                  <h3 className="text-2xl font-bold text-white">
                    No matching dishes found
                  </h3>

                  <p className="text-gray-500 mt-2">
                    Try another dish, seller, ready time, or food type.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-2xl"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

            {!loading && !errorMessage && filteredFoods.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {filteredFoods.map((item) => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
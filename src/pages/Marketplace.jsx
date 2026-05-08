import { useEffect, useState } from "react";
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
    async function fetchFoods() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setFoods([]);
      } else {
        setFoods(data || []);
      }

      setLoading(false);
    }

    fetchFoods();
  }, []);

  const filteredFoods = foods.filter((item) => {
    const searchValue = searchTerm.toLowerCase();

    const matchesSearch =
      item.name?.toLowerCase().includes(searchValue) ||
      item.seller?.toLowerCase().includes(searchValue) ||
      item.time?.toLowerCase().includes(searchValue);

    const matchesType = selectedType === "All" || item.type === selectedType;

    return matchesSearch && matchesType;
  });

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

      <main className="min-h-screen bg-black">
        <section className="px-6 py-10 border-b border-[#1f1f1f]">
          <div className="max-w-7xl mx-auto">
            <p className="text-yellow-400 font-semibold tracking-wide">
              Marketplace
            </p>

            <h1 className="text-5xl md:text-6xl font-bold text-white mt-4 leading-tight">
              Fresh homemade food
              <br />
              from your community.
            </h1>

            <p className="text-gray-400 text-lg mt-6 max-w-2xl">
              Discover meals, snacks, desserts, and special dishes prepared by
              trusted home chefs inside your apartment complex.
            </p>

            <div className="mt-8 flex flex-col lg:flex-row gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search dishes, seller, or ready time..."
                className="bg-[#111111] border border-[#2a2a2a] text-white rounded-2xl px-5 py-4 w-full lg:max-w-lg outline-none focus:border-yellow-500 transition-all duration-200"
              />

              <div className="relative w-full sm:w-60">
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

              {searchTerm || selectedType !== "All" ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold px-8 py-4 rounded-2xl transition-all duration-200"
                >
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-2xl transition-all duration-200"
                >
                  Search
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  Today’s Specials
                </h2>

                <p className="text-gray-500 mt-2">
                  {searchTerm || selectedType !== "All"
                    ? `Showing ${getTypeLabel(selectedType)} results ${
                        searchTerm ? `for "${searchTerm}"` : ""
                      }`
                    : "Limited homemade food drops available now."}
                </p>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="hidden md:block border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black px-5 py-3 rounded-2xl font-semibold transition-all duration-200"
              >
                View All
              </button>
            </div>

            {loading && (
              <p className="text-gray-400">Loading homemade food...</p>
            )}

            {errorMessage && (
              <div className="bg-red-950/40 border border-red-500 text-red-300 rounded-2xl p-4">
                Failed to load foods: {errorMessage}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
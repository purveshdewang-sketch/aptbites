import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SellerDashboard() {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    seller: "",
    time: "",
    stock: "",
    type: "Veg",
    description: "",
  });

  const [sellerFoods, setSellerFoods] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSellerFoods();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleImageChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setMessage("Image is too large. Please upload an image below 5 MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function fetchSellerFoods() {
    setFoodsLoading(true);

    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .order("id", { ascending: false });

    if (!error) {
      setSellerFoods(data || []);
    }

    setFoodsLoading(false);
  }

  async function uploadDishImage() {
    if (!imageFile) {
      return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop";
    }

    const fileExtension = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExtension}`;

    const filePath = `dishes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("food-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("food-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleAddDish(event) {
    event.preventDefault();
    setMessage("");

    if (
      !formData.name ||
      !formData.price ||
      !formData.seller ||
      !formData.time ||
      !formData.stock
    ) {
      setMessage("Please fill dish name, price, seller, ready time, and stock.");
      return;
    }

    setLoading(true);

    try {
      const imageUrl = await uploadDishImage();

      const { error } = await supabase.from("foods").insert([
        {
          name: formData.name,
          price: Number(formData.price),
          seller: formData.seller,
          time: formData.time,
          stock: Number(formData.stock),
          type: formData.type,
          image: imageUrl,
        },
      ]);

      if (error) {
        setMessage(`Error: ${error.message}`);
        return;
      }

      setMessage("Dish added successfully. It is now visible in Marketplace.");

      setFormData({
        name: "",
        price: "",
        seller: "",
        time: "",
        stock: "",
        type: "Veg",
        description: "",
      });

      setImageFile(null);
      setImagePreview("");
      fetchSellerFoods();
    } catch (error) {
      setMessage(`Image upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
              Seller Dashboard
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-2 tracking-tight">
              Manage your food drops
            </h1>
          </div>

          <Link
            to="/marketplace"
            className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-5 py-3 rounded-2xl text-center transition-all"
          >
            View Marketplace
          </Link>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mt-8 sm:mt-10">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6">
            <p className="text-gray-400">Today’s Orders</p>
            <h2 className="text-3xl sm:text-4xl font-black text-yellow-400 mt-3">
              0
            </h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6">
            <p className="text-gray-400">Active Dishes</p>
            <h2 className="text-3xl sm:text-4xl font-black text-yellow-400 mt-3">
              {sellerFoods.length}
            </h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6">
            <p className="text-gray-400">Today’s Sales</p>
            <h2 className="text-3xl sm:text-4xl font-black text-yellow-400 mt-3">
              ₹0
            </h2>
          </div>
        </section>

        <form
          onSubmit={handleAddDish}
          className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 mt-8"
        >
          <h2 className="text-2xl font-bold text-yellow-400">
            Add New Dish
          </h2>

          {message && (
            <div className="mt-5 bg-black border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500"
              placeholder="Dish name"
            />

            <input
              name="price"
              value={formData.price}
              onChange={handleChange}
              type="number"
              min="1"
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500"
              placeholder="Price ₹"
            />

            <input
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              type="number"
              min="1"
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500"
              placeholder="Available quantity"
            />

            <input
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500"
              placeholder="Ready time e.g. 7:30 PM"
            />

            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500"
            >
              <option>Veg</option>
              <option>Non-Veg</option>
            </select>

            <input
              name="seller"
              value={formData.seller}
              onChange={handleChange}
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500"
              placeholder="Seller flat / kitchen name e.g. A-1204"
            />

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-3">
                Upload Dish Image
              </label>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] hover:border-yellow-500/50 bg-black rounded-3xl p-8 cursor-pointer transition-all duration-200">
                <div className="text-5xl mb-3">📸</div>

                <p className="text-white font-semibold">
                  Tap to upload image
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  JPG, PNG, WEBP · Max 5 MB
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>

              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Dish preview"
                    className="w-full h-56 object-cover rounded-3xl border border-[#333]"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                    className="mt-3 text-sm text-red-400 hover:text-red-300"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>
          </div>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full bg-black border border-[#333] rounded-xl px-4 py-3 mt-4 outline-none focus:border-yellow-500"
            placeholder="Short description / ingredients / hygiene note"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-6 py-3 rounded-2xl"
          >
            {loading ? "Uploading Dish..." : "Add Dish"}
          </button>
        </form>

        <section className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                Your Live Dishes
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                Seller Menu
              </h2>
            </div>

            <div className="bg-[#111] border border-[#2a2a2a] px-4 py-2 rounded-2xl text-sm text-gray-400">
              {sellerFoods.length} dishes
            </div>
          </div>

          {foodsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-[#111] border border-[#2a2a2a] rounded-3xl overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-[#1a1a1a]" />
                  <div className="p-5 space-y-4">
                    <div className="h-5 bg-[#1a1a1a] rounded-full w-3/4" />
                    <div className="h-4 bg-[#1a1a1a] rounded-full w-1/2" />
                    <div className="h-10 bg-[#1a1a1a] rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : sellerFoods.length === 0 ? (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-8 text-center">
              <p className="text-gray-500">
                No dishes added yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {sellerFoods.map((food) => (
                <div
                  key={food.id}
                  className="bg-[#111] border border-[#2a2a2a] rounded-3xl overflow-hidden"
                >
                  <img
                    src={food.image}
                    alt={food.name}
                    className="w-full h-48 object-cover"
                  />

                  <div className="p-5">
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">
                          {food.name}
                        </h3>

                        <p className="text-gray-500 text-sm mt-1">
                          {food.seller}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-yellow-400 font-bold text-2xl">
                          ₹{food.price}
                        </p>

                        <p className="text-gray-500 text-sm">
                          {food.stock} left
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-5">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          food.type === "Non-Veg"
                            ? "bg-red-900/40 text-red-400"
                            : "bg-green-900/40 text-green-400"
                        }`}
                      >
                        {food.type}
                      </span>

                      <span className="text-gray-500 text-sm">
                        {food.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
import { useState } from "react";
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

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
    } catch (error) {
      setMessage(`Image upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <p className="text-yellow-400 font-semibold">Seller Dashboard</p>

            <h1 className="text-3xl sm:text-4xl font-bold mt-2">
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
            <h2 className="text-3xl sm:text-4xl font-bold text-yellow-400 mt-3">
              0
            </h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6">
            <p className="text-gray-400">Active Dishes</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-yellow-400 mt-3">
              Live
            </h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6">
            <p className="text-gray-400">Today’s Sales</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-yellow-400 mt-3">
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
      </div>
    </main>
  );
}
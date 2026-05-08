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
    image: "",
    type: "Veg",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleAddDish(event) {
    event.preventDefault();
    setMessage("");

    if (!formData.name || !formData.price || !formData.seller || !formData.time || !formData.stock) {
      setMessage("Please fill dish name, price, seller, ready time, and stock.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("foods").insert([
      {
        name: formData.name,
        price: Number(formData.price),
        seller: formData.seller,
        time: formData.time,
        stock: Number(formData.stock),
        image:
          formData.image ||
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
      },
    ]);

    setLoading(false);

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
      image: "",
      type: "Veg",
      description: "",
    });
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center gap-4">
          <div>
            <p className="text-yellow-400 font-semibold">Seller Dashboard</p>
            <h1 className="text-4xl font-bold mt-2">Manage your food drops</h1>
          </div>

          <Link
            to="/marketplace"
            className="bg-yellow-500 text-black font-bold px-5 py-3 rounded-2xl"
          >
            View Marketplace
          </Link>
        </div>

        <section className="grid md:grid-cols-3 gap-5 mt-10">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-6">
            <p className="text-gray-400">Today’s Orders</p>
            <h2 className="text-4xl font-bold text-yellow-400 mt-3">0</h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-6">
            <p className="text-gray-400">Active Dishes</p>
            <h2 className="text-4xl font-bold text-yellow-400 mt-3">Live</h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-6">
            <p className="text-gray-400">Today’s Sales</p>
            <h2 className="text-4xl font-bold text-yellow-400 mt-3">₹0</h2>
          </div>
        </section>

        <form
          onSubmit={handleAddDish}
          className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-6 mt-8"
        >
          <h2 className="text-2xl font-bold text-yellow-400">Add New Dish</h2>

          {message && (
            <div className="mt-5 bg-black border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
              {message}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mt-6">
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

            <input
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500 md:col-span-2"
              placeholder="Image URL"
            />
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
            className="mt-5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-6 py-3 rounded-2xl"
          >
            {loading ? "Adding Dish..." : "Add Dish"}
          </button>
        </form>
      </div>
    </main>
  );
}
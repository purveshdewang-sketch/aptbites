import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function SellerDashboard() {
  const { user } = useAuth();

  const audioContextRef = useRef(null);
  const previousOrderIdsRef = useRef([]);

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
  const [timerTick, setTimerTick] = useState(0);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [editingFood, setEditingFood] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    if (!user) return;

    const savedSellerName = localStorage.getItem(
      `Quickbites_seller_name_${user.id}`
    );

    if (savedSellerName) {
      setFormData((currentData) => ({
        ...currentData,
        seller: savedSellerName,
      }));
    }

    fetchSellerFoods();
    fetchSellerOrders();

    const channel = supabase
      .channel(`seller-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          fetchSellerOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
  const interval = setInterval(() => {
    setTimerTick((current) => current + 1);
  }, 60000);

  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    if (!user) return;
    if ("Notification" in window) {
  Notification.requestPermission();
}

    const savedSoundSetting = localStorage.getItem(
      `quickbites_seller_sound_${user.id}`
    );

    if (savedSoundSetting === "on") {
      setAudioReady(true);
    }
  }, [user]);

  function getSellerStorageKey() {
    return user ? `Quickbites_seller_name_${user.id}` : "Quickbites_seller_name";
  }

  function toggleNotificationSound() {
    if (!user) return;

    const nextValue = !audioReady;

    setAudioReady(nextValue);

    localStorage.setItem(
      `quickbites_seller_sound_${user.id}`,
      nextValue ? "on" : "off"
    );

    setMessage(
      nextValue
        ? "Order notification sound enabled."
        : "Order notification sound disabled."
    );

    if (nextValue) {
      setTimeout(() => {
        playTingSound(true);
      }, 100);
    }
  }

  function playTingSound(forcePlay = false) {
    if (!audioReady && !forcePlay) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const audioContext = audioContextRef.current;

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const now = audioContext.currentTime;

    [0, 0.1, 0.2].forEach((delay, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";

      const frequencies = [1400, 1600, 1800];

      oscillator.frequency.setValueAtTime(frequencies[index], now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.08);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(now + delay);
      oscillator.stop(now + delay + 0.08);
    });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    if (name === "seller") {
      localStorage.setItem(getSellerStorageKey(), value);
    }
  }

  function getOrderItems(order) {
    if (Array.isArray(order.items)) return order.items;

    if (typeof order.items === "string") {
      try {
        const parsedItems = JSON.parse(order.items);
        return Array.isArray(parsedItems) ? parsedItems : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  async function fetchSellerFoods() {
    if (!user) return;

    setFoodsLoading(true);

    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (!error) {
      setSellerFoods(data || []);
    } else {
      setMessage(`Could not load dishes: ${error.message}`);
    }

    setFoodsLoading(false);
  }

  function handleImageChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSizeInBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > maxSizeInBytes) {
      setMessage("Image is too large. Please upload an image below 5 MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function fetchSellerOrders(shouldCheckNewOrder = false) {
    if (!user) return;

    setOrdersLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id)
      .order("id", { ascending: false });

    if (!error) {
      const nextOrders = data || [];

      if (shouldCheckNewOrder) {
        const previousIds = previousOrderIdsRef.current;
        const newActiveOrderFound = nextOrders.some(
          (order) =>
            !previousIds.includes(order.id) &&
            normalizeStatus(order.status) !== "completed"
        );

       if (newActiveOrderFound) {
  playTingSound();

  document.title = "🔔 New Order - QuickBites";

  setTimeout(() => {
    document.title = "QuickBites Seller";
  }, 5000);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("🍔 New QuickBites Order", {
            body: "You received a new food order.",
            icon: "/favicon.ico",
          });
        }

        setMessage("🔔 New order received.");
      }
      }

      previousOrderIdsRef.current = nextOrders.map((order) => order.id);
      setSellerOrders(nextOrders);
    } else {
      setMessage(`Could not load seller orders: ${error.message}`);
    }

    setOrdersLoading(false);
  }

  async function uploadDishImage() {
    if (!imageFile) {
      return (
        editingFood?.image ||
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop"
      );
    }

    const fileExtension = imageFile.name.split(".").pop();

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExtension}`;

    const filePath = `dishes/${fileName}`;

    const { error } = await supabase.storage
      .from("food-images")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("food-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function resetForm() {
    const savedSellerName = localStorage.getItem(getSellerStorageKey()) || "";

    setFormData({
      name: "",
      price: "",
      seller: savedSellerName,
      time: "",
      stock: "",
      type: "Veg",
      description: "",
    });

    setEditingFood(null);
    setImageFile(null);
    setImagePreview("");
  }

  function startEdit(food) {
    setEditingFood(food);

    setFormData({
      name: food.name || "",
      price: food.price || "",
      seller: food.seller || "",
      time: food.time || "",
      stock: food.stock || "",
      type: food.type || "Veg",
      description: food.description || "",
    });

    if (food.seller) {
      localStorage.setItem(getSellerStorageKey(), food.seller);
    }

    setImagePreview(food.image || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user) {
      setMessage("Please sign in before adding or editing dishes.");
      return;
    }

    if (
      !formData.name ||
      !formData.price ||
      !formData.seller ||
      !formData.time ||
      formData.stock === ""
    ) {
      setMessage("Please fill dish name, price, seller, ready time, and stock.");
      return;
    }

    localStorage.setItem(getSellerStorageKey(), formData.seller);

    setLoading(true);
    setMessage("");

    try {
      const imageUrl = await uploadDishImage();

      const payload = {
        user_id: user.id,
        name: formData.name,
        price: Number(formData.price),
        seller: formData.seller,
        time: formData.time,
        stock: Number(formData.stock),
        type: formData.type,
        description: formData.description,
        image: imageUrl,
      };

      if (editingFood) {
        const { error } = await supabase
          .from("foods")
          .update(payload)
          .eq("id", editingFood.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setMessage("Dish updated successfully.");
      } else {
        const { error } = await supabase.from("foods").insert([payload]);

        if (error) throw error;

        setMessage("Dish added successfully.");
      }

      resetForm();
      fetchSellerFoods();
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteDish(foodId) {
    const confirmDelete = window.confirm("Delete this dish permanently?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("foods")
      .delete()
      .eq("id", foodId)
      .eq("user_id", user.id);

    if (error) {
      setMessage(`Delete failed: ${error.message}`);
      return;
    }

    setMessage("Dish deleted.");
    fetchSellerFoods();
  }

  async function toggleStock(food) {
    const newStockValue = Number(food.stock) === 0 ? 10 : 0;

    const { error } = await supabase
      .from("foods")
      .update({ stock: newStockValue })
      .eq("id", food.id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(`Could not update stock: ${error.message}`);
      return;
    }

    setMessage(
      Number(food.stock) === 0
        ? "Dish is back in stock."
        : "Dish marked as sold out."
    );

    fetchSellerFoods();
  }

  function normalizeStatus(status) {
    return String(status || "confirmed").toLowerCase();
  }

  function getAutoStatus(order) {
  timerTick;

  const createdAt = new Date(order.created_at || Date.now()).getTime();
  const minutesPassed = Math.floor((Date.now() - createdAt) / 60000);

  if (minutesPassed >= 40) return "completed";
  if (minutesPassed >= 30) return "out_for_delivery";
  if (minutesPassed >= 20) return "packing";
  if (minutesPassed >= 10) return "cooking";
  return "confirmed";
}
    const createdAt = new Date(order.created_at || Date.now()).getTime();
    const minutesPassed = Math.floor((Date.now() - createdAt) / 60000);

    if (minutesPassed >= 40) return "completed";
    if (minutesPassed >= 30) return "out_for_delivery";
    if (minutesPassed >= 20) return "packing";
    if (minutesPassed >= 10) return "cooking";
    return "confirmed";
  }

  function getStatusLabel(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "confirmed") return "Confirmed";
    if (currentStatus === "cooking") return "Cooking";
    if (currentStatus === "packing") return "Packing";
    if (currentStatus === "out_for_delivery") return "Out for Delivery";
    if (currentStatus === "completed") return "Delivered";

    return "Confirmed";
  }

  function getStatusBadgeClass(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "completed") {
      return "bg-green-900/40 text-green-300 border-green-500/20";
    }

    if (currentStatus === "cooking") {
      return "bg-orange-900/40 text-orange-300 border-orange-500/20";
    }

    if (currentStatus === "packing") {
      return "bg-blue-900/40 text-blue-300 border-blue-500/20";
    }

    if (currentStatus === "out_for_delivery") {
      return "bg-purple-900/40 text-purple-300 border-purple-500/20";
    }

    return "bg-yellow-900/30 text-yellow-300 border-yellow-500/20";
  }

    function getProgressPercentage(status) {
  const currentStatus = normalizeStatus(status);

  if (currentStatus === "confirmed") return 20;
  if (currentStatus === "cooking") return 40;
  if (currentStatus === "packing") return 65;
  if (currentStatus === "out_for_delivery") return 90;
  if (currentStatus === "completed") return 100;

  return 10;
}

  const activeSellerOrders = sellerOrders.filter(
    (order) => normalizeStatus(getAutoStatus(order)) !== "completed"
  );

  const soldOrders = sellerOrders.filter(
    (order) => normalizeStatus(getAutoStatus(order)) === "completed"
  );

  const totalOrdersCount = sellerOrders.length;
  const activeOrdersCount = activeSellerOrders.length;
  const soldOrdersCount = soldOrders.length;

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-10 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#111] border border-[#222] rounded-[2rem] p-8 text-center">
          <h1 className="text-3xl font-black">Seller login required</h1>

          <p className="text-gray-500 mt-4">
            Please sign in before adding or managing food dishes.
          </p>

          <Link
            to="/customer-login"
            className="block mt-7 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl"
          >
            Sign In
          </Link>

          <Link
            to="/"
            className="block mt-3 border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 font-bold py-3 rounded-2xl transition-all"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
              Seller Dashboard
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-2 tracking-tight">
              Manage your food drops
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/"
              className="border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 active:scale-95 font-bold px-5 py-3 rounded-2xl text-center transition-all"
            >
              ← Back to Home
            </Link>

            <button
              type="button"
              onClick={toggleNotificationSound}
              className={`${
                audioReady
                  ? "bg-green-500 text-black"
                  : "bg-[#111] text-yellow-400 border border-yellow-500/40"
              } active:scale-95 font-bold px-5 py-3 rounded-2xl text-center transition-all`}
            >
              {audioReady ? "🔕 Turn Sound Off" : "🔔 Turn Sound On"}
            </button>

            <Link
              to="/marketplace"
              className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-5 py-3 rounded-2xl text-center transition-all"
            >
              View Marketplace
            </Link>
          </div>
        </div>

        {message && (
          <div className="mt-5 bg-[#111] border border-[#333] rounded-2xl p-4 text-sm text-gray-300">
            {message}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-5 mt-8">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5">
            <p className="text-gray-400">Total Orders</p>
            <h2 className="text-4xl font-black text-yellow-400 mt-3">
              {totalOrdersCount}
            </h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5">
            <p className="text-gray-400">Active Orders</p>
            <h2 className="text-4xl font-black text-yellow-400 mt-3">
              {activeOrdersCount}
            </h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5">
            <p className="text-gray-400">Sold Orders</p>
            <h2 className="text-4xl font-black text-yellow-400 mt-3">
              {soldOrdersCount}
            </h2>
          </div>

          <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5">
            <p className="text-gray-400">Active Dishes</p>
            <h2 className="text-4xl font-black text-yellow-400 mt-3">
              {sellerFoods.filter((food) => Number(food.stock) > 0).length}
            </h2>
          </div>
        </section>

        <section className="mt-8 bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                Incoming Orders
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                Active Order Panel
              </h2>
            </div>

            <button
              type="button"
              onClick={() => fetchSellerOrders()}
              className="bg-black border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 font-bold px-4 py-3 rounded-2xl transition-all"
            >
              Refresh
            </button>
          </div>

          {ordersLoading ? (
            <p className="text-gray-500 mt-6">Loading seller orders...</p>
          ) : activeSellerOrders.length === 0 ? (
            <div className="mt-6 bg-black/40 border border-[#222] rounded-3xl p-8 text-center">
              <div className="text-5xl">🛎️</div>
              <p className="text-gray-400 font-bold mt-4">
                No active orders right now.
              </p>
              <p className="text-gray-600 text-sm mt-2">
                New customer orders will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {activeSellerOrders.map((order) => {
                const autoStatus = getAutoStatus(order);

                return (
                  <article
                    key={order.id}
                    className="bg-black/40 border border-[#222] rounded-3xl p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <p className="text-gray-500 text-sm">Order #{order.id}</p>

                        <h3 className="text-2xl font-black mt-1">
                          ₹{order.total_amount}
                        </h3>

                        <p className="text-gray-400 text-sm mt-2">
                          {order.customer_name} • {order.phone}
                        </p>

                        <p className="text-gray-500 text-sm mt-1">
                          {order.delivery_type} • {order.flat}
                        </p>
                      </div>

                      <span
                        className={`w-fit border text-xs font-bold px-3 py-1.5 rounded-full ${getStatusBadgeClass(
                          autoStatus
                        )}`}
                      >
                        {getStatusLabel(autoStatus)}

                        <div className="mt-3">
                        <div className="w-full h-2 bg-[#222] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 transition-all duration-1000 ease-in-out"
                            style={{
                              width: `${getProgressPercentage(autoStatus)}%`,
                            }}
                          />
                        </div>
                      </div>

                      </span>
                    </div>

                    <div className="mt-4 bg-[#111] border border-[#222] rounded-2xl p-4 space-y-3">
                      {getOrderItems(order).map((item) => (
                        <div
                          key={`${order.id}-${item.id}`}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {item.name}
                            </p>
                            <p className="text-gray-500 text-sm">
                              Qty {item.quantity} × ₹{item.price}
                            </p>
                          </div>

                          <p className="text-yellow-400 font-bold shrink-0">
                            ₹
                            {Number(item.price || 0) *
                              Number(item.quantity || 0)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-gray-500 text-sm mt-4">
                        Note: {order.notes}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <a
                        href={`tel:${order.phone}`}
                        className="bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black py-3 rounded-2xl text-center transition-all"
                      >
                        📞 Call Customer
                      </a>

                      <a
                        href={`https://wa.me/91${String(order.phone).replace(
                          /\D/g,
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] hover:brightness-110 active:scale-95 text-black font-black py-3 rounded-2xl text-center transition-all"
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6 mt-8"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-yellow-400">
              {editingFood ? "Edit Dish" : "Add New Dish"}
            </h2>

            {editingFood && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-400 hover:text-yellow-400"
              >
                Cancel Edit
              </button>
            )}
          </div>

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
              min="0"
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

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] hover:border-yellow-500/50 bg-black rounded-3xl p-8 cursor-pointer transition-all">
                <div className="text-5xl mb-3">📸</div>

                <p className="text-white font-semibold">Tap to upload image</p>

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
            className="mt-5 w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-2xl"
          >
            {loading ? "Saving..." : editingFood ? "Update Dish" : "Add Dish"}
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
            <p className="text-gray-500">Loading your dishes...</p>
          ) : sellerFoods.length === 0 ? (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-3xl p-8 text-center">
              <p className="text-gray-500">No dishes added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {sellerFoods.map((food) => (
                <div
                  key={food.id}
                  className="bg-[#111] border border-[#2a2a2a] rounded-3xl overflow-hidden hover:border-yellow-500/30 transition-all"
                >
                  <img
                    src={food.image}
                    alt={food.name}
                    className="w-full aspect-square object-cover"
                  />

                  <div className="p-5">
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">{food.name}</h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {food.seller}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-yellow-400 font-bold text-2xl">
                          ₹{food.price}
                        </p>

                        <p
                          className={`text-sm font-semibold ${
                            Number(food.stock) <= 2
                              ? "text-red-400"
                              : Number(food.stock) <= 5
                              ? "text-yellow-400"
                              : "text-gray-500"
                          }`}
                        >
                          {Number(food.stock) <= 2
                            ? `🔥 Only ${food.stock} left`
                            : `${food.stock} left`}
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

                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          Number(food.stock) === 0
                            ? "bg-red-900/40 text-red-400"
                            : "bg-yellow-900/30 text-yellow-300"
                        }`}
                      >
                        {Number(food.stock) === 0 ? "Sold Out" : food.time}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-5">
                      <button
                        type="button"
                        onClick={() => startEdit(food)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-xl"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStock(food)}
                        className="border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold py-2 rounded-xl"
                      >
                        {Number(food.stock) === 0 ? "In Stock" : "Sold Out"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteDish(food.id)}
                        className="border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black font-bold py-2 rounded-xl"
                      >
                        Delete
                      </button>
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
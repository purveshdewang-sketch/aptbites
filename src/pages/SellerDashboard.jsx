import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const FOOD_CATEGORIES = [
  "Meals",
  "Breakfast",
  "Snacks",
  "Sweets",
  "Drinks",
  "Tiffin",
  "Specials",
];

const PLATFORM_FEE = 10;

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
    category: "Meals",
    description: "",
  });

  const [sellerFoods, setSellerFoods] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerOnline, setSellerOnline] = useState(true);
  const [acceptScheduledOrders, setAcceptScheduledOrders] = useState(true);
  const [timerTick, setTimerTick] = useState(0);
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

    fetchSellerProfile();
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

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchSellerOrders(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  function getSellerStorageKey() {
    return user ? `Quickbites_seller_name_${user.id}` : "Quickbites_seller_name";
  }

  async function fetchSellerProfile() {
  if (!user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("seller_online, accept_scheduled_orders")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && data) {
    setSellerOnline(data.seller_online !== false);
    setAcceptScheduledOrders(data.accept_scheduled_orders !== false);
  }
}


  async function toggleSellerOnline() {
    if (!user) return;

    const nextStatus = !sellerOnline;
    setSellerOnline(nextStatus);

    const { error } = await supabase
      .from("profiles")
      .update({ seller_online: nextStatus })
      .eq("id", user.id);

    if (error) {
      setSellerOnline(!nextStatus);
      setMessage(`Could not update online status: ${error.message}`);
      return;
    }

    setMessage(nextStatus ? "You are now online." : "You are now offline.");
  }

async function toggleAcceptScheduledOrders() {
  if (!user) return;

  const nextStatus = !acceptScheduledOrders;
  setAcceptScheduledOrders(nextStatus);

  const { error } = await supabase
    .from("profiles")
    .update({ accept_scheduled_orders: nextStatus })
    .eq("id", user.id);

  if (error) {
    setAcceptScheduledOrders(!nextStatus);
    setMessage(`Could not update scheduled order status: ${error.message}`);
    return;
  }

  setMessage(
    nextStatus
      ? "Scheduled orders are now accepted."
      : "Scheduled orders are now turned off."
  );
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

function isScheduledOrder(order) {
  return order.scheduled_order === true || Boolean(order.scheduled_for);
}

function formatScheduledDateTime(value) {
  if (!value) return "Schedule time not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Schedule time not available";
  }

  return date.toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
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

        const newActiveOrderFound = nextOrders.some((order) => {
          const dbStatus = normalizeStatus(order.status);
          return (
            !previousIds.includes(order.id) &&
            dbStatus !== "completed" &&
            dbStatus !== "cancelled"
          );
        });

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

  async function handleImageChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    try {
      setMessage("Compressing image...");

      const compressedFile = await compressImage(file);

      setImageFile(compressedFile);

      const previewUrl = URL.createObjectURL(compressedFile);

      setImagePreview(previewUrl);

      setMessage(
        `Image optimized (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`
      );
    } catch (error) {
      setMessage("Could not process image.");
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");

        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }

            const compressedFile = new File(
              [blob],
              `${Date.now()}-quickbites.jpg`,
              {
                type: "image/jpeg",
              }
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          0.75
        );
      };

      image.onerror = reject;

      image.src = URL.createObjectURL(file);
    });
  }

  async function uploadDishImage() {
    if (!imageFile) {
      return editingFood?.image || "";
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

    const { data } = supabase.storage.from("food-images").getPublicUrl(filePath);

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
      category: "Meals",
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
      category: food.category || "Meals",
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

    if (!editingFood && !imageFile) {
      setMessage("Please upload a dish image before adding this dish.");
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
        category: formData.category,
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

  async function acceptOrder(orderId) {
    const { error } = await supabase
      .from("orders")
      .update({ seller_response: "accepted" })
      .eq("id", orderId)
      .eq("seller_id", user.id);

    if (error) {
      setMessage(`Could not accept order: ${error.message}`);
      return;
    }

    setMessage("Order accepted.");
    fetchSellerOrders();
  }

  async function rejectOrder(orderId) {
    const confirmReject = window.confirm("Reject this order?");
    if (!confirmReject) return;

    const { error } = await supabase
      .from("orders")
      .update({
        seller_response: "rejected",
        status: "cancelled",
      })
      .eq("id", orderId)
      .eq("seller_id", user.id);

    if (error) {
      setMessage(`Could not reject order: ${error.message}`);
      return;
    }

    setMessage("Order rejected.");
    fetchSellerOrders();
  }

  async function completeOrder(orderId) {
  const confirmComplete = window.confirm("Mark this order as completed?");

  if (!confirmComplete) return;

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "completed" })
    .eq("id", orderId)
    .eq("seller_id", user.id)
    .select("*");

  if (error) {
    setMessage(`Could not complete order: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    setMessage("Order completion failed. Order was not updated.");
    return;
  }

  setSellerOrders((currentOrders) =>
    currentOrders.map((order) =>
      order.id === orderId ? data[0] : order
    )
  );

  setMessage("Order completed. Earnings updated.");
  fetchSellerOrders(false);
}

  async function markReadyForPickup(orderId) {
    const { error } = await supabase
      .from("orders")
      .update({
        ready_for_pickup: true,
        seller_response: "accepted",
      })
      .eq("id", orderId)
      .eq("seller_id", user.id);

    if (error) {
      setMessage(`Could not mark ready for pickup: ${error.message}`);
      return;
    }

    setMessage("Order marked ready for pickup.");
    fetchSellerOrders();
  }

  function normalizeStatus(status) {
    return String(status || "confirmed").toLowerCase();
  }

  function normalizeSellerResponse(response) {
    return String(response || "pending").toLowerCase();
  }

  function isSelfPickup(order) {
    return String(order.delivery_type || "").toLowerCase().includes("pickup");
  }

  function getAutoStatus(order) {
    timerTick;

    const dbStatus = normalizeStatus(order.status);
    const sellerResponse = normalizeSellerResponse(order.seller_response);

    if (dbStatus === "cancelled" || sellerResponse === "rejected") {
      return "cancelled";
    }

    if (dbStatus === "completed") {
      return "completed";
    }

    if (sellerResponse === "pending") {
      return "pending";
    }

    if (order.ready_for_pickup) {
      return "ready_for_pickup";
    }

    return "accepted";
  }

  function getStatusLabel(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "pending") return "New Order";
    if (currentStatus === "accepted") return "Accepted";
    if (currentStatus === "confirmed") return "Confirmed";
    if (currentStatus === "cooking") return "Cooking";
    if (currentStatus === "packing") return "Packing";
    if (currentStatus === "ready_for_pickup") return "Ready for Pickup";
    if (currentStatus === "completed") return "Delivered";
    if (currentStatus === "cancelled") return "Cancelled";

    return "New Order";
  }

  function getStatusBadgeClass(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "cancelled") {
      return "bg-red-900/40 text-red-300 border-red-500/20";
    }

    if (currentStatus === "completed") {
      return "bg-green-900/40 text-green-300 border-green-500/20";
    }

    if (currentStatus === "ready_for_pickup") {
      return "bg-emerald-900/40 text-emerald-300 border-emerald-500/20";
    }

    if (currentStatus === "packing") {
      return "bg-blue-900/40 text-blue-300 border-blue-500/20";
    }

    if (currentStatus === "cooking") {
      return "bg-orange-900/40 text-orange-300 border-orange-500/20";
    }

    if (currentStatus === "accepted") {
      return "bg-yellow-900/30 text-yellow-300 border-yellow-500/20";
    }

    return "bg-purple-900/40 text-purple-300 border-purple-500/20";
  }

  function getProgressPercentage(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "pending") return 10;
    if (currentStatus === "accepted") return 25;
    if (currentStatus === "cooking") return 45;
    if (currentStatus === "packing") return 75;
    if (currentStatus === "ready_for_pickup") return 90;
    if (currentStatus === "completed") return 100;

    return 10;
  }

  const activeSellerOrders = sellerOrders.filter((order) => {
    const dbStatus = normalizeStatus(order.status);
    const autoStatus = normalizeStatus(getAutoStatus(order));
    const sellerResponse = normalizeSellerResponse(order.seller_response);

    if (dbStatus === "cancelled") return false;
    if (sellerResponse === "rejected") return false;
    if (autoStatus === "completed") return false;

    return true;
  });

  const completedOrders = sellerOrders.filter((order) => {
    const dbStatus = normalizeStatus(order.status);
    const sellerResponse = normalizeSellerResponse(order.seller_response);

    if (dbStatus !== "completed") return false;
    if (sellerResponse === "rejected") return false;

    return true;
  });

  const todayDateString = new Date().toDateString();

  const todayCompletedOrders = completedOrders.filter((order) => {
    if (!order.created_at) return false;

    return new Date(order.created_at).toDateString() === todayDateString;
  });

  const grossEarnings = completedOrders.reduce((total, order) => {
    return total + Number(order.subtotal_amount || 0);
  }, 0);

  const todayEarnings = todayCompletedOrders.reduce((total, order) => {
    return total + Number(order.subtotal_amount || 0);
  }, 0);

  
  const averageOrderValue =
    completedOrders.length > 0
      ? Math.round(grossEarnings / completedOrders.length)
      : 0;

  const itemSalesMap = {};

  completedOrders.forEach((order) => {
    const items = getOrderItems(order);

    items.forEach((item) => {
      const itemName = item.name || "Unknown item";
      const itemQuantity = Number(item.quantity || 0);
      const itemRevenue = Number(item.price || 0) * itemQuantity;

      if (!itemSalesMap[itemName]) {
        itemSalesMap[itemName] = {
          name: itemName,
          quantity: 0,
          revenue: 0,
        };
      }

      itemSalesMap[itemName].quantity += itemQuantity;
      itemSalesMap[itemName].revenue += itemRevenue;
    });
  });

  const bestSellingItems = Object.values(itemSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const totalOrdersCount = sellerOrders.length;
  const activeOrdersCount = activeSellerOrders.length;
  const soldOrdersCount = completedOrders.length;

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

            <p className="text-gray-500 mt-3">
              {sellerOnline
                ? "You are online and accepting orders."
                : "You are offline. Customers should not place new orders."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              to="/"
              className="border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 active:scale-95 font-bold px-5 py-3 rounded-full min-w-[140px] text-center transition-all"
            >
              ← Home
            </Link>

            <button
              type="button"
              onClick={toggleSellerOnline}
              className={`active:scale-95 font-bold px-5 py-3 rounded-2xl text-center transition-all ${
                sellerOnline
                  ? "bg-green-500 text-black"
                  : "bg-red-500 text-black"
              }`}
            >
              {sellerOnline ? "🟢 Online" : "🔴 Offline"}
            </button>

            <button
  type="button"
  onClick={toggleAcceptScheduledOrders}
  className={`active:scale-95 font-bold px-5 py-3 rounded-2xl text-center transition-all ${
    acceptScheduledOrders
      ? "bg-yellow-500 text-black"
      : "bg-[#111] text-gray-400 border border-[#333]"
  }`}
>
  {acceptScheduledOrders ? "🕒 Schedule ON" : "🕒 Schedule OFF"}
</button>

            <button
              type="button"
              onClick={toggleNotificationSound}
              className={`${
                audioReady
                  ? "bg-green-500 text-black"
                  : "bg-[#111] text-yellow-400 border border-yellow-500/40"
              } active:scale-95 font-bold px-5 py-3 rounded-2xl text-center transition-all`}
            >
              {audioReady ? "🔕 Sound Off" : "🔔 Sound On"}
            </button>

            <Link
              to="/marketplace"
              className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-5 py-3 rounded-2xl text-center transition-all"
            >
              Marketplace
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
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                Earnings Analytics
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                Seller Earnings
              </h2>
            </div>

            <p className="text-gray-500 text-sm">
              Calculated from completed orders only.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-black/40 border border-[#222] rounded-3xl p-5">
              <p className="text-gray-400 text-sm">Today’s Earnings</p>
              <h3 className="text-3xl font-black text-yellow-400 mt-3">
                ₹{todayEarnings}
              </h3>
            </div>

            <div className="bg-black/40 border border-[#222] rounded-3xl p-5">
              <p className="text-gray-400 text-sm">Gross Earnings</p>
              <h3 className="text-3xl font-black text-yellow-400 mt-3">
                ₹{grossEarnings}
              </h3>
            </div>

            <div className="bg-black/40 border border-[#222] rounded-3xl p-5">
              <p className="text-gray-400 text-sm">Completed Orders</p>
              <h3 className="text-3xl font-black text-yellow-400 mt-3">
                {completedOrders.length}
              </h3>
            </div>

            <div className="bg-black/40 border border-[#222] rounded-3xl p-5">
              <p className="text-gray-400 text-sm">Avg Order Value</p>
              <h3 className="text-3xl font-black text-yellow-400 mt-3">
                ₹{averageOrderValue}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 mt-5">
            

            <div className="bg-black/40 border border-[#222] rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-gray-400 text-sm">Best Selling Dishes</p>
                  <h3 className="text-xl font-black mt-1">Top 5 items</h3>
                </div>
              </div>

              {bestSellingItems.length === 0 ? (
                <p className="text-gray-600 text-sm mt-5">
                  No completed order data yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {bestSellingItems.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-4 border border-[#222] rounded-2xl p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          #{index + 1} {item.name}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {item.quantity} sold
                        </p>
                      </div>

                      <p className="text-yellow-400 font-black shrink-0">
                        ₹{item.revenue}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 bg-[#111] border border-[#2a2a2a] rounded-3xl p-5 sm:p-6">
          <div>
            <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
              Incoming Orders
            </p>

            <h2 className="text-2xl sm:text-3xl font-bold mt-1">
              Active Order Panel
            </h2>
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
                const sellerResponse = normalizeSellerResponse(
                  
                  order.seller_response
                );
                
                const orderIsSelfPickup = isSelfPickup(order);
                const scheduled = isScheduledOrder(order);

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

                        <div className="flex flex-wrap gap-2 mt-3">
  <span
    className={`text-xs font-bold px-3 py-1 rounded-full ${
      orderIsSelfPickup
        ? "bg-emerald-900/40 text-emerald-300"
        : "bg-blue-900/40 text-blue-300"
    }`}
  >
    {orderIsSelfPickup ? "🛍️ Self Pickup" : "🚚 Delivery"}
  </span>

  <span
    className={`text-xs font-bold px-3 py-1 rounded-full ${
      sellerResponse === "accepted"
        ? "bg-green-900/40 text-green-300"
        : "bg-purple-900/40 text-purple-300"
    }`}
  >
{scheduled && (
  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
    <p className="text-yellow-300 text-sm font-black">
      Scheduled for
    </p>

    <p className="text-white text-lg font-black mt-1">
      {formatScheduledDateTime(order.scheduled_for)}
    </p>
  </div>
)}

    {sellerResponse === "accepted"
      ? "Accepted"
      : "Needs Response"}
  </span>

  {order.scheduled_order && (
    <span className="text-xs font-bold px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
      🕒 Scheduled
    </span>
  )}
</div>
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

                    {sellerResponse === "pending" && (
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <button
                          type="button"
                          onClick={() => acceptOrder(order.id)}
                          className="bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black py-3 rounded-2xl transition-all"
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectOrder(order.id)}
                          className="bg-red-500 hover:bg-red-400 active:scale-95 text-black font-black py-3 rounded-2xl transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {sellerResponse === "accepted" &&
                      orderIsSelfPickup &&
                      !order.ready_for_pickup && (
                        <button
                          type="button"
                          onClick={() => markReadyForPickup(order.id)}
                          className="mt-5 w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-black py-3 rounded-2xl transition-all"
                        >
                          Mark Ready for Pickup
                        </button>
                      )}

                    {order.ready_for_pickup && orderIsSelfPickup && (
                      <div className="mt-5 w-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-black py-3 rounded-2xl text-center">
                        Ready for Pickup
                      </div>
                    )}

                    {sellerResponse === "accepted" && (
                      <button
                        type="button"
                        onClick={() => completeOrder(order.id)}
                        className="mt-5 w-full bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black py-3 rounded-2xl transition-all"
                      >
                        Complete Order
                      </button>
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
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500"
            >
              {FOOD_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>

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
              className="bg-black border border-[#333] rounded-xl px-4 py-3 outline-none focus:border-yellow-500 md:col-span-2"
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
                  JPG, PNG, WEBP · Auto optimized for mobile
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
                      <div className="flex gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${
                            food.type === "Non-Veg"
                              ? "bg-red-900/40 text-red-400"
                              : "bg-green-900/40 text-green-400"
                          }`}
                        >
                          {food.type}
                        </span>
                      </div>

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
}
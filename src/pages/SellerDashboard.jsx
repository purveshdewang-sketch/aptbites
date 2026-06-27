import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
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

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const audioContextRef = useRef(null);
  const previousOrderIdsRef = useRef([]);
  const uploadImageInputRef = useRef(null);
  const cameraImageInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("dashboard");

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

  const [sellerSetupData, setSellerSetupData] = useState({
    seller_kitchen_name: "",
    flat: "",
    phone: "",
    seller_specialty: "",
    seller_about: "",
    accept_scheduled_orders: true,
    delivery_available: true,
    pickup_available: true,
    packing_charge: 5,
  });

  const [sellerProfileComplete, setSellerProfileComplete] = useState(false);
  const [bankDetailsCompleted, setBankDetailsCompleted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const [sellerFoods, setSellerFoods] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerOnline, setSellerOnline] = useState(true);
  const [acceptScheduledOrders, setAcceptScheduledOrders] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [packingCharge, setPackingCharge] = useState(5);
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

    const savedSellerName = localStorage.getItem(`Nefo_seller_name_${user.id}`);

    if (savedSellerName) {
      setFormData((currentData) => ({
        ...currentData,
        seller: savedSellerName,
      }));
    }

    fetchSellerProfile();
    fetchSellerFoods();
    fetchSellerOrders();

    const orderChannel = supabase
      .channel(`seller-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${user.id}`,
        },
        () => fetchSellerOrders(true)
      )
      .subscribe();

    const messageChannel = supabase
      .channel(`seller-order-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
        },
        (payload) => {
          if (payload?.new?.sender_id !== user.id) {
            fetchSellerOrders(false);
            setMessage("💬 New customer message received.");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(messageChannel);
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
      `Nefo_seller_sound_${user.id}`
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
    return user ? `Nefo_seller_name_${user.id}` : "Nefo_seller_name";
  }

  function getSafePackingCharge(value) {
    return Math.min(15, Math.max(5, Number(value || 5)));
  }

  function isSellerSetupComplete(profile) {
    return Boolean(
      profile?.seller_kitchen_name &&
        profile?.flat &&
        profile?.phone &&
        profile?.seller_specialty &&
        profile?.seller_about
    );
  }

  async function fetchSellerProfile() {
    if (!user) return;

    setProfileLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "role, is_seller, seller_online, accept_scheduled_orders, delivery_available, pickup_available, packing_charge, seller_kitchen_name, flat, phone, seller_specialty, seller_about, bank_details_completed"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setMessage(`Could not load seller profile: ${error.message}`);
      setProfileLoading(false);
      return;
    }

    const profileRole = String(data?.role || "").toLowerCase();

    const isApprovedSeller =
      data?.is_seller === true ||
      profileRole === "seller" ||
      profileRole === "admin";

    if (!isApprovedSeller) {
      setSellerProfileComplete(false);
      setMessage(
        "This account is not approved as a seller. Please apply to sell on Nefo and wait for owner approval."
      );
      setProfileLoading(false);
      return;
    }

    const safePackingCharge = getSafePackingCharge(data?.packing_charge || 5);
    const bankComplete = data?.bank_details_completed === true;

    setBankDetailsCompleted(bankComplete);
    setSellerOnline(data?.seller_online !== false);
    setAcceptScheduledOrders(data?.accept_scheduled_orders !== false);
    setDeliveryAvailable(data?.delivery_available !== false);
    setPickupAvailable(data?.pickup_available !== false);
    setPackingCharge(safePackingCharge);

    const setupData = {
      seller_kitchen_name: data?.seller_kitchen_name || "",
      flat: data?.flat || "",
      phone: data?.phone || "",
      seller_specialty: data?.seller_specialty || "",
      seller_about: data?.seller_about || "",
      accept_scheduled_orders: data?.accept_scheduled_orders !== false,
      delivery_available: data?.delivery_available !== false,
      pickup_available: data?.pickup_available !== false,
      packing_charge: safePackingCharge,
    };

    setSellerSetupData(setupData);

    const setupComplete = isSellerSetupComplete(setupData);
    setSellerProfileComplete(setupComplete);

    if (setupData.seller_kitchen_name) {
      localStorage.setItem(
        `Nefo_seller_name_${user.id}`,
        setupData.seller_kitchen_name
      );

      setFormData((currentData) => ({
        ...currentData,
        seller: setupData.seller_kitchen_name,
      }));
    }

    if (setupComplete) {
      localStorage.removeItem(`Nefo_seller_profile_incomplete_${user.id}`);
    } else {
      localStorage.setItem(`Nefo_seller_profile_incomplete_${user.id}`, "yes");
    }

    setProfileLoading(false);
  }

  function handleSellerSetupChange(event) {
    const { name, value, type, checked } = event.target;

    setSellerSetupData((currentData) => ({
      ...currentData,
      [name]:
        type === "checkbox"
          ? checked
          : name === "packing_charge"
          ? getSafePackingCharge(value)
          : value,
    }));
  }

  async function saveSellerSetup(event) {
    event.preventDefault();

    if (!user) return;

    if (
      !sellerSetupData.seller_kitchen_name.trim() ||
      !sellerSetupData.flat.trim() ||
      !sellerSetupData.phone.trim() ||
      !sellerSetupData.seller_specialty.trim() ||
      !sellerSetupData.seller_about.trim()
    ) {
      setMessage("Please complete all seller profile fields.");
      return;
    }

    if (
      sellerSetupData.delivery_available === false &&
      sellerSetupData.pickup_available === false
    ) {
      setMessage("At least one option must stay ON: Delivery or Self Pickup.");
      return;
    }

    const safePackingCharge = getSafePackingCharge(
      sellerSetupData.packing_charge
    );

    setProfileSaving(true);
    setMessage("");

    const payload = {
      id: user.id,
      email: user.email,
      role: "seller",
      is_seller: true,
      seller_online: true,
      accept_scheduled_orders: sellerSetupData.accept_scheduled_orders,
      delivery_available: sellerSetupData.delivery_available,
      pickup_available: sellerSetupData.pickup_available,
      packing_charge: safePackingCharge,
      full_name: sellerSetupData.seller_kitchen_name.trim(),
      flat: sellerSetupData.flat.trim(),
      phone: sellerSetupData.phone.trim(),
      seller_kitchen_name: sellerSetupData.seller_kitchen_name.trim(),
      seller_specialty: sellerSetupData.seller_specialty.trim(),
      seller_about: sellerSetupData.seller_about.trim(),
    };

    const { error } = await supabase.from("profiles").upsert(payload);

    if (error) {
      setMessage(`Seller profile could not be saved: ${error.message}`);
      setProfileSaving(false);
      return;
    }

    localStorage.setItem(`Nefo_seller_access_${user.id}`, "yes");
    localStorage.setItem(
      `Nefo_seller_name_${user.id}`,
      sellerSetupData.seller_kitchen_name.trim()
    );
    localStorage.removeItem(`Nefo_seller_profile_incomplete_${user.id}`);

    setFormData((currentData) => ({
      ...currentData,
      seller: sellerSetupData.seller_kitchen_name.trim(),
    }));

    setSellerOnline(true);
    setAcceptScheduledOrders(sellerSetupData.accept_scheduled_orders);
    setDeliveryAvailable(sellerSetupData.delivery_available);
    setPickupAvailable(sellerSetupData.pickup_available);
    setPackingCharge(safePackingCharge);
    setSellerProfileComplete(true);
    setProfileSaving(false);
    setMessage("Seller profile completed successfully.");
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

    setSellerSetupData((currentData) => ({
      ...currentData,
      accept_scheduled_orders: nextStatus,
    }));

    setMessage(
      nextStatus
        ? "Scheduled orders are now accepted."
        : "Scheduled orders are now turned off."
    );
  }

  async function toggleDeliveryAvailable() {
    if (!user) return;

    const nextStatus = !deliveryAvailable;

    if (!nextStatus && !pickupAvailable) {
      setMessage("At least one option must stay ON: Delivery or Self Pickup.");
      return;
    }

    setDeliveryAvailable(nextStatus);

    const { error } = await supabase
      .from("profiles")
      .update({ delivery_available: nextStatus })
      .eq("id", user.id);

    if (error) {
      setDeliveryAvailable(!nextStatus);
      setMessage(`Could not update delivery setting: ${error.message}`);
      return;
    }

    setSellerSetupData((currentData) => ({
      ...currentData,
      delivery_available: nextStatus,
    }));

    setMessage(
      nextStatus
        ? "Delivery is now available for customers."
        : "Delivery is now turned off."
    );
  }

  async function togglePickupAvailable() {
    if (!user) return;

    const nextStatus = !pickupAvailable;

    if (!nextStatus && !deliveryAvailable) {
      setMessage("At least one option must stay ON: Delivery or Self Pickup.");
      return;
    }

    setPickupAvailable(nextStatus);

    const { error } = await supabase
      .from("profiles")
      .update({ pickup_available: nextStatus })
      .eq("id", user.id);

    if (error) {
      setPickupAvailable(!nextStatus);
      setMessage(`Could not update pickup setting: ${error.message}`);
      return;
    }

    setSellerSetupData((currentData) => ({
      ...currentData,
      pickup_available: nextStatus,
    }));

    setMessage(
      nextStatus
        ? "Self pickup is now available for customers."
        : "Self pickup is now turned off."
    );
  }

  async function updatePackingCharge(nextCharge) {
    if (!user) return;

    const safeCharge = getSafePackingCharge(nextCharge);

    setPackingCharge(safeCharge);

    setSellerSetupData((currentData) => ({
      ...currentData,
      packing_charge: safeCharge,
    }));

    const { error } = await supabase
      .from("profiles")
      .update({ packing_charge: safeCharge })
      .eq("id", user.id);

    if (error) {
      setMessage(`Could not update packing charge: ${error.message}`);
      fetchSellerProfile();
      return;
    }

    setMessage(`Packing charge updated to ₹${safeCharge}.`);
  }

  function toggleNotificationSound() {
    if (!user) return;

    const nextValue = !audioReady;
    setAudioReady(nextValue);

    localStorage.setItem(
      `Nefo_seller_sound_${user.id}`,
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

          document.title = "🔔 New Order - Nefo";

          setTimeout(() => {
            document.title = "Nefo Seller";
          }, 5000);

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🍔 New Nefo Order", {
              body: "You received a new food order.",
              icon: "/Nefo-logo.png",
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
    } catch {
      setMessage("Could not process image.");
    }
  }

  function removeSelectedImage() {
    setImageFile(null);
    setImagePreview(editingFood?.image || "");
    setMessage(
      editingFood ? "Image reverted to existing dish image." : "Image removed."
    );

    if (uploadImageInputRef.current) {
      uploadImageInputRef.current.value = "";
    }

    if (cameraImageInputRef.current) {
      cameraImageInputRef.current.value = "";
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

            const compressedFile = new File([blob], `${Date.now()}-Nefo.jpg`, {
              type: "image/jpeg",
            });

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

    if (uploadImageInputRef.current) {
      uploadImageInputRef.current.value = "";
    }

    if (cameraImageInputRef.current) {
      cameraImageInputRef.current.value = "";
    }
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

    setImageFile(null);
    setImagePreview(food.image || "");

    setActiveTab("menu");

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

    if (!sellerProfileComplete) {
      setMessage("Please complete your seller profile before adding dishes.");
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
      currentOrders.map((order) => (order.id === orderId ? data[0] : order))
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

    if (currentStatus === "pending") return "Pending";
    if (currentStatus === "accepted") return "Preparing";
    if (currentStatus === "confirmed") return "Confirmed";
    if (currentStatus === "cooking") return "Cooking";
    if (currentStatus === "packing") return "Packing";
    if (currentStatus === "ready_for_pickup") return "Ready";
    if (currentStatus === "completed") return "Completed";
    if (currentStatus === "cancelled") return "Cancelled";

    return "Pending";
  }

  function getStatusPillClass(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "completed") {
      return "bg-[#DFF8EF] text-[#087A51]";
    }

    if (currentStatus === "cancelled") {
      return "bg-red-50 text-red-600";
    }

    if (currentStatus === "pending") {
      return "bg-yellow-50 text-yellow-700";
    }

    return "bg-[#DFF8EF] text-[#087A51]";
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

  const todayTotalOrders = sellerOrders.filter((order) => {
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
  const pendingOrdersCount = sellerOrders.filter(
    (order) => normalizeSellerResponse(order.seller_response) === "pending"
  ).length;
  const preparingOrdersCount = activeSellerOrders.filter(
    (order) => normalizeSellerResponse(order.seller_response) === "accepted"
  ).length;
  const completedOrdersCount = completedOrders.length;
  const activeDishesCount = sellerFoods.filter(
    (food) => Number(food.stock) > 0
  ).length;

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-10 flex items-center justify-center">
          <div className="max-w-md w-full nefo-neo-white p-7 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-3xl">
              👨‍🍳
            </div>
            <h1 className="text-2xl font-black mt-5">
              Seller login required
            </h1>
            <p className="text-[#51615D] mt-3">
              Please sign in before managing food dishes.
            </p>
            <Link
              to="/seller-login"
              className="block mt-6 bg-[#073B35] text-white font-black py-4 rounded-2xl"
            >
              Seller Sign In
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (profileLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-10 flex items-center justify-center">
          <div className="max-w-md w-full nefo-neo-white p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-3xl">
              👨‍🍳
            </div>
            <p className="text-[#51615D] font-bold mt-4">
              Loading kitchen profile...
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!bankDetailsCompleted) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-10 flex items-center justify-center">
          <div className="max-w-md w-full nefo-neo-white p-7 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-4xl">
              🏦
            </div>
            <h1 className="text-3xl font-black mt-6">
              Complete bank details
            </h1>
            <p className="text-[#51615D] mt-3 leading-relaxed">
              Payout bank details are required before opening Seller Dashboard.
            </p>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="w-full mt-7 bg-[#073B35] text-white font-black py-4 rounded-2xl"
            >
              Complete Profile
            </button>
          </div>
        </main>
      </>
    );
  }

  if (!sellerProfileComplete) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <section className="nefo-neo-white p-5 sm:p-8">
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                Seller Setup
              </p>
              <h1 className="text-3xl sm:text-5xl font-black mt-3 text-[#073B35] leading-tight">
                Complete your kitchen profile
              </h1>

              {message && (
                <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35]">
                  {message}
                </div>
              )}

              <form onSubmit={saveSellerSetup} className="mt-6 space-y-4">
                <input
                  name="seller_kitchen_name"
                  value={sellerSetupData.seller_kitchen_name}
                  onChange={handleSellerSetupChange}
                  required
                  className="nefo-neo-input"
                  placeholder="Kitchen name"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    name="flat"
                    value={sellerSetupData.flat}
                    onChange={handleSellerSetupChange}
                    required
                    className="nefo-neo-input"
                    placeholder="Tower / Flat"
                  />

                  <input
                    name="phone"
                    value={sellerSetupData.phone}
                    onChange={handleSellerSetupChange}
                    required
                    className="nefo-neo-input"
                    placeholder="Phone Number"
                  />
                </div>

                <input
                  name="seller_specialty"
                  value={sellerSetupData.seller_specialty}
                  onChange={handleSellerSetupChange}
                  required
                  className="nefo-neo-input"
                  placeholder="Specialty"
                />

                <textarea
                  name="seller_about"
                  value={sellerSetupData.seller_about}
                  onChange={handleSellerSetupChange}
                  rows="4"
                  required
                  className="w-full nefo-neo-input h-32 py-4 resize-none"
                  placeholder="Tell customers about your kitchen"
                />

                <label className="flex items-start gap-3 nefo-neo-tile p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    name="accept_scheduled_orders"
                    checked={sellerSetupData.accept_scheduled_orders}
                    onChange={handleSellerSetupChange}
                    className="mt-1 accent-[#41D3BD]"
                  />
                  <div>
                    <p className="font-black">Accept scheduled orders</p>
                    <p className="text-[#51615D] text-sm mt-1">
                      Customers can choose date and time.
                    </p>
                  </div>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 nefo-neo-tile p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      name="delivery_available"
                      checked={sellerSetupData.delivery_available}
                      onChange={handleSellerSetupChange}
                      className="mt-1 accent-[#41D3BD]"
                    />
                    <div>
                      <p className="font-black">Delivery available</p>
                      <p className="text-[#51615D] text-sm mt-1">
                        Customers can choose delivery.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 nefo-neo-tile p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      name="pickup_available"
                      checked={sellerSetupData.pickup_available}
                      onChange={handleSellerSetupChange}
                      className="mt-1 accent-[#41D3BD]"
                    />
                    <div>
                      <p className="font-black">Self pickup available</p>
                      <p className="text-[#51615D] text-sm mt-1">
                        Customers can choose pickup.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="nefo-neo-tile p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black">Packing charge</p>
                      <p className="text-[#51615D] text-sm mt-1">
                        Added at checkout.
                      </p>
                    </div>
                    <div className="bg-[#073B35] text-white font-black px-4 py-2 rounded-2xl">
                      ₹{sellerSetupData.packing_charge}
                    </div>
                  </div>

                  <input
                    type="range"
                    name="packing_charge"
                    min="5"
                    max="15"
                    step="1"
                    value={sellerSetupData.packing_charge}
                    onChange={handleSellerSetupChange}
                    className="w-full mt-5 accent-[#41D3BD]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full bg-[#073B35] disabled:opacity-50 text-white font-black py-4 rounded-2xl"
                >
                  {profileSaving ? "Saving..." : "Save and Continue"}
                </button>
              </form>
            </section>
          </div>
        </main>
      </>
    );
  }

  function StatCard({ label, value }) {
    return (
      <div className="nefo-neo-tile p-4">
        <p className="text-[11px] font-bold text-[#51615D]">{label}</p>
        <p className="text-2xl font-black text-[#111827] mt-2">{value}</p>
      </div>
    );
  }

  function MiniSparkline() {
    return (
      <svg viewBox="0 0 260 80" className="w-full h-20 mt-2">
        <path
          d="M4 62 C 28 58, 30 44, 52 50 S 82 64, 104 54 S 132 34, 156 44 S 184 62, 206 38 S 238 32, 256 10"
          fill="none"
          stroke="#41D3BD"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function RecentOrderRow({ order }) {
    const status = getAutoStatus(order);

    return (
      <div className="flex items-center justify-between gap-3 py-3 border-b border-[#E8F4F1] last:border-b-0">
        <div className="min-w-0">
          <p className="text-xs font-black text-[#111827] truncate">
            #{order.id}
          </p>
          <p className="text-[11px] text-[#51615D] truncate">
            {order.customer_name || "Customer"}
          </p>
        </div>

        <p className="text-xs font-black text-[#111827] shrink-0">
          ₹{order.total_amount || order.subtotal_amount || 0}
        </p>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${getStatusPillClass(
            status
          )}`}
        >
          {getStatusLabel(status)}
        </span>
      </div>
    );
  }

  function DashboardView() {
    const recentOrders = sellerOrders.slice(0, 5);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between nefo-neo-tile p-3">
          <p className="text-sm font-black text-[#073B35]">
            {sellerOnline ? "Online" : "Offline"}
          </p>

          <button
            type="button"
            onClick={toggleSellerOnline}
            className={`relative w-14 h-8 rounded-full transition-all ${
              sellerOnline ? "bg-[#41D3BD]" : "bg-[#D7F5EF]"
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${
                sellerOnline ? "right-1" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Today's Orders" value={todayTotalOrders.length} />
          <StatCard label="Pending" value={pendingOrdersCount} />
          <StatCard label="Preparing" value={preparingOrdersCount} />
          <StatCard label="Completed" value={completedOrdersCount} />
        </div>

        <section className="nefo-neo-tile p-4">
          <p className="text-xs font-black text-[#51615D]">
            Today’s Revenue
          </p>
          <h2 className="text-3xl font-black text-[#111827] mt-1">
            ₹{todayEarnings}
          </h2>
          <p className="text-xs font-black text-[#1A9F8D] mt-1">
            +18% vs yesterday
          </p>
          <MiniSparkline />
        </section>

        <section className="nefo-neo-tile p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[#111827]">Recent Orders</h2>
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className="text-xs font-black text-[#1A9F8D]"
            >
              See All
            </button>
          </div>

          <div className="mt-2">
            {ordersLoading ? (
              <p className="text-sm text-[#51615D] py-4">Loading orders...</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-[#51615D] py-4">No orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <RecentOrderRow key={order.id} order={order} />
              ))
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={toggleAcceptScheduledOrders}
            className={`nefo-neo-soft-button py-4 text-sm ${
              acceptScheduledOrders ? "text-[#073B35]" : "opacity-60"
            }`}
          >
            {acceptScheduledOrders ? "🕒 Schedule ON" : "🕒 Schedule OFF"}
          </button>

          <button
            type="button"
            onClick={toggleNotificationSound}
            className={`nefo-neo-soft-button py-4 text-sm ${
              audioReady ? "text-[#073B35]" : "opacity-80"
            }`}
          >
            {audioReady ? "🔔 Sound ON" : "🔕 Sound OFF"}
          </button>
        </section>
      </div>
    );
  }

  function OrdersView() {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-[#111827]">Orders</h2>
          <p className="text-[#51615D] text-sm mt-1">
            Accept, chat, prepare, and complete orders.
          </p>
        </div>

        {ordersLoading ? (
          <div className="nefo-neo-tile p-6 text-[#51615D]">
            Loading orders...
          </div>
        ) : activeSellerOrders.length === 0 ? (
          <div className="nefo-neo-tile p-8 text-center">
            <div className="text-4xl">🛎️</div>
            <p className="font-black text-[#51615D] mt-3">
              No active orders right now.
            </p>
          </div>
        ) : (
          activeSellerOrders.map((order) => {
            const autoStatus = getAutoStatus(order);
            const sellerResponse = normalizeSellerResponse(
              order.seller_response
            );
            const orderIsSelfPickup = isSelfPickup(order);
            const scheduled = isScheduledOrder(order);

            return (
              <article key={order.id} className="nefo-neo-tile p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#51615D] font-bold">
                      Order #{order.id}
                    </p>
                    <h3 className="text-2xl font-black text-[#073B35] mt-1">
                      ₹{order.total_amount}
                    </h3>
                    <p className="text-[#51615D] text-sm mt-2 truncate">
                      {order.customer_name} • {order.phone}
                    </p>
                    <p className="text-[#51615D] text-sm mt-1 truncate">
                      {order.delivery_type} • {order.flat}
                    </p>

                    {scheduled && (
                      <p className="text-[#073B35] text-xs font-black mt-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-full px-3 py-1 w-fit">
                        🕒 {formatScheduledDateTime(order.scheduled_for)}
                      </p>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black ${getStatusPillClass(
                      autoStatus
                    )}`}
                  >
                    {getStatusLabel(autoStatus)}
                  </span>
                </div>

                <Link
                  to={`/order-chat/${order.id}`}
                  className="mt-4 flex items-center justify-between bg-[#EFFFFB] border border-[#41D3BD]/50 rounded-2xl p-4"
                >
                  <div>
                    <p className="font-black text-[#073B35]">
                      Chat with customer
                    </p>
                    <p className="text-xs text-[#51615D] mt-1">
                      Confirm item changes, timing, or pickup.
                    </p>
                  </div>
                  <span className="font-black text-2xl">›</span>
                </Link>

                <div className="mt-4 bg-white/70 border border-[#D7F5EF] rounded-2xl p-3 space-y-3">
                  {getOrderItems(order).map((item) => (
                    <div
                      key={`${order.id}-${item.id}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-black truncate text-sm">
                          {item.name}
                        </p>
                        <p className="text-[#51615D] text-xs">
                          Qty {item.quantity} × ₹{item.price}
                        </p>
                      </div>

                      <p className="text-[#073B35] font-black shrink-0 text-sm">
                        ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                      </p>
                    </div>
                  ))}
                </div>

                {sellerResponse === "pending" && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => acceptOrder(order.id)}
                      className="bg-green-500 text-white font-black py-3 rounded-2xl"
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectOrder(order.id)}
                      className="bg-red-500 text-white font-black py-3 rounded-2xl"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {sellerResponse === "accepted" && (
                  <div className="mt-4 space-y-3">
                    {orderIsSelfPickup && !order.ready_for_pickup && (
                      <button
                        type="button"
                        onClick={() => markReadyForPickup(order.id)}
                        className="w-full bg-emerald-500 text-white font-black py-3 rounded-2xl"
                      >
                        📦 Ready for Pickup
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => completeOrder(order.id)}
                      className="w-full bg-[#073B35] text-white font-black py-3 rounded-2xl"
                    >
                      ✅ Complete Order
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    );
  }

  function MenuView() {
    return (
      <section className="space-y-5">
        <form onSubmit={handleSubmit} className="nefo-neo-tile p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-[11px]">
                Menu Builder
              </p>
              <h2 className="text-2xl font-black text-[#073B35] mt-1">
                {editingFood ? "Edit dish" : "Add new dish"}
              </h2>
            </div>

            {editingFood && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-[#51615D] font-black"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 mt-5">
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="nefo-neo-input"
              placeholder="Dish name"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                min="1"
                className="nefo-neo-input"
                placeholder="Price ₹"
              />

              <input
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                type="number"
                min="0"
                className="nefo-neo-input"
                placeholder="Qty"
              />
            </div>

            <input
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="nefo-neo-input"
              placeholder="Ready time e.g. 7:30 PM"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="nefo-neo-input"
              >
                {FOOD_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="nefo-neo-input"
              >
                <option>Veg</option>
                <option>Non-Veg</option>
              </select>
            </div>

            <input
              name="seller"
              value={formData.seller}
              onChange={handleChange}
              className="nefo-neo-input"
              placeholder="Kitchen name"
            />

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full nefo-neo-input h-28 py-4 resize-none"
              placeholder="Short description / ingredients"
            />

            <div>
              <p className="text-sm text-[#51615D] font-bold mb-3">
                Dish Image
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => uploadImageInputRef.current?.click()}
                  className="nefo-neo-soft-button py-5 text-sm"
                >
                  🖼️ Upload
                </button>

                <button
                  type="button"
                  onClick={() => cameraImageInputRef.current?.click()}
                  className="nefo-neo-soft-button py-5 text-sm"
                >
                  📸 Camera
                </button>
              </div>

              <input
                ref={uploadImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <input
                ref={cameraImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />

              {imagePreview && (
                <div className="mt-4 nefo-neo-inset p-3">
                  <img
                    src={imagePreview}
                    alt="Dish preview"
                    className="w-full h-48 object-cover rounded-2xl border border-[#D7F5EF]"
                  />

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => uploadImageInputRef.current?.click()}
                      className="border border-[#41D3BD]/60 text-[#073B35] font-black py-3 rounded-2xl"
                    >
                      Change
                    </button>

                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      className="border border-red-300 text-red-500 font-black py-3 rounded-2xl"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-[#073B35] disabled:opacity-50 text-white font-black px-6 py-4 rounded-2xl"
          >
            {loading ? "Saving..." : editingFood ? "Update Dish" : "Add Dish"}
          </button>
        </form>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-[11px]">
                Live Menu
              </p>
              <h2 className="text-2xl font-black mt-1">Your dishes</h2>
            </div>

            <div className="nefo-neo-chip">{sellerFoods.length} dishes</div>
          </div>

          {foodsLoading ? (
            <p className="text-[#51615D]">Loading your dishes...</p>
          ) : sellerFoods.length === 0 ? (
            <div className="nefo-neo-tile p-8 text-center">
              <p className="text-[#51615D]">No dishes added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sellerFoods.map((food) => (
                <div key={food.id} className="nefo-neo-tile overflow-hidden">
                  <div className="relative aspect-[4/3] bg-[#D7F5EF]">
                    <img
                      src={food.image}
                      alt={food.name}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute top-3 left-3">
                      <span
                        className={`text-[11px] font-black px-3 py-1.5 rounded-full shadow-sm ${
                          food.type === "Non-Veg"
                            ? "bg-red-500 text-white"
                            : "bg-[#41D3BD] text-[#073B35]"
                        }`}
                      >
                        {food.type || "Veg"}
                      </span>
                    </div>

                    {Number(food.stock) === 0 && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                        <span className="bg-white text-[#073B35] font-black px-4 py-2 rounded-2xl">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-black truncate">
                          {food.name}
                        </h3>
                        <p className="text-[#51615D] text-sm mt-1 truncate">
                          {food.category || "Meals"} • {food.time || "Soon"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[#073B35] font-black text-xl">
                          ₹{food.price}
                        </p>
                        <p
                          className={`text-xs font-black ${
                            Number(food.stock) <= 2
                              ? "text-red-500"
                              : Number(food.stock) <= 5
                              ? "text-orange-500"
                              : "text-[#51615D]"
                          }`}
                        >
                          {Number(food.stock) <= 2
                            ? `Only ${food.stock} left`
                            : `${food.stock} left`}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => startEdit(food)}
                        className="bg-[#073B35] text-white font-black py-2.5 rounded-xl text-xs"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStock(food)}
                        className="border border-[#41D3BD]/60 text-[#073B35] font-black py-2.5 rounded-xl text-xs"
                      >
                        {Number(food.stock) === 0 ? "In Stock" : "Sold Out"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteDish(food.id)}
                        className="border border-red-300 text-red-500 font-black py-2.5 rounded-xl text-xs"
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
      </section>
    );
  }

  function MoreView() {
    return (
      <section className="space-y-4">
        <section className="nefo-neo-tile p-4">
          <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-[11px]">
            Settings
          </p>
          <h2 className="text-2xl font-black mt-1">Kitchen controls</h2>

          <div className="grid grid-cols-1 gap-3 mt-5">
            <button
              type="button"
              onClick={toggleDeliveryAvailable}
              className="nefo-neo-soft-button py-4"
            >
              {deliveryAvailable ? "🚚 Delivery ON" : "🚚 Delivery OFF"}
            </button>

            <button
              type="button"
              onClick={togglePickupAvailable}
              className="nefo-neo-soft-button py-4"
            >
              {pickupAvailable ? "🛍️ Pickup ON" : "🛍️ Pickup OFF"}
            </button>

            <button
              type="button"
              onClick={toggleAcceptScheduledOrders}
              className="nefo-neo-soft-button py-4"
            >
              {acceptScheduledOrders ? "🕒 Schedule ON" : "🕒 Schedule OFF"}
            </button>
          </div>
        </section>

        <section className="nefo-neo-tile p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-black">Packing charge</p>
              <p className="text-[#51615D] text-sm mt-1">
                Choose ₹5 to ₹15.
              </p>
            </div>

            <div className="bg-[#073B35] text-white font-black text-xl px-5 py-2.5 rounded-2xl">
              ₹{packingCharge}
            </div>
          </div>

          <input
            type="range"
            min="5"
            max="15"
            step="1"
            value={packingCharge}
            onChange={(event) => {
              const nextCharge = Number(event.target.value);
              setPackingCharge(nextCharge);
              setSellerSetupData((currentData) => ({
                ...currentData,
                packing_charge: nextCharge,
              }));
            }}
            onMouseUp={(event) => updatePackingCharge(event.target.value)}
            onTouchEnd={(event) => updatePackingCharge(event.target.value)}
            className="w-full mt-5 accent-[#41D3BD]"
          />
        </section>

        <section className="nefo-neo-tile p-4">
          <p className="font-black">Seller Analytics</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <StatCard label="Gross" value={`₹${grossEarnings}`} />
            <StatCard label="Avg Order" value={`₹${averageOrderValue}`} />
            <StatCard label="Active Dishes" value={activeDishesCount} />
            <StatCard label="Total Orders" value={totalOrdersCount} />
          </div>
        </section>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 py-4 pb-24">
      <div className="max-w-md mx-auto">
        <header className="flex items-center justify-between pt-2 pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#111827]">
              Seller Dashboard
            </h1>
            <p className="text-xs text-[#51615D] font-bold mt-1">
              {sellerSetupData.seller_kitchen_name || "Kitchen"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleNotificationSound}
              className="w-10 h-10 rounded-2xl nefo-neo-soft-button flex items-center justify-center"
            >
              🔔
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="w-11 h-11 rounded-full bg-[#41D3BD] text-[#073B35] font-black flex items-center justify-center shadow-lg shadow-[#073B35]/10"
            >
              {user?.email?.charAt(0)?.toUpperCase() || "S"}
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-4 rounded-2xl border border-[#D7F5EF] bg-white/80 p-3 text-xs font-bold text-[#073B35]">
            {message}
          </div>
        )}

        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "menu" && <MenuView />}
        {activeTab === "orders" && <OrdersView />}
        {activeTab === "more" && <MoreView />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF] px-4 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {[
            ["dashboard", "🏠", "Dashboard"],
            ["menu", "🍽️", "Menu"],
            ["orders", "📋", "Orders"],
            ["more", "☷", "More"],
          ].map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-2xl py-2 text-[11px] font-black ${
                activeTab === key ? "text-[#073B35]" : "text-[#51615D]"
              }`}
            >
              <div className="text-lg leading-none">{icon}</div>
              <div className="mt-1">{label}</div>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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

  const audioContextRef = useRef(null);
  const previousOrderIdsRef = useRef([]);
  const uploadImageInputRef = useRef(null);
  const cameraImageInputRef = useRef(null);

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
  });

  const [sellerProfileComplete, setSellerProfileComplete] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const [sellerFoods, setSellerFoods] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerOnline, setSellerOnline] = useState(true);
  const [acceptScheduledOrders, setAcceptScheduledOrders] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);
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
        "role, is_seller, seller_online, accept_scheduled_orders, delivery_available, pickup_available, seller_kitchen_name, flat, phone, seller_specialty, seller_about"
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

    setSellerOnline(data?.seller_online !== false);
    setAcceptScheduledOrders(data?.accept_scheduled_orders !== false);
    setDeliveryAvailable(data?.delivery_available !== false);
    setPickupAvailable(data?.pickup_available !== false);

    const setupData = {
      seller_kitchen_name: data?.seller_kitchen_name || "",
      flat: data?.flat || "",
      phone: data?.phone || "",
      seller_specialty: data?.seller_specialty || "",
      seller_about: data?.seller_about || "",
      accept_scheduled_orders: data?.accept_scheduled_orders !== false,
      delivery_available: data?.delivery_available !== false,
      pickup_available: data?.pickup_available !== false,
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
      [name]: type === "checkbox" ? checked : value,
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
      return "bg-red-50 text-red-600 border-red-200";
    }

    if (currentStatus === "completed") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (currentStatus === "ready_for_pickup") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (currentStatus === "packing") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (currentStatus === "cooking") {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }

    if (currentStatus === "accepted") {
      return "bg-[#41D3BD]/12 text-[#073B35] border-[#41D3BD]/30";
    }

    return "bg-purple-50 text-purple-700 border-purple-200";
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
  const soldOrdersCount = completedOrders.length;
  const activeDishesCount = sellerFoods.filter(
    (food) => Number(food.stock) > 0
  ).length;

  if (!user) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-10 flex items-center justify-center">
          <div className="max-w-md w-full bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-xl shadow-[#073B35]/5">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-4xl">
              👨‍🍳
            </div>

            <h1 className="text-3xl font-black mt-6">Seller login required</h1>

            <p className="text-[#51615D] mt-4">
              Please sign in before adding or managing food dishes.
            </p>

            <Link
              to="/seller-login"
              className="block mt-7 bg-[#073B35] hover:bg-[#0B5149] text-white font-black py-4 rounded-2xl"
            >
              Seller Sign In
            </Link>

            <Link
              to="/"
              className="block mt-3 border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] font-bold py-3 rounded-2xl transition-all"
            >
              Back to Home
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

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-10 flex items-center justify-center">
          <div className="max-w-md w-full bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-8 text-center shadow-xl shadow-[#073B35]/5">
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

  if (!sellerProfileComplete) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 sm:py-10">
          <div className="max-w-3xl mx-auto">
            <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-[#073B35]/10">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>👨‍🍳</span>
                  <span>Seller Setup</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  Complete your
                  <span className="block text-[#111827]">kitchen profile</span>
                </h1>

                <p className="text-[#51615D] mt-5 leading-relaxed">
                  Complete this once before managing dishes and accepting
                  orders. Your exact flat is used operationally and should not
                  be shown publicly to customers.
                </p>

                {message && (
                  <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35]">
                    {message}
                  </div>
                )}

                <form onSubmit={saveSellerSetup} className="mt-7 space-y-4">
                  <input
                    name="seller_kitchen_name"
                    value={sellerSetupData.seller_kitchen_name}
                    onChange={handleSellerSetupChange}
                    required
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                    placeholder="Kitchen name e.g. Asha's Kitchen"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      name="flat"
                      value={sellerSetupData.flat}
                      onChange={handleSellerSetupChange}
                      required
                      className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                      placeholder="Tower / Flat e.g. B-1204"
                    />

                    <input
                      name="phone"
                      value={sellerSetupData.phone}
                      onChange={handleSellerSetupChange}
                      required
                      className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                      placeholder="Phone Number"
                    />
                  </div>

                  <input
                    name="seller_specialty"
                    value={sellerSetupData.seller_specialty}
                    onChange={handleSellerSetupChange}
                    required
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD]"
                    placeholder="Specialty e.g. South Indian breakfast, sweets, tiffin"
                  />

                  <textarea
                    name="seller_about"
                    value={sellerSetupData.seller_about}
                    onChange={handleSellerSetupChange}
                    rows="5"
                    required
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] placeholder:text-[#9AA7A3] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] resize-none"
                    placeholder="Tell customers about your food, cooking style, hygiene, or food story..."
                  />

                  <label className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      name="accept_scheduled_orders"
                      checked={sellerSetupData.accept_scheduled_orders}
                      onChange={handleSellerSetupChange}
                      className="mt-1 accent-[#41D3BD]"
                    />

                    <div>
                      <p className="text-[#111827] font-black">
                        Accept scheduled orders
                      </p>
                      <p className="text-[#51615D] text-sm mt-1">
                        Customers can choose date and time for later orders.
                      </p>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        name="delivery_available"
                        checked={sellerSetupData.delivery_available}
                        onChange={(event) => {
                          const checked = event.target.checked;

                          if (!checked && !sellerSetupData.pickup_available) {
                            setMessage(
                              "At least one option must stay ON: Delivery or Self Pickup."
                            );
                            return;
                          }

                          handleSellerSetupChange(event);
                        }}
                        className="mt-1 accent-[#41D3BD]"
                      />

                      <div>
                        <p className="text-[#111827] font-black">
                          Delivery available
                        </p>
                        <p className="text-[#51615D] text-sm mt-1">
                          Customers can choose doorstep delivery.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        name="pickup_available"
                        checked={sellerSetupData.pickup_available}
                        onChange={(event) => {
                          const checked = event.target.checked;

                          if (!checked && !sellerSetupData.delivery_available) {
                            setMessage(
                              "At least one option must stay ON: Delivery or Self Pickup."
                            );
                            return;
                          }

                          handleSellerSetupChange(event);
                        }}
                        className="mt-1 accent-[#41D3BD]"
                      />

                      <div>
                        <p className="text-[#111827] font-black">
                          Self pickup available
                        </p>
                        <p className="text-[#51615D] text-sm mt-1">
                          Customers can choose self pickup.
                        </p>
                      </div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="w-full bg-[#073B35] hover:bg-[#0B5149] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15"
                  >
                    {profileSaving ? "Saving..." : "Save and Continue"}
                  </button>
                </form>
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-24">
        <div className="max-w-7xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>👨‍🍳</span>
                  <span>Nefo Kitchen Panel</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  Manage your
                  <span className="block text-[#111827]">food drops</span>
                </h1>

                <p className="text-[#51615D] mt-4 text-sm sm:text-lg max-w-2xl">
                  {sellerOnline
                    ? "Your kitchen is online and visible for orders."
                    : "Your kitchen is offline. Customers should not place new orders."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={toggleSellerOnline}
                  className={`active:scale-95 font-black px-5 py-3 rounded-2xl text-center transition-all shadow-lg ${
                    sellerOnline
                      ? "bg-green-500 text-white shadow-green-500/20"
                      : "bg-red-500 text-white shadow-red-500/20"
                  }`}
                >
                  {sellerOnline ? "🟢 Online" : "🔴 Offline"}
                </button>

                <button
                  type="button"
                  onClick={toggleAcceptScheduledOrders}
                  className={`active:scale-95 font-black px-5 py-3 rounded-2xl text-center transition-all ${
                    acceptScheduledOrders
                      ? "bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15"
                      : "bg-white text-[#51615D] border border-[#D7F5EF]"
                  }`}
                >
                  {acceptScheduledOrders ? "🕒 Schedule ON" : "🕒 Schedule OFF"}
                </button>

                <button
                  type="button"
                  onClick={toggleDeliveryAvailable}
                  className={`active:scale-95 font-black px-5 py-3 rounded-2xl text-center transition-all ${
                    deliveryAvailable
                      ? "bg-[#41D3BD] text-[#073B35] shadow-lg shadow-[#41D3BD]/20"
                      : "bg-white text-[#51615D] border border-[#D7F5EF]"
                  }`}
                >
                  {deliveryAvailable ? "🚚 Delivery ON" : "🚚 Delivery OFF"}
                </button>

                <button
                  type="button"
                  onClick={togglePickupAvailable}
                  className={`active:scale-95 font-black px-5 py-3 rounded-2xl text-center transition-all ${
                    pickupAvailable
                      ? "bg-[#41D3BD] text-[#073B35] shadow-lg shadow-[#41D3BD]/20"
                      : "bg-white text-[#51615D] border border-[#D7F5EF]"
                  }`}
                >
                  {pickupAvailable ? "🛍️ Pickup ON" : "🛍️ Pickup OFF"}
                </button>

                <button
                  type="button"
                  onClick={toggleNotificationSound}
                  className={`active:scale-95 font-black px-5 py-3 rounded-2xl text-center transition-all ${
                    audioReady
                      ? "bg-green-500 text-white"
                      : "bg-white text-[#073B35] border border-[#41D3BD]/40"
                  }`}
                >
                  {audioReady ? "🔕 Sound Off" : "🔔 Sound On"}
                </button>

                <Link
                  to="/marketplace"
                  className="bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-95 text-[#073B35] font-black px-5 py-3 rounded-2xl text-center transition-all"
                >
                  Marketplace
                </Link>
              </div>
            </div>
          </section>

          {message && (
            <div className="mt-5 bg-white/90 border border-[#D7F5EF] rounded-2xl p-4 text-sm font-bold text-[#073B35] shadow-sm">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 mt-8">
            {[
              ["Total Orders", totalOrdersCount],
              ["Today’s Orders", todayTotalOrders.length],
              ["Active Orders", activeOrdersCount],
              ["Sold Orders", soldOrdersCount],
              ["Active Dishes", activeDishesCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-4 sm:p-5 shadow-lg shadow-[#073B35]/5"
              >
                <p className="text-[#51615D] text-xs sm:text-sm font-bold">
                  {label}
                </p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#073B35] mt-3">
                  {value}
                </h2>
              </div>
            ))}
          </section>

          <section className="mt-8 grid lg:grid-cols-[1fr_0.9fr] gap-6">
            <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
              <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                Incoming Orders
              </p>

              <h2 className="text-2xl sm:text-3xl font-black mt-1">
                Active order panel
              </h2>

              {ordersLoading ? (
                <p className="text-[#51615D] mt-6">Loading seller orders...</p>
              ) : activeSellerOrders.length === 0 ? (
                <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-8 text-center">
                  <div className="text-5xl">🛎️</div>
                  <p className="text-[#51615D] font-black mt-4">
                    No active orders right now.
                  </p>
                  <p className="text-[#9AA7A3] text-sm mt-2">
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
                        className="relative bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4 sm:p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <p className="text-[#51615D] text-sm font-bold">
                              Order #{order.id}
                            </p>

                            <h3 className="text-3xl font-black mt-1 text-[#073B35]">
                              ₹{order.total_amount}
                            </h3>

                            <p className="text-[#51615D] text-sm mt-2">
                              {order.customer_name} • {order.phone}
                            </p>

                            <p className="text-[#51615D] text-sm mt-1">
                              {order.delivery_type} • {order.flat}
                            </p>

                            {scheduled && (
                              <p className="text-[#073B35] text-xs font-black mt-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-full px-3 py-1 w-fit">
                                🕒 {formatScheduledDateTime(order.scheduled_for)}
                              </p>
                            )}
                          </div>

                          <span
                            className={`w-fit border text-xs font-black px-3 py-1.5 rounded-full ${getStatusBadgeClass(
                              autoStatus
                            )}`}
                          >
                            {getStatusLabel(autoStatus)}
                          </span>
                        </div>

                        <div className="mt-4 bg-white/90 border border-[#D7F5EF] rounded-2xl p-4 space-y-3">
                          {getOrderItems(order).map((item) => (
                            <div
                              key={`${order.id}-${item.id}`}
                              className="flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0">
                                <p className="font-black truncate">
                                  {item.name}
                                </p>
                                <p className="text-[#51615D] text-sm">
                                  Qty {item.quantity} × ₹{item.price}
                                </p>
                              </div>

                              <p className="text-[#073B35] font-black shrink-0">
                                ₹
                                {Number(item.price || 0) *
                                  Number(item.quantity || 0)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {sellerResponse === "pending" && (
                          <div className="grid grid-cols-2 gap-3 mt-5">
                            <button
                              type="button"
                              onClick={() => acceptOrder(order.id)}
                              className="bg-green-500 hover:bg-green-400 active:scale-95 text-white font-black py-3 rounded-2xl transition-all"
                            >
                              Accept
                            </button>

                            <button
                              type="button"
                              onClick={() => rejectOrder(order.id)}
                              className="bg-red-500 hover:bg-red-400 active:scale-95 text-white font-black py-3 rounded-2xl transition-all"
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
                              className="mt-5 w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-black py-3 rounded-2xl transition-all"
                            >
                              Mark Ready for Pickup
                            </button>
                          )}

                        {sellerResponse === "accepted" && (
                          <button
                            type="button"
                            onClick={() => completeOrder(order.id)}
                            className="mt-5 w-full bg-[#073B35] hover:bg-[#0B5149] active:scale-95 text-white font-black py-3 rounded-2xl transition-all"
                          >
                            Complete Order
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <section className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Earnings
                </p>

                <h2 className="text-2xl sm:text-3xl font-black mt-1">
                  Seller analytics
                </h2>

                <p className="text-[#51615D] text-sm mt-2">
                  Calculated from completed orders only.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  {[
                    ["Today", `₹${todayEarnings}`],
                    ["Gross", `₹${grossEarnings}`],
                    ["Completed", completedOrders.length],
                    ["Avg Order", `₹${averageOrderValue}`],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4"
                    >
                      <p className="text-[#51615D] text-xs font-bold">
                        {label}
                      </p>
                      <h3 className="text-2xl font-black text-[#073B35] mt-2">
                        {value}
                      </h3>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Best Sellers
                </p>

                <h2 className="text-2xl font-black mt-1">Top dishes</h2>

                {bestSellingItems.length === 0 ? (
                  <p className="text-[#51615D] text-sm mt-5">
                    Completed order data will appear here.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {bestSellingItems.map((item) => (
                      <div
                        key={item.name}
                        className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-black truncate">{item.name}</p>
                          <p className="text-[#51615D] text-sm">
                            {item.quantity} sold
                          </p>
                        </div>

                        <p className="text-[#073B35] font-black">
                          ₹{item.revenue}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>

          <section className="mt-8 grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
            <form
              onSubmit={handleSubmit}
              className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5 h-fit"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Menu Builder
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#073B35] mt-1">
                    {editingFood ? "Edit dish" : "Add new dish"}
                  </h2>
                </div>

                {editingFood && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-[#51615D] hover:text-[#073B35] font-black"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 mt-6">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD]"
                  placeholder="Dish name"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    type="number"
                    min="1"
                    className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD]"
                    placeholder="Price ₹"
                  />

                  <input
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    type="number"
                    min="0"
                    className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD]"
                    placeholder="Qty"
                  />
                </div>

                <input
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD]"
                  placeholder="Ready time e.g. 7:30 PM"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD]"
                  >
                    {FOOD_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>

                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD]"
                  >
                    <option>Veg</option>
                    <option>Non-Veg</option>
                  </select>
                </div>

                <input
                  name="seller"
                  value={formData.seller}
                  onChange={handleChange}
                  className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD]"
                  placeholder="Kitchen name"
                />

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] resize-none"
                  placeholder="Short description / ingredients / hygiene note"
                />

                <div>
                  <p className="text-sm text-[#51615D] font-bold mb-3">
                    Dish Image
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => uploadImageInputRef.current?.click()}
                      className="flex flex-col items-center justify-center border-2 border-dashed border-[#D7F5EF] hover:border-[#41D3BD] bg-[#FFFFF2] rounded-3xl p-5 cursor-pointer transition-all"
                    >
                      <div className="text-3xl mb-2">🖼️</div>
                      <p className="text-[#111827] font-black text-sm">
                        Upload
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraImageInputRef.current?.click()}
                      className="flex flex-col items-center justify-center border-2 border-dashed border-[#41D3BD]/50 hover:border-[#41D3BD] bg-[#41D3BD]/10 rounded-3xl p-5 cursor-pointer transition-all"
                    >
                      <div className="text-3xl mb-2">📸</div>
                      <p className="text-[#073B35] font-black text-sm">
                        Camera
                      </p>
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
                    <div className="mt-4 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-3">
                      <img
                        src={imagePreview}
                        alt="Dish preview"
                        className="w-full h-56 object-cover rounded-2xl border border-[#D7F5EF]"
                      />

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <button
                          type="button"
                          onClick={() => uploadImageInputRef.current?.click()}
                          className="border border-[#41D3BD]/60 text-[#073B35] hover:bg-[#41D3BD] font-black py-3 rounded-2xl transition-all"
                        >
                          Change
                        </button>

                        <button
                          type="button"
                          onClick={removeSelectedImage}
                          className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white font-black py-3 rounded-2xl transition-all"
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
                className="mt-5 w-full bg-[#073B35] hover:bg-[#0B5149] disabled:opacity-50 text-white font-black px-6 py-4 rounded-2xl shadow-lg shadow-[#073B35]/15"
              >
                {loading ? "Saving..." : editingFood ? "Update Dish" : "Add Dish"}
              </button>
            </form>

            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Live Menu
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black mt-1">
                    Your dishes
                  </h2>
                </div>

                <div className="bg-white/90 border border-[#D7F5EF] px-4 py-2 rounded-2xl text-sm font-bold text-[#51615D]">
                  {sellerFoods.length} dishes
                </div>
              </div>

              {foodsLoading ? (
                <p className="text-[#51615D]">Loading your dishes...</p>
              ) : sellerFoods.length === 0 ? (
                <div className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-8 text-center">
                  <p className="text-[#51615D]">No dishes added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {sellerFoods.map((food) => (
                    <div
                      key={food.id}
                      className="bg-white/90 border border-[#D7F5EF] rounded-3xl overflow-hidden hover:border-[#41D3BD]/70 transition-all shadow-lg shadow-[#073B35]/5"
                    >
                      <div className="relative aspect-[4/3] bg-[#D7F5EF]">
                        <img
                          src={food.image}
                          alt={food.name}
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute top-3 left-3">
                          <span
                            className={`text-xs font-black px-3 py-1.5 rounded-full shadow-sm ${
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

                      <div className="p-5">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-xl font-black truncate">
                              {food.name}
                            </h3>
                            <p className="text-[#51615D] text-sm mt-1 truncate">
                              {food.category || "Meals"} • {food.time || "Soon"}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[#073B35] font-black text-2xl">
                              ₹{food.price}
                            </p>

                            <p
                              className={`text-sm font-black ${
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

                        <div className="grid grid-cols-3 gap-2 mt-5">
                          <button
                            type="button"
                            onClick={() => startEdit(food)}
                            className="bg-[#073B35] hover:bg-[#0B5149] text-white font-black py-2.5 rounded-xl"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStock(food)}
                            className="border border-[#41D3BD]/60 text-[#073B35] hover:bg-[#41D3BD] font-black py-2.5 rounded-xl"
                          >
                            {Number(food.stock) === 0 ? "In Stock" : "Sold Out"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteDish(food.id)}
                            className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white font-black py-2.5 rounded-xl"
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
        </div>
      </main>
    </>
  );
}
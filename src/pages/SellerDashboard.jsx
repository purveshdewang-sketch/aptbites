import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#E8F4F1] bg-white/90 shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] px-4 py-4 text-base font-semibold text-[#111827] outline-none placeholder:text-[#8AA5A0] focus:border-[#41D3BD] focus:bg-white";

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
      <main className="flex min-h-screen items-center justify-center bg-[#FFFFF2] px-4 py-10 text-[#111827]">
        <div className={`w-full max-w-md p-7 text-center ${CARD}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#41D3BD]/12 text-3xl">
            👨‍🍳
          </div>

          <h1 className="mt-5 text-2xl font-black">Seller login required</h1>

          <p className="mt-3 text-[#51615D]">
            Please sign in before managing food dishes.
          </p>

          <Link
            to="/seller-login"
            className="mt-6 block rounded-2xl bg-[#073B35] py-4 font-black text-white"
          >
            Seller Sign In
          </Link>
        </div>
      </main>
    );
  }

  if (profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFFF2] px-4 py-10 text-[#111827]">
        <div className={`w-full max-w-md p-8 text-center ${CARD}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#41D3BD]/12 text-3xl">
            👨‍🍳
          </div>

          <p className="mt-4 font-bold text-[#51615D]">
            Loading kitchen profile...
          </p>
        </div>
      </main>
    );
  }

  if (!bankDetailsCompleted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFFF2] px-4 py-10 text-[#111827]">
        <div className={`w-full max-w-md p-7 text-center ${CARD}`}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 text-4xl">
            🏦
          </div>

          <h1 className="mt-6 text-3xl font-black">Complete bank details</h1>

          <p className="mt-3 leading-relaxed text-[#51615D]">
            Payout bank details are required before opening Seller Dashboard.
          </p>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="mt-7 w-full rounded-2xl bg-[#073B35] py-4 font-black text-white"
          >
            Complete Profile
          </button>
        </div>
      </main>
    );
  }

  if (!sellerProfileComplete) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-6 pb-28 text-[#111827]">
        <div className="mx-auto max-w-md">
          <section className={`p-5 ${CARD}`}>
            <p className="text-xs font-black uppercase tracking-wide text-[#1A9F8D]">
              Seller Setup
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight text-[#073B35]">
              Complete your kitchen profile
            </h1>

            {message ? <MessageBox message={message} /> : null}

            <form onSubmit={saveSellerSetup} className="mt-6 space-y-4">
              <Field label="Kitchen name">
                <input
                  name="seller_kitchen_name"
                  value={sellerSetupData.seller_kitchen_name}
                  onChange={handleSellerSetupChange}
                  required
                  className={INPUT}
                  placeholder="Kitchen name"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4">
                <Field label="Tower / Flat">
                  <input
                    name="flat"
                    value={sellerSetupData.flat}
                    onChange={handleSellerSetupChange}
                    required
                    className={INPUT}
                    placeholder="Tower / Flat"
                  />
                </Field>

                <Field label="Phone number">
                  <input
                    name="phone"
                    value={sellerSetupData.phone}
                    onChange={handleSellerSetupChange}
                    required
                    className={INPUT}
                    placeholder="Phone Number"
                  />
                </Field>
              </div>

              <Field label="Specialty">
                <input
                  name="seller_specialty"
                  value={sellerSetupData.seller_specialty}
                  onChange={handleSellerSetupChange}
                  required
                  className={INPUT}
                  placeholder="Specialty"
                />
              </Field>

              <Field label="About kitchen">
                <textarea
                  name="seller_about"
                  value={sellerSetupData.seller_about}
                  onChange={handleSellerSetupChange}
                  rows="4"
                  required
                  className={`${INPUT} min-h-32 resize-none`}
                  placeholder="Tell customers about your kitchen"
                />
              </Field>

              <CheckTile
                title="Accept scheduled orders"
                text="Customers can choose date and time."
                name="accept_scheduled_orders"
                checked={sellerSetupData.accept_scheduled_orders}
                onChange={handleSellerSetupChange}
              />

              <CheckTile
                title="Delivery available"
                text="Customers can choose delivery."
                name="delivery_available"
                checked={sellerSetupData.delivery_available}
                onChange={handleSellerSetupChange}
              />

              <CheckTile
                title="Self pickup available"
                text="Customers can choose pickup."
                name="pickup_available"
                checked={sellerSetupData.pickup_available}
                onChange={handleSellerSetupChange}
              />

              <div className={`p-4 ${SOFT_CARD}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black">Packing charge</p>
                    <p className="mt-1 text-sm text-[#51615D]">
                      Added at checkout.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#073B35] px-4 py-2 font-black text-white">
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
                  className="mt-5 w-full accent-[#41D3BD]"
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full rounded-2xl bg-[#073B35] py-4 font-black text-white disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save and Continue"}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  function MiniSparkline() {
    return (
      <svg viewBox="0 0 260 80" className="mt-3 h-24 w-full">
        <path
          d="M4 62 C 28 58, 30 44, 52 50 S 82 64, 104 54 S 132 34, 156 44 S 184 62, 206 38 S 238 32, 256 10"
          fill="none"
          stroke="#41D3BD"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  function RecentOrderRow({ order }) {
    const status = getAutoStatus(order);

    return (
      <div className="flex items-center justify-between gap-3 border-b border-[#E8F4F1] py-3 last:border-b-0">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-[#111827]">
            #{order.id}
          </p>
          <p className="truncate text-[11px] text-[#51615D]">
            {order.customer_name || "Customer"}
          </p>
        </div>

        <p className="shrink-0 text-xs font-black text-[#111827]">
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
        <div className={`p-4 ${CARD}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-black text-[#073B35]">
                {sellerOnline ? "Online" : "Offline"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#51615D]">
                Customers can {sellerOnline ? "order now" : "not order now"}.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleSellerOnline}
              className={`relative h-9 w-16 rounded-full transition-all ${
                sellerOnline ? "bg-[#41D3BD]" : "bg-[#D7F5EF]"
              }`}
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-md transition-all ${
                  sellerOnline ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Today's Orders" value={todayTotalOrders.length} />
          <StatCard label="Pending" value={pendingOrdersCount} />
          <StatCard label="Preparing" value={preparingOrdersCount} />
          <StatCard label="Completed" value={completedOrdersCount} />
        </div>

        <section className={`p-5 ${CARD}`}>
          <p className="text-sm font-black text-[#51615D]">Today’s Revenue</p>

          <h2 className="mt-2 text-4xl font-black text-[#111827]">
            ₹{todayEarnings}
          </h2>

          <p className="mt-2 text-sm font-black text-[#1A9F8D]">
            +18% vs yesterday
          </p>

          <MiniSparkline />
        </section>

        <section className={`p-4 ${CARD}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#111827]">
              Recent Orders
            </h2>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className="text-sm font-black text-[#1A9F8D]"
            >
              See All
            </button>
          </div>

          <div className="mt-2">
            {ordersLoading ? (
              <p className="py-4 text-sm text-[#51615D]">Loading orders...</p>
            ) : recentOrders.length === 0 ? (
              <p className="py-4 text-sm text-[#51615D]">No orders yet.</p>
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
            className={`rounded-[22px] border border-[#E8F4F1] bg-white/90 py-4 text-sm font-black shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] ${
              acceptScheduledOrders ? "text-[#073B35]" : "text-[#8AA5A0]"
            }`}
          >
            {acceptScheduledOrders ? "🕒 Schedule ON" : "🕒 Schedule OFF"}
          </button>

          <button
            type="button"
            onClick={toggleNotificationSound}
            className={`rounded-[22px] border border-[#E8F4F1] bg-white/90 py-4 text-sm font-black shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] ${
              audioReady ? "text-[#073B35]" : "text-[#8AA5A0]"
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
        <div className={`p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#1A9F8D]">
            Kitchen Orders
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#111827]">Orders</h2>
          <p className="mt-1 text-sm text-[#51615D]">
            Accept, chat, prepare, and complete orders.
          </p>
        </div>

        {ordersLoading ? (
          <div className={`p-6 text-[#51615D] ${SOFT_CARD}`}>
            Loading orders...
          </div>
        ) : activeSellerOrders.length === 0 ? (
          <div className={`p-8 text-center ${SOFT_CARD}`}>
            <div className="text-4xl">🛎️</div>
            <p className="mt-3 font-black text-[#51615D]">
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
              <article key={order.id} className={`p-4 ${CARD}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#51615D]">
                      Order #{order.id}
                    </p>

                    <h3 className="mt-1 text-2xl font-black text-[#073B35]">
                      ₹{order.total_amount}
                    </h3>

                    <p className="mt-2 truncate text-sm text-[#51615D]">
                      {order.customer_name} • {order.phone}
                    </p>

                    <p className="mt-1 truncate text-sm text-[#51615D]">
                      {order.delivery_type} • {order.flat}
                    </p>

                    {scheduled ? (
                      <p className="mt-2 w-fit rounded-full border border-[#41D3BD]/25 bg-[#41D3BD]/12 px-3 py-1 text-xs font-black text-[#073B35]">
                        🕒 {formatScheduledDateTime(order.scheduled_for)}
                      </p>
                    ) : null}
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
                  className="mt-4 flex items-center justify-between rounded-2xl border border-[#41D3BD]/50 bg-[#EFFFFB] p-4"
                >
                  <div>
                    <p className="font-black text-[#073B35]">
                      Chat with customer
                    </p>
                    <p className="mt-1 text-xs text-[#51615D]">
                      Confirm item changes, timing, or pickup.
                    </p>
                  </div>
                  <span className="text-2xl font-black">›</span>
                </Link>

                <div className="mt-4 space-y-3 rounded-2xl border border-[#D7F5EF] bg-[#FFFFF2] p-3">
                  {getOrderItems(order).map((item) => (
                    <div
                      key={`${order.id}-${item.id || item.name}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#51615D]">
                          Qty {item.quantity} × ₹{item.price}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-black text-[#073B35]">
                        ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                      </p>
                    </div>
                  ))}
                </div>

                {sellerResponse === "pending" ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => acceptOrder(order.id)}
                      className="rounded-2xl bg-green-500 py-3 font-black text-white"
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectOrder(order.id)}
                      className="rounded-2xl bg-red-500 py-3 font-black text-white"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}

                {sellerResponse === "accepted" ? (
                  <div className="mt-4 space-y-3">
                    {orderIsSelfPickup && !order.ready_for_pickup ? (
                      <button
                        type="button"
                        onClick={() => markReadyForPickup(order.id)}
                        className="w-full rounded-2xl bg-emerald-500 py-3 font-black text-white"
                      >
                        📦 Ready for Pickup
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => completeOrder(order.id)}
                      className="w-full rounded-2xl bg-[#073B35] py-3 font-black text-white"
                    >
                      ✅ Complete Order
                    </button>
                  </div>
                ) : null}
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
        <form onSubmit={handleSubmit} className={`p-5 ${CARD}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#1A9F8D]">
                Menu Builder
              </p>

              <h2 className="mt-1 text-3xl font-black leading-tight text-[#073B35]">
                {editingFood ? "Edit dish" : "Add new dish"}
              </h2>

              <p className="mt-2 text-sm font-semibold text-[#51615D]">
                Add clear dish details so customers can order confidently.
              </p>
            </div>

            {editingFood ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full bg-[#FFFFF2] px-4 py-2 text-xs font-black text-[#51615D]"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Dish name">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={INPUT}
                placeholder="Dish name"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price">
                <input
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  type="number"
                  min="1"
                  className={INPUT}
                  placeholder="₹"
                />
              </Field>

              <Field label="Qty">
                <input
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  type="number"
                  min="0"
                  className={INPUT}
                  placeholder="Qty"
                />
              </Field>
            </div>

            <Field label="Ready time">
              <input
                name="time"
                value={formData.time}
                onChange={handleChange}
                className={INPUT}
                placeholder="Ready time e.g. 7:30 PM"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={INPUT}
                >
                  {FOOD_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Food type">
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={INPUT}
                >
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                </select>
              </Field>
            </div>

            <Field label="Kitchen name">
              <input
                name="seller"
                value={formData.seller}
                onChange={handleChange}
                className={INPUT}
                placeholder="Kitchen name"
              />
            </Field>

            <Field label="Short description / ingredients">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className={`${INPUT} min-h-32 resize-none`}
                placeholder="Short description / ingredients"
              />
            </Field>

            <div className={`p-4 ${SOFT_CARD}`}>
              <p className="text-sm font-black text-[#111827]">Dish Image</p>

              <p className="mt-1 text-xs font-semibold text-[#51615D]">
                Upload a clear food image. Camera works better on phone.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => uploadImageInputRef.current?.click()}
                  className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-sm font-black text-[#073B35] active:scale-95"
                >
                  🖼️ Upload
                </button>

                <button
                  type="button"
                  onClick={() => cameraImageInputRef.current?.click()}
                  className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-sm font-black text-[#073B35] active:scale-95"
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

              {imagePreview ? (
                <div className="mt-4 rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-3">
                  <img
                    src={imagePreview}
                    alt="Dish preview"
                    className="h-48 w-full rounded-2xl border border-[#D7F5EF] object-cover"
                  />

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => uploadImageInputRef.current?.click()}
                      className="rounded-2xl border border-[#41D3BD]/60 py-3 font-black text-[#073B35]"
                    >
                      Change
                    </button>

                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      className="rounded-2xl border border-red-300 py-3 font-black text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-[#073B35] px-6 py-4 font-black text-white shadow-lg shadow-[#073B35]/15 disabled:opacity-50"
          >
            {loading ? "Saving..." : editingFood ? "Update Dish" : "Add Dish"}
          </button>
        </form>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#1A9F8D]">
                Live Menu
              </p>
              <h2 className="mt-1 text-3xl font-black">Your dishes</h2>
            </div>

            <div className="rounded-full border border-[#E8F4F1] bg-white/90 px-4 py-2 text-sm font-black text-[#073B35]">
              {sellerFoods.length} dishes
            </div>
          </div>

          {foodsLoading ? (
            <p className="text-[#51615D]">Loading your dishes...</p>
          ) : sellerFoods.length === 0 ? (
            <div className={`p-8 text-center ${SOFT_CARD}`}>
              <p className="text-[#51615D]">No dishes added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sellerFoods.map((food) => (
                <div key={food.id} className={`overflow-hidden ${CARD}`}>
                  <div className="relative aspect-[4/3] bg-[#D7F5EF]">
                    <img
                      src={food.image}
                      alt={food.name}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full px-3 py-1.5 text-[11px] font-black shadow-sm ${
                          food.type === "Non-Veg"
                            ? "bg-red-500 text-white"
                            : "bg-[#41D3BD] text-[#073B35]"
                        }`}
                      >
                        {food.type || "Veg"}
                      </span>
                    </div>

                    {Number(food.stock) === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/65">
                        <span className="rounded-2xl bg-white px-4 py-2 font-black text-[#073B35]">
                          Sold Out
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black">
                          {food.name}
                        </h3>

                        <p className="mt-1 truncate text-sm text-[#51615D]">
                          {food.category || "Meals"} • {food.time || "Soon"}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xl font-black text-[#073B35]">
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

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(food)}
                        className="rounded-xl bg-[#073B35] py-2.5 text-xs font-black text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStock(food)}
                        className="rounded-xl border border-[#41D3BD]/60 py-2.5 text-xs font-black text-[#073B35]"
                      >
                        {Number(food.stock) === 0 ? "In Stock" : "Sold Out"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteDish(food.id)}
                        className="rounded-xl border border-red-300 py-2.5 text-xs font-black text-red-500"
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
        <section className={`p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#1A9F8D]">
            Settings
          </p>

          <h2 className="mt-1 text-2xl font-black">Kitchen controls</h2>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={toggleDeliveryAvailable}
              className="rounded-2xl border border-[#E8F4F1] bg-[#FFFFF2] py-4 font-black text-[#073B35]"
            >
              {deliveryAvailable ? "🚚 Delivery ON" : "🚚 Delivery OFF"}
            </button>

            <button
              type="button"
              onClick={togglePickupAvailable}
              className="rounded-2xl border border-[#E8F4F1] bg-[#FFFFF2] py-4 font-black text-[#073B35]"
            >
              {pickupAvailable ? "🛍️ Pickup ON" : "🛍️ Pickup OFF"}
            </button>

            <button
              type="button"
              onClick={toggleAcceptScheduledOrders}
              className="rounded-2xl border border-[#E8F4F1] bg-[#FFFFF2] py-4 font-black text-[#073B35]"
            >
              {acceptScheduledOrders ? "🕒 Schedule ON" : "🕒 Schedule OFF"}
            </button>
          </div>
        </section>

        <section className={`p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-black">Packing charge</p>
              <p className="mt-1 text-sm text-[#51615D]">Choose ₹5 to ₹15.</p>
            </div>

            <div className="rounded-2xl bg-[#073B35] px-5 py-2.5 text-xl font-black text-white">
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
            className="mt-5 w-full accent-[#41D3BD]"
          />
        </section>

        <section className={`p-5 ${CARD}`}>
          <p className="font-black">Seller Analytics</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Gross" value={`₹${grossEarnings}`} />
            <StatCard label="Avg Order" value={`₹${averageOrderValue}`} />
            <StatCard label="Active Dishes" value={activeDishesCount} />
            <StatCard label="Total Orders" value={totalOrdersCount} />
          </div>
        </section>

        {bestSellingItems.length > 0 ? (
          <section className={`p-5 ${CARD}`}>
            <p className="font-black">Best selling items</p>

            <div className="mt-4 space-y-3">
              {bestSellingItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-2xl border border-[#E8F4F1] bg-[#FFFFF2] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#111827]">
                      {item.name}
                    </p>
                    <p className="text-xs text-[#51615D]">
                      Qty sold: {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 font-black text-[#073B35]">
                    ₹{item.revenue}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] px-4 py-4 pb-32 text-[#111827]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between pb-5 pt-2">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black leading-tight text-[#111827]">
              Seller Dashboard
            </h1>

            <p className="mt-1 truncate text-sm font-bold text-[#51615D]">
              {sellerSetupData.seller_kitchen_name || "Kitchen"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleNotificationSound}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8F4F1] bg-white/90 text-lg shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]"
            >
              🔔
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#41D3BD] text-lg font-black text-[#073B35] shadow-lg shadow-[#073B35]/10"
            >
              {user?.email?.charAt(0)?.toUpperCase() || "S"}
            </button>
          </div>
        </header>

        {message ? <MessageBox message={message} /> : null}

        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "menu" && <MenuView />}
        {activeTab === "orders" && <OrdersView />}
        {activeTab === "more" && <MoreView />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D7F5EF] bg-[#FFFFF2]/95 px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
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
              className={`rounded-2xl py-2 text-[11px] font-black transition-all ${
                activeTab === key
                  ? "bg-[#D7F5EF] text-[#073B35]"
                  : "text-[#51615D]"
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-[#51615D]">
        {label}
      </span>
      {children}
    </label>
  );
}

function CheckTile({ title, text, name, checked, onChange }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 p-4 ${SOFT_CARD}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 accent-[#41D3BD]"
      />

      <div>
        <p className="font-black text-[#111827]">{title}</p>
        <p className="mt-1 text-sm text-[#51615D]">{text}</p>
      </div>
    </label>
  );
}

function MessageBox({ message }) {
  return (
    <div className="mb-4 rounded-2xl border border-[#D7F5EF] bg-white/90 p-3 text-xs font-bold text-[#073B35] shadow-sm">
      {message}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className={`p-4 ${SOFT_CARD}`}>
      <p className="text-[11px] font-black text-[#51615D]">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#111827]">{value}</p>
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
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
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-base font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

const UNLIMITED_STOCK = 999999;
const SELLER_NAME_STORAGE_PREFIX = "NeFo_seller_name";
const LEGACY_SELLER_NAME_STORAGE_PREFIX = "Nefo_seller_name";
const MESSAGE_SEEN_STORAGE_PREFIX = "NeFo_seller_messages_seen";

function createChannelName(prefix, userId) {
  const uniquePart =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${userId}-${uniquePart}`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getMessageText(messageRow) {
  return (
    messageRow?.message ||
    messageRow?.content ||
    messageRow?.text ||
    "New message"
  );
}

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

  const [dishErrors, setDishErrors] = useState({});

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

  const [setupErrors, setSetupErrors] = useState({});
  const [sellerApproved, setSellerApproved] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sellerProfileComplete, setSellerProfileComplete] = useState(false);
  const [bankDetailsCompleted, setBankDetailsCompleted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const [sellerFoods, setSellerFoods] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerChats, setSellerChats] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

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
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return undefined;

    const savedSellerName =
      localStorage.getItem(`${SELLER_NAME_STORAGE_PREFIX}_${user.id}`) ||
      localStorage.getItem(`${LEGACY_SELLER_NAME_STORAGE_PREFIX}_${user.id}`);

    if (savedSellerName) {
      setFormData((currentData) => ({
        ...currentData,
        seller: savedSellerName,
      }));
    }

    fetchSellerProfile();
    fetchSellerFoods();
    fetchSellerOrders();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    function unlockRequiredSound() {
      initialiseRequiredSound();

      window.removeEventListener("pointerdown", unlockRequiredSound);
      window.removeEventListener("touchstart", unlockRequiredSound);
      window.removeEventListener("keydown", unlockRequiredSound);
    }

    window.addEventListener("pointerdown", unlockRequiredSound, {
      passive: true,
    });
    window.addEventListener("touchstart", unlockRequiredSound, {
      passive: true,
    });
    window.addEventListener("keydown", unlockRequiredSound);

    const orderChannel = supabase
      .channel(createChannelName("NeFo-seller-orders", user.id))
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

    const messageChannel = supabase
      .channel(createChannelName("NeFo-seller-order-messages", user.id))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
        },
        (payload) => {
          const incomingMessage = payload?.new;

          if (!incomingMessage || incomingMessage.sender_id === user.id) {
            return;
          }

          const belongsToSeller = sellerOrders.some(
            (order) => String(order.id) === String(incomingMessage.order_id)
          );

          if (!belongsToSeller && sellerOrders.length > 0) {
            return;
          }

          fetchSellerChats();
          playTingSound();
          setMessage("💬 New customer message received.");

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("💬 New NeFo customer message", {
              body: getMessageText(incomingMessage),
              icon: "/Nefo-logo.png",
            });
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("pointerdown", unlockRequiredSound);
      window.removeEventListener("touchstart", unlockRequiredSound);
      window.removeEventListener("keydown", unlockRequiredSound);

      void supabase.removeChannel(orderChannel);
      void supabase.removeChannel(messageChannel);
    };
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimerTick((current) => current + 1);
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const interval = window.setInterval(() => {
      fetchSellerOrders(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user || sellerOrders.length === 0) {
      if (sellerOrders.length === 0) {
        setSellerChats([]);
        setUnreadMessageCount(0);
        setMessagesLoading(false);
      }
      return;
    }

    fetchSellerChats();
  }, [sellerOrders, user]);

  useEffect(() => {
    if (!user || activeTab !== "messages") return;

    localStorage.setItem(
      `${MESSAGE_SEEN_STORAGE_PREFIX}_${user.id}`,
      new Date().toISOString()
    );

    setUnreadMessageCount(0);
  }, [activeTab, user]);

  function getSellerStorageKey() {
    return user
      ? `${SELLER_NAME_STORAGE_PREFIX}_${user.id}`
      : SELLER_NAME_STORAGE_PREFIX;
  }

  function getSafePackingCharge(value) {
    return Math.min(15, Math.max(5, Number(value || 5)));
  }

  function isSellerSetupComplete(profile) {
    return Boolean(
      profile?.seller_kitchen_name?.trim() &&
        profile?.flat?.trim() &&
        profile?.phone?.trim() &&
        profile?.seller_specialty?.trim() &&
        profile?.seller_about?.trim()
    );
  }

  function initialiseRequiredSound() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
  }

  function playTingSound() {
    try {
      initialiseRequiredSound();

      const audioContext = audioContextRef.current;

      if (!audioContext) return;

      const playSequence = () => {
        const now = audioContext.currentTime;

        [0, 0.1, 0.2].forEach((delay, index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const frequencies = [1400, 1600, 1800];

          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(
            frequencies[index],
            now + delay
          );

          gain.gain.setValueAtTime(0.0001, now + delay);
          gain.gain.exponentialRampToValueAtTime(
            0.25,
            now + delay + 0.01
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + delay + 0.08
          );

          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(now + delay);
          oscillator.stop(now + delay + 0.08);
        });
      };

      if (audioContext.state === "suspended") {
        audioContext.resume().then(playSequence).catch(() => {});
      } else {
        playSequence();
      }
    } catch {
      // Browsers may block audio until the first seller interaction.
    }
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

    const profileRole = normalizeText(data?.role);
    const approved =
      data?.is_seller === true ||
      profileRole === "seller" ||
      profileRole === "admin";

    setSellerApproved(approved);
    setIsAdmin(profileRole === "admin");

    if (!approved) {
      setSellerProfileComplete(false);
      setProfileLoading(false);
      return;
    }

    const safePackingCharge = getSafePackingCharge(data?.packing_charge || 5);
    const bankComplete =
      profileRole === "admin" || data?.bank_details_completed === true;

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
        `${SELLER_NAME_STORAGE_PREFIX}_${user.id}`,
        setupData.seller_kitchen_name
      );

      setFormData((currentData) => ({
        ...currentData,
        seller: setupData.seller_kitchen_name,
      }));
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

    setSetupErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
      services: "",
    }));
  }

  function validateSellerSetup() {
    const nextErrors = {};

    if (!sellerSetupData.seller_kitchen_name.trim()) {
      nextErrors.seller_kitchen_name = "Please fill in this box.";
    }

    if (!sellerSetupData.flat.trim()) {
      nextErrors.flat = "Please fill in this box.";
    }

    if (!sellerSetupData.phone.trim()) {
      nextErrors.phone = "Please fill in this box.";
    }

    if (!sellerSetupData.seller_specialty.trim()) {
      nextErrors.seller_specialty = "Please fill in this box.";
    }

    if (!sellerSetupData.seller_about.trim()) {
      nextErrors.seller_about = "Please fill in this box.";
    }

    if (
      sellerSetupData.delivery_available === false &&
      sellerSetupData.pickup_available === false
    ) {
      nextErrors.services =
        "Keep at least one option active: Delivery or Self Pickup.";
    }

    setSetupErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveSellerSetup(event) {
    event.preventDefault();

    if (!user || !validateSellerSetup()) return;

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

    localStorage.setItem(`NeFo_seller_access_${user.id}`, "yes");
    localStorage.setItem(
      `${SELLER_NAME_STORAGE_PREFIX}_${user.id}`,
      sellerSetupData.seller_kitchen_name.trim()
    );

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

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setDishErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
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

    return date.toLocaleString("en-IN", {
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
          document.title = "🔔 New Order - NeFo";

          window.setTimeout(() => {
            document.title = "NeFo Seller";
          }, 5000);

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🍔 New NeFo Order", {
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

  async function fetchSellerChats() {
    if (!user) return;

    const orderIds = sellerOrders.map((order) => order.id).filter(Boolean);

    if (orderIds.length === 0) {
      setSellerChats([]);
      setUnreadMessageCount(0);
      setMessagesLoading(false);
      return;
    }

    setMessagesLoading(true);

    const { data, error } = await supabase
      .from("order_messages")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (error) {
      setSellerChats([]);
      setMessagesLoading(false);
      return;
    }

    const rows = data || [];
    setSellerChats(rows);

    const lastSeenValue = localStorage.getItem(
      `${MESSAGE_SEEN_STORAGE_PREFIX}_${user.id}`
    );
    const lastSeenTime = lastSeenValue ? new Date(lastSeenValue).getTime() : 0;

    const unreadCount = rows.filter((row) => {
      if (row.sender_id === user.id) return false;

      const createdTime = row.created_at
        ? new Date(row.created_at).getTime()
        : 0;

      return createdTime > lastSeenTime;
    }).length;

    setUnreadMessageCount(activeTab === "messages" ? 0 : unreadCount);
    setMessagesLoading(false);
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setDishErrors((currentErrors) => ({
        ...currentErrors,
        image: "Please upload a JPG, PNG, or WEBP image.",
      }));
      return;
    }

    try {
      setMessage("Compressing image...");
      const compressedFile = await compressImage(file);

      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
      setDishErrors((currentErrors) => ({
        ...currentErrors,
        image: "",
      }));
      setMessage(
        `Image optimized (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`
      );
    } catch {
      setDishErrors((currentErrors) => ({
        ...currentErrors,
        image: "Could not process this image.",
      }));
    }
  }

  function removeSelectedImage() {
    setImageFile(null);
    setImagePreview(editingFood?.image || "");

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

        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }

            resolve(
              new File([blob], `${Date.now()}-NeFo.jpg`, {
                type: "image/jpeg",
              })
            );
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

    const fileExtension = imageFile.name.split(".").pop() || "jpg";
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
      category: "Meals",
      description: "",
    });

    setDishErrors({});
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
      seller: food.seller || sellerSetupData.seller_kitchen_name || "",
      time: food.time || "",
      stock:
        Number(food.stock) >= UNLIMITED_STOCK ? "" : String(food.stock ?? ""),
      type: food.type || "Veg",
      category: food.category || "Meals",
      description: food.description || "",
    });

    setDishErrors({});
    setImageFile(null);
    setImagePreview(food.image || "");
    setActiveTab("menu");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validateDishForm() {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Please fill in this box.";
    }

    if (!String(formData.price).trim()) {
      nextErrors.price = "Please fill in this box.";
    } else if (Number(formData.price) <= 0) {
      nextErrors.price = "Please enter a valid price.";
    }

    if (!formData.seller.trim()) {
      nextErrors.seller = "Please fill in this box.";
    }

    if (!formData.time.trim()) {
      nextErrors.time = "Please fill in this box.";
    }

    if (String(formData.stock).trim() && Number(formData.stock) < 0) {
      nextErrors.stock = "Quantity cannot be below zero.";
    }

    if (!editingFood && !imageFile) {
      nextErrors.image = "Please upload a dish image.";
    }

    setDishErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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

    if (!validateDishForm()) return;

    localStorage.setItem(getSellerStorageKey(), formData.seller.trim());
    setLoading(true);
    setMessage("");

    try {
      const imageUrl = await uploadDishImage();
      const optionalStock = String(formData.stock).trim();

      const payload = {
        user_id: user.id,
        name: formData.name.trim(),
        price: Number(formData.price),
        seller: formData.seller.trim(),
        time: formData.time.trim(),
        stock: optionalStock ? Number(optionalStock) : UNLIMITED_STOCK,
        type: formData.type,
        category: formData.category,
        description: formData.description.trim(),
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
    return normalizeText(status || "confirmed");
  }

  function normalizeSellerResponse(response) {
    return normalizeText(response || "pending");
  }

  function isSelfPickup(order) {
    return normalizeText(order.delivery_type).includes("pickup");
  }

  function getAutoStatus(order) {
    void timerTick;

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
      return "bg-green-50 text-green-700 border border-green-200";
    }

    if (currentStatus === "cancelled") {
      return "bg-red-50 text-red-600 border border-red-200";
    }

    if (currentStatus === "pending") {
      return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    }

    return "bg-[#FFF0DF] text-[#3F5128] border border-[#D8C9B3]";
  }

  const activeSellerOrders = useMemo(() => {
    return sellerOrders.filter((order) => {
      const dbStatus = normalizeStatus(order.status);
      const autoStatus = normalizeStatus(getAutoStatus(order));
      const sellerResponse = normalizeSellerResponse(order.seller_response);

      if (dbStatus === "cancelled") return false;
      if (sellerResponse === "rejected") return false;
      if (autoStatus === "completed") return false;

      return true;
    });
  }, [sellerOrders, timerTick]);

  const completedOrders = useMemo(() => {
    return sellerOrders.filter((order) => {
      const dbStatus = normalizeStatus(order.status);
      const sellerResponse = normalizeSellerResponse(order.seller_response);

      return dbStatus === "completed" && sellerResponse !== "rejected";
    });
  }, [sellerOrders]);

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
    return (
      total +
      Number(order.seller_amount || order.subtotal_amount || order.total_amount || 0)
    );
  }, 0);

  const todayEarnings = todayCompletedOrders.reduce((total, order) => {
    return (
      total +
      Number(order.seller_amount || order.subtotal_amount || order.total_amount || 0)
    );
  }, 0);

  const averageOrderValue =
    completedOrders.length > 0
      ? Math.round(grossEarnings / completedOrders.length)
      : 0;

  const itemSalesMap = {};

  completedOrders.forEach((order) => {
    getOrderItems(order).forEach((item) => {
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
    .sort((first, second) => second.quantity - first.quantity)
    .slice(0, 5);

  const activeDishesCount = sellerFoods.filter(
    (food) => Number(food.stock) > 0
  ).length;

  const chatSummaries = useMemo(() => {
    const messageMap = new Map();

    sellerChats.forEach((chatMessage) => {
      const orderId = String(chatMessage.order_id || "");
      if (!orderId) return;

      if (!messageMap.has(orderId)) {
        messageMap.set(orderId, []);
      }

      messageMap.get(orderId).push(chatMessage);
    });

    return sellerOrders
      .map((order) => {
        const messages = messageMap.get(String(order.id)) || [];
        const lastMessage = messages[messages.length - 1] || null;

        return {
          order,
          messages,
          lastMessage,
        };
      })
      .filter((summary) => summary.messages.length > 0)
      .sort((first, second) => {
        const firstTime = first.lastMessage?.created_at
          ? new Date(first.lastMessage.created_at).getTime()
          : 0;
        const secondTime = second.lastMessage?.created_at
          ? new Date(second.lastMessage.created_at).getTime()
          : 0;

        return secondTime - firstTime;
      });
  }, [sellerChats, sellerOrders]);

  function SellerSetupView() {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-6 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <section className={`p-5 ${CARD}`}>
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Seller setup
            </p>

            <h1 className="mt-2 text-3xl font-black leading-tight text-[#3F5128]">
              Complete your kitchen profile
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              These details are shown to customers and used for order delivery.
            </p>

            <form onSubmit={saveSellerSetup} className="mt-6 space-y-5">
              <Field
                label="Kitchen name"
                error={setupErrors.seller_kitchen_name}
                required
              >
                <input
                  name="seller_kitchen_name"
                  value={sellerSetupData.seller_kitchen_name}
                  onChange={handleSellerSetupChange}
                  className={INPUT}
                  placeholder="Kitchen name"
                />
              </Field>

              <Field label="Flat / door number" error={setupErrors.flat} required>
                <input
                  name="flat"
                  value={sellerSetupData.flat}
                  onChange={handleSellerSetupChange}
                  className={INPUT}
                  placeholder="Flat or door number"
                />
              </Field>

              <Field label="Phone number" error={setupErrors.phone} required>
                <input
                  name="phone"
                  value={sellerSetupData.phone}
                  onChange={handleSellerSetupChange}
                  inputMode="tel"
                  className={INPUT}
                  placeholder="Phone number"
                />
              </Field>

              <Field
                label="Food specialty"
                error={setupErrors.seller_specialty}
                required
              >
                <input
                  name="seller_specialty"
                  value={sellerSetupData.seller_specialty}
                  onChange={handleSellerSetupChange}
                  className={INPUT}
                  placeholder="Example: Dosa, North Indian, Bakery"
                />
              </Field>

              <Field
                label="About your kitchen"
                error={setupErrors.seller_about}
                required
              >
                <textarea
                  name="seller_about"
                  value={sellerSetupData.seller_about}
                  onChange={handleSellerSetupChange}
                  rows="4"
                  className={`${INPUT} resize-none`}
                  placeholder="Tell customers about your kitchen"
                />
              </Field>

              {setupErrors.services ? (
                <p className="text-xs font-black text-red-600">
                  {setupErrors.services}
                </p>
              ) : null}

              <div className="space-y-3">
                <CheckTile
                  title="Delivery"
                  text="Deliver orders to customers"
                  name="delivery_available"
                  checked={sellerSetupData.delivery_available}
                  onChange={handleSellerSetupChange}
                />

                <CheckTile
                  title="Self pickup"
                  text="Allow customers to collect orders"
                  name="pickup_available"
                  checked={sellerSetupData.pickup_available}
                  onChange={handleSellerSetupChange}
                />

                <CheckTile
                  title="Scheduled orders"
                  text="Accept future date and time orders"
                  name="accept_scheduled_orders"
                  checked={sellerSetupData.accept_scheduled_orders}
                  onChange={handleSellerSetupChange}
                />
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save Kitchen Profile"}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  function DashboardView() {
    return (
      <section className="space-y-5">
        <section className="relative overflow-hidden rounded-[28px] border border-[#4D612F] bg-[#3F5128] p-5 text-white shadow-lg shadow-[#3F5128]/15">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                Kitchen status
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {sellerOnline ? "Open for orders" : "Kitchen is offline"}
              </h2>

              <p className="mt-2 text-sm font-semibold text-white/75">
                Order and customer-message alerts always play sound.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleSellerOnline}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black active:scale-95 ${
                sellerOnline
                  ? "border-green-300/30 bg-green-400/15 text-green-100"
                  : "border-white/20 bg-white/10 text-white"
              }`}
            >
              {sellerOnline ? "Online" : "Offline"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <StatCard label="Today" value={todayTotalOrders.length} />
          <StatCard label="Active" value={activeSellerOrders.length} />
          <StatCard label="Earnings" value={`₹${formatMoney(todayEarnings)}`} strong />
        </section>

        <section className={`p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Quick actions
              </p>
              <h2 className="mt-1 text-xl font-black text-[#181411]">
                Manage your kitchen
              </h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickAction
              icon="🍽️"
              label="Add dish"
              onClick={() => setActiveTab("menu")}
            />
            <QuickAction
              icon="📋"
              label="View orders"
              onClick={() => setActiveTab("orders")}
            />
            <QuickAction
              icon="💬"
              label="Customer chats"
              badge={unreadMessageCount}
              onClick={() => setActiveTab("messages")}
            />
            <QuickAction
              icon="⚙️"
              label="Kitchen settings"
              onClick={() => setActiveTab("more")}
            />
          </div>
        </section>

        <section className={`p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Active orders
              </p>
              <h2 className="mt-1 text-xl font-black text-[#181411]">
                Needs your attention
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className="rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-2 text-xs font-black text-[#3F5128]"
            >
              View all
            </button>
          </div>

          {ordersLoading ? (
            <p className="mt-4 text-sm font-semibold text-[#6B6258]">
              Loading orders...
            </p>
          ) : activeSellerOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#EADFCE] bg-[#FFFDF7] p-5 text-center">
              <div className="text-3xl">🛎️</div>
              <p className="mt-2 text-sm font-black text-[#6B6258]">
                No active orders right now.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {activeSellerOrders.slice(0, 3).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setActiveTab("orders")}
                  className="flex w-full items-center justify-between rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#181411]">
                      {order.customer_name || "Customer"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                      Order #{String(order.id).slice(0, 8)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-black ${getStatusPillClass(
                      getAutoStatus(order)
                    )}`}
                  >
                    {getStatusLabel(getAutoStatus(order))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>
    );
  }

  function MenuView() {
    return (
      <section className="space-y-5">
        <form onSubmit={handleSubmit} className={`p-5 ${CARD}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Menu builder
              </p>

              <h2 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
                {editingFood ? "Edit dish" : "Add new dish"}
              </h2>

              <p className="mt-2 text-sm font-semibold text-[#6B6258]">
                Quantity is optional. Leave it blank when you do not want a fixed limit.
              </p>
            </div>

            {editingFood ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-2 text-xs font-black text-[#6B6258]"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Dish name" error={dishErrors.name} required>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={INPUT}
                placeholder="Dish name"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price" error={dishErrors.price} required>
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

              <Field
                label="Quantity"
                error={dishErrors.stock}
                helper="Optional"
              >
                <input
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  type="number"
                  min="0"
                  className={INPUT}
                  placeholder="No fixed limit"
                />
              </Field>
            </div>

            <Field label="Ready time" error={dishErrors.time} required>
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

            <Field label="Kitchen name" error={dishErrors.seller} required>
              <input
                name="seller"
                value={formData.seller}
                onChange={handleChange}
                className={INPUT}
                placeholder="Kitchen name"
              />
            </Field>

            <Field label="Description" helper="Optional">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className={`${INPUT} resize-none`}
                placeholder="Describe the dish"
              />
            </Field>

            <Field label="Dish photo" error={dishErrors.image} required={!editingFood}>
              <input
                ref={uploadImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />

              <input
                ref={cameraImageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => uploadImageInputRef.current?.click()}
                  className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-sm font-black text-[#3F5128]"
                >
                  Upload photo
                </button>

                <button
                  type="button"
                  onClick={() => cameraImageInputRef.current?.click()}
                  className="rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] py-4 text-sm font-black text-[#3F5128]"
                >
                  Use camera
                </button>
              </div>

              {imagePreview ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-[#D8C9B3] bg-white p-3">
                  <img
                    src={imagePreview}
                    alt="Dish preview"
                    className="h-48 w-full rounded-xl object-cover"
                  />

                  <button
                    type="button"
                    onClick={removeSelectedImage}
                    className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-black text-red-600"
                  >
                    Remove photo
                  </button>
                </div>
              ) : null}
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : editingFood
                ? "Update Dish"
                : "Add Dish"}
            </button>
          </div>
        </form>

        <section className={`p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Your menu
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Dishes
              </h2>
            </div>

            <span className="rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-3 py-1.5 text-xs font-black text-[#3F5128]">
              {sellerFoods.length}
            </span>
          </div>

          {foodsLoading ? (
            <p className="mt-4 text-sm font-semibold text-[#6B6258]">
              Loading dishes...
            </p>
          ) : sellerFoods.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#EADFCE] bg-[#FFFDF7] p-6 text-center">
              <div className="text-4xl">🍽️</div>
              <p className="mt-3 font-black text-[#6B6258]">
                No dishes added yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {sellerFoods.map((food) => {
                const unlimited = Number(food.stock) >= UNLIMITED_STOCK;
                const soldOut = Number(food.stock) === 0;

                return (
                  <article
                    key={food.id}
                    className="overflow-hidden rounded-[22px] border border-[#D8C9B3] bg-[#FFFDF7]"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF]">
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl">
                            🍽️
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate font-black text-[#181411]">
                              {food.name}
                            </h3>
                            <p className="mt-1 text-sm font-black text-[#3F5128]">
                              ₹{formatMoney(food.price)}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black ${
                              soldOut
                                ? "border-red-200 bg-red-50 text-red-600"
                                : "border-green-200 bg-green-50 text-green-700"
                            }`}
                          >
                            {soldOut
                              ? "Sold out"
                              : unlimited
                              ? "Unlimited"
                              : `${food.stock} left`}
                          </span>
                        </div>

                        <p className="mt-2 truncate text-xs font-semibold text-[#6B6258]">
                          {food.category || "Meals"} • {food.type || "Veg"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-[#EADFCE] p-3">
                      <button
                        type="button"
                        onClick={() => startEdit(food)}
                        className="rounded-xl border border-[#D8C9B3] bg-white py-2.5 text-xs font-black text-[#3F5128]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleStock(food)}
                        className="rounded-xl border border-[#D8C9B3] bg-[#FFF0DF] py-2.5 text-xs font-black text-[#3F5128]"
                      >
                        {soldOut ? "Restock" : "Sold out"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteDish(food.id)}
                        className="rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-black text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    );
  }

  function OrdersView() {
    return (
      <section className="space-y-4">
        <div className={`p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Kitchen orders
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#181411]">Orders</h2>
          <p className="mt-1 text-sm text-[#6B6258]">
            Accept, chat, prepare, and complete orders.
          </p>
        </div>

        {ordersLoading ? (
          <div className={`p-6 text-[#6B6258] ${SOFT_CARD}`}>
            Loading orders...
          </div>
        ) : activeSellerOrders.length === 0 ? (
          <div className={`p-8 text-center ${SOFT_CARD}`}>
            <div className="text-4xl">🛎️</div>
            <p className="mt-3 font-black text-[#6B6258]">
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
            const items = getOrderItems(order);

            return (
              <article key={order.id} className={`p-4 ${CARD}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#6B6258]">
                      Order #{String(order.id).slice(0, 8)}
                    </p>

                    <h3 className="mt-1 text-2xl font-black text-[#3F5128]">
                      ₹{formatMoney(order.total_amount)}
                    </h3>

                    <p className="mt-2 truncate text-sm text-[#6B6258]">
                      {order.customer_name || "Customer"} • {order.phone || "No phone"}
                    </p>

                    <p className="mt-1 truncate text-sm text-[#6B6258]">
                      {order.delivery_type || "Delivery"} • {order.flat || "Address not available"}
                    </p>

                    {scheduled ? (
                      <p className="mt-2 w-fit rounded-full border border-[#D8C9B3] bg-[#FFF0DF] px-3 py-1 text-xs font-black text-[#3F5128]">
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

                <div className="mt-4 rounded-2xl border border-[#EADFCE] bg-[#FFFDF7] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-[#6B6258]">
                    Items
                  </p>

                  <div className="mt-2 space-y-2">
                    {items.length === 0 ? (
                      <p className="text-sm text-[#6B6258]">No item details.</p>
                    ) : (
                      items.map((item, index) => (
                        <div
                          key={`${item.id || item.name}-${index}`}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <p className="min-w-0 truncate text-[#181411]">
                            {item.name || "Food item"} × {item.quantity || 1}
                          </p>
                          <p className="shrink-0 font-black text-[#3F5128]">
                            ₹{formatMoney(Number(item.price || 0) * Number(item.quantity || 1))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Link
                  to={`/order-chat/${order.id}`}
                  className="mt-4 flex items-center justify-between rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] p-4"
                >
                  <div>
                    <p className="font-black text-[#3F5128]">
                      Chat with customer
                    </p>
                    <p className="mt-1 text-xs text-[#6B6258]">
                      Confirm changes, pickup, or delivery details.
                    </p>
                  </div>
                  <span className="text-xl text-[#3F5128]">›</span>
                </Link>

                <div className="mt-4 space-y-3">
                  {sellerResponse === "pending" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => acceptOrder(order.id)}
                        className="rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 font-black text-white"
                      >
                        Accept
                      </button>

                      <button
                        type="button"
                        onClick={() => rejectOrder(order.id)}
                        className="rounded-2xl border border-red-200 bg-red-50 py-3 font-black text-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}

                  {sellerResponse === "accepted" && orderIsSelfPickup && !order.ready_for_pickup ? (
                    <button
                      type="button"
                      onClick={() => markReadyForPickup(order.id)}
                      className="w-full rounded-2xl border border-[#CF743D] bg-[#FFF0DF] py-3 font-black text-[#3F5128]"
                    >
                      Mark Ready for Pickup
                    </button>
                  ) : null}

                  {sellerResponse === "accepted" ? (
                    <button
                      type="button"
                      onClick={() => completeOrder(order.id)}
                      className="w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 font-black text-white"
                    >
                      Complete Order
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </section>
    );
  }

  function MessagesView() {
    return (
      <section className="space-y-4">
        <div className={`p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Customer messages
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#181411]">
            Chat with customers
          </h2>
          <p className="mt-1 text-sm text-[#6B6258]">
            Open any order conversation and reply directly.
          </p>
        </div>

        {messagesLoading ? (
          <div className={`p-6 text-[#6B6258] ${SOFT_CARD}`}>
            Loading customer chats...
          </div>
        ) : chatSummaries.length === 0 ? (
          <div className={`p-8 text-center ${SOFT_CARD}`}>
            <div className="text-4xl">💬</div>
            <p className="mt-3 font-black text-[#181411]">No messages yet</p>
            <p className="mt-1 text-sm font-semibold text-[#6B6258]">
              Customer conversations will appear here after an order message is sent.
            </p>
          </div>
        ) : (
          chatSummaries.map(({ order, messages, lastMessage }) => (
            <Link
              key={order.id}
              to={`/order-chat/${order.id}`}
              className={`block overflow-hidden ${CARD}`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-lg font-black text-[#3F5128]">
                  {(order.customer_name || "C").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-[#181411]">
                        {order.customer_name || "Customer"}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                        Order #{String(order.id).slice(0, 8)}
                      </p>
                    </div>

                    <span className="rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-2.5 py-1 text-[9px] font-black text-[#3F5128]">
                      {messages.length} {messages.length === 1 ? "message" : "messages"}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-[#6B6258]">
                    {getMessageText(lastMessage)}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold text-[#9A8E80]">
                      {lastMessage?.created_at
                        ? new Date(lastMessage.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>

                    <span className="text-xs font-black text-[#CF743D]">
                      Open chat ›
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    );
  }

  function MoreView() {
    return (
      <section className="space-y-4">
        <section className={`p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Settings
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#181411]">
            Kitchen controls
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={toggleDeliveryAvailable}
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 font-black text-[#3F5128]"
            >
              {deliveryAvailable ? "🚚 Delivery ON" : "🚚 Delivery OFF"}
            </button>

            <button
              type="button"
              onClick={togglePickupAvailable}
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 font-black text-[#3F5128]"
            >
              {pickupAvailable ? "🛍️ Pickup ON" : "🛍️ Pickup OFF"}
            </button>

            <button
              type="button"
              onClick={toggleAcceptScheduledOrders}
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 font-black text-[#3F5128]"
            >
              {acceptScheduledOrders ? "🕒 Schedule ON" : "🕒 Schedule OFF"}
            </button>
          </div>
        </section>

        <section className={`p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-black text-[#181411]">Packing charge</p>
              <p className="mt-1 text-sm text-[#6B6258]">Choose ₹5 to ₹15.</p>
            </div>

            <div className="rounded-2xl bg-[#3F5128] px-5 py-2.5 text-xl font-black text-white">
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
            onMouseUp={(event) => updatePackingCharge(event.currentTarget.value)}
            onTouchEnd={(event) => updatePackingCharge(event.currentTarget.value)}
            className="mt-5 w-full accent-[#CF743D]"
          />
        </section>

        <section className={`p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Performance
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#181411]">Analytics</h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard label="Total orders" value={sellerOrders.length} />
            <StatCard label="Completed" value={completedOrders.length} />
            <StatCard label="Gross earnings" value={`₹${formatMoney(grossEarnings)}`} strong />
            <StatCard label="Average order" value={`₹${formatMoney(averageOrderValue)}`} />
          </div>

          <div className="mt-5">
            <p className="text-sm font-black text-[#181411]">Best-selling dishes</p>

            {bestSellingItems.length === 0 ? (
              <p className="mt-3 text-sm font-semibold text-[#6B6258]">
                Complete orders to see dish performance.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {bestSellingItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl border border-[#EADFCE] bg-[#FFFDF7] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#181411]">
                        {index + 1}. {item.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                        {item.quantity} sold
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-[#3F5128]">
                      ₹{formatMoney(item.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={`p-5 ${CARD}`}>
          <div className="grid grid-cols-1 gap-3">
            <Link
              to="/profile"
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-center font-black text-[#3F5128]"
            >
              Edit Profile & Payout Details
            </Link>

            <Link
              to="/seller-helper"
              className="rounded-2xl border border-[#CF743D] bg-[#FFF0DF] py-4 text-center font-black text-[#3F5128]"
            >
              Open Seller Help
            </Link>
          </div>
        </section>
      </section>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 py-10 text-[#181411]">
        <div className={`w-full max-w-md p-7 text-center ${CARD}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-3xl">
            👨‍🍳
          </div>

          <h1 className="mt-5 text-2xl font-black">Seller login required</h1>

          <p className="mt-3 text-[#6B6258]">
            Please sign in before managing food dishes.
          </p>

          <Link
            to="/seller-login"
            className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white"
          >
            Seller Sign In
          </Link>
        </div>
      </main>
    );
  }

  if (profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 py-10 text-[#181411]">
        <div className={`w-full max-w-md p-8 text-center ${CARD}`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-3xl">
            👨‍🍳
          </div>
          <p className="mt-4 font-bold text-[#6B6258]">
            Loading kitchen profile...
          </p>
        </div>
      </main>
    );
  }

  if (!sellerApproved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 py-10 text-[#181411]">
        <div className={`w-full max-w-md p-7 text-center ${CARD}`}>
          <div className="text-5xl">⏳</div>
          <h1 className="mt-5 text-2xl font-black">Seller approval required</h1>
          <p className="mt-3 text-sm font-semibold text-[#6B6258]">
            This account is not yet approved as a NeFo seller.
          </p>
          <Link
            to="/seller-registration"
            className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white"
          >
            View Seller Application
          </Link>
        </div>
      </main>
    );
  }

  if (!bankDetailsCompleted && !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 py-10 text-[#181411]">
        <div className={`w-full max-w-md p-7 text-center ${CARD}`}>
          <div className="text-5xl">🏦</div>
          <h1 className="mt-5 text-2xl font-black">Complete payout details</h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#6B6258]">
            Add the required bank details in Profile before managing the seller dashboard.
          </p>
          <Link
            to="/profile#seller-bank-details"
            className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white"
          >
            Complete Bank Details
          </Link>
        </div>
      </main>
    );
  }

  if (!sellerProfileComplete) {
    return <SellerSetupView />;
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between pb-5 pt-2">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black leading-tight text-[#181411]">
              Seller Dashboard
            </h1>

            <p className="mt-1 truncate text-sm font-bold text-[#6B6258]">
              {sellerSetupData.seller_kitchen_name || "Kitchen"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#C86B37] bg-[#CF743D] text-lg font-black text-white shadow-lg shadow-[#3F5128]/10"
            aria-label="Open profile"
          >
            {user?.email?.charAt(0)?.toUpperCase() || "S"}
          </button>
        </header>

        {message ? <MessageBox message={message} /> : null}

        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "menu" && <MenuView />}
        {activeTab === "orders" && <OrdersView />}
        {activeTab === "messages" && <MessagesView />}
        {activeTab === "more" && <MoreView />}
      </div>

      <Link
        to="/seller-helper"
        className="fixed bottom-[88px] right-4 z-[960] flex h-14 items-center gap-2 rounded-full border border-[#CF743D] bg-[#CF743D] px-4 text-sm font-black text-white shadow-2xl shadow-[#3F5128]/20 active:scale-95"
        aria-label="Open Seller Help"
      >
        <span className="text-xl">👨‍🍳</span>
        <span>Seller Help</span>
      </Link>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#EADFCE] bg-[#FFF8EC]/95 px-2 py-2 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {[
            ["dashboard", "🏠", "Home"],
            ["menu", "🍽️", "Menu"],
            ["orders", "📋", "Orders"],
            ["messages", "💬", "Chats"],
            ["more", "☷", "More"],
          ].map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`relative rounded-2xl py-2 text-[10px] font-black transition-all ${
                activeTab === key
                  ? "bg-[#FFF0DF] text-[#3F5128]"
                  : "text-[#6B6258]"
              }`}
            >
              <div className="text-lg leading-none">{icon}</div>
              <div className="mt-1">{label}</div>

              {key === "messages" && unreadMessageCount > 0 ? (
                <span className="absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#FFF8EC] bg-red-500 px-1 text-[9px] font-black text-white">
                  {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function Field({ label, error = "", helper = "", required = false, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-[#6B6258]">
        <span>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </span>
        {helper ? (
          <span className="normal-case tracking-normal text-[#9A8E80]">
            {helper}
          </span>
        ) : null}
      </span>

      {error ? (
        <span className="mb-2 block text-xs font-black normal-case text-red-600">
          {error}
        </span>
      ) : null}

      {children}
    </label>
  );
}

function CheckTile({ title, text, name, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4">
      <div>
        <p className="font-black text-[#181411]">{title}</p>
        <p className="mt-1 text-xs font-semibold text-[#6B6258]">{text}</p>
      </div>

      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 accent-[#3F5128]"
      />
    </label>
  );
}

function MessageBox({ message }) {
  const isError = /could not|failed|error|not approved|required/i.test(message);

  return (
    <div
      className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-black ${
        isError
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-green-200 bg-green-50 text-green-700"
      }`}
    >
      {message}
    </div>
  );
}

function StatCard({ label, value, strong = false }) {
  return (
    <div className="rounded-[20px] border border-[#EADFCE] bg-white/95 p-3 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[9px] font-black uppercase tracking-wide text-[#6B6258]">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-black ${
          strong ? "text-[#CF743D]" : "text-[#3F5128]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickAction({ icon, label, onClick, badge = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-left active:scale-[0.98]"
    >
      <div className="text-2xl">{icon}</div>
      <p className="mt-2 text-sm font-black text-[#3F5128]">{label}</p>

      {badge > 0 ? (
        <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}

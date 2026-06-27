import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 8;
const Nefo_UPI_ID = "cropg1agroresearch@sbi";
const Nefo_PAYEE_NAME = "Nefo";

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#E8F4F1] bg-white/90 shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] px-4 py-4 text-base font-semibold text-[#111827] outline-none placeholder:text-[#8AA5A0] focus:border-[#41D3BD] focus:bg-white disabled:cursor-not-allowed disabled:bg-[#EAF7F4] disabled:text-[#51615D]";

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const paymentProofInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    flat: "",
    deliveryType: "Doorstep delivery",
    notes: "",
  });

  const [orderTiming, setOrderTiming] = useState("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [packingRequired, setPackingRequired] = useState(true);

  const [kitchenAcceptsScheduledOrders, setKitchenAcceptsScheduledOrders] =
    useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [packingCharge, setPackingCharge] = useState(5);
  const [checkingKitchenSettings, setCheckingKitchenSettings] = useState(true);

  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

  const subtotalAmount = Number(cartTotal || 0);
  const sellerPackingCharge = getSafePackingCharge(packingCharge);
  const effectivePackingCharge = packingRequired ? sellerPackingCharge : 0;
  const totalAmount = subtotalAmount + effectivePackingCharge + PLATFORM_FEE;
  const paymentMethod = "upi";

  const formattedSchedule = formatScheduledDateTime(
    scheduledDate,
    scheduledTime
  );

  const checkoutBlocked =
    cartItems.length > 0 &&
    !checkingKitchenSettings &&
    !deliveryAvailable &&
    !pickupAvailable;

  const upiPaymentLink = `upi://pay?pa=${encodeURIComponent(
    Nefo_UPI_ID
  )}&pn=${encodeURIComponent(
    Nefo_PAYEE_NAME
  )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent("Nefo food order")}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    upiPaymentLink
  )}`;

  const getCheckoutStorageKey = () =>
    user ? `Nefo_checkout_details_${user.id}` : "Nefo_checkout_details_guest";

  useEffect(() => {
    async function loadSavedCheckoutDetails() {
      const savedDetails = localStorage.getItem(getCheckoutStorageKey());

      if (savedDetails) {
        try {
          const parsedDetails = JSON.parse(savedDetails);

          setFormData((current) => ({
            ...current,
            fullName: parsedDetails.fullName || "",
            flat: parsedDetails.flat || "",
            deliveryType: parsedDetails.deliveryType || "Doorstep delivery",
          }));

          setOrderTiming(parsedDetails.orderTiming || "now");
          setScheduledDate(parsedDetails.scheduledDate || "");
          setScheduledTime(parsedDetails.scheduledTime || "");
          setPaymentReference(parsedDetails.paymentReference || "");
          setPackingRequired(parsedDetails.packingRequired !== false);
        } catch {
          localStorage.removeItem(getCheckoutStorageKey());
        }
      }

      const cartTimingDetails = localStorage.getItem("Nefo_cart_order_timing");

      if (cartTimingDetails) {
        try {
          const parsedTiming = JSON.parse(cartTimingDetails);

          setOrderTiming(parsedTiming.orderTiming || "now");
          setScheduledDate(parsedTiming.scheduledDate || "");
          setScheduledTime(parsedTiming.scheduledTime || "");
        } catch {
          localStorage.removeItem("Nefo_cart_order_timing");
        }
      }

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, flat")
        .eq("id", user.id)
        .maybeSingle();

      const lockedPhone =
        data?.phone || user?.phone || user?.user_metadata?.phone || "";

      setFormData((current) => ({
        ...current,
        fullName:
          current.fullName ||
          data?.full_name ||
          user?.user_metadata?.full_name ||
          "",
        phone: lockedPhone,
        flat: current.flat || data?.flat || user?.user_metadata?.flat || "",
      }));
    }

    loadSavedCheckoutDetails();
  }, [user]);

  useEffect(() => {
    const detailsToSave = {
      fullName: formData.fullName,
      flat: formData.flat,
      deliveryType: formData.deliveryType,
      orderTiming,
      scheduledDate,
      scheduledTime,
      paymentReference,
      packingRequired,
    };

    localStorage.setItem(getCheckoutStorageKey(), JSON.stringify(detailsToSave));
  }, [
    formData.fullName,
    formData.flat,
    formData.deliveryType,
    orderTiming,
    scheduledDate,
    scheduledTime,
    paymentReference,
    packingRequired,
    user,
  ]);

  useEffect(() => {
    async function checkKitchenSettings() {
      const kitchenId = getKitchenIdFromCart();

      if (!kitchenId || kitchenId === "MIXED_KITCHENS") {
        setKitchenAcceptsScheduledOrders(false);
        setDeliveryAvailable(false);
        setPickupAvailable(false);
        setPackingCharge(5);
        setCheckingKitchenSettings(false);

        if (orderTiming === "scheduled") {
          setOrderTiming("now");
          setScheduledDate("");
          setScheduledTime("");
        }

        return;
      }

      setCheckingKitchenSettings(true);

      const settings = await fetchKitchenSettings(kitchenId);

      const nextScheduleAllowed = settings.accept_scheduled_orders === true;
      const nextDeliveryAvailable = settings.delivery_available !== false;
      const nextPickupAvailable = settings.pickup_available !== false;
      const nextPackingCharge = getSafePackingCharge(settings.packing_charge);

      setKitchenAcceptsScheduledOrders(nextScheduleAllowed);
      setDeliveryAvailable(nextDeliveryAvailable);
      setPickupAvailable(nextPickupAvailable);
      setPackingCharge(nextPackingCharge);
      setCheckingKitchenSettings(false);

      if (!nextScheduleAllowed && orderTiming === "scheduled") {
        setOrderTiming("now");
        setScheduledDate("");
        setScheduledTime("");
      }

      setFormData((current) => {
        if (!nextDeliveryAvailable && !nextPickupAvailable) return current;

        if (
          current.deliveryType === "Doorstep delivery" &&
          !nextDeliveryAvailable &&
          nextPickupAvailable
        ) {
          return { ...current, deliveryType: "Self pickup" };
        }

        if (
          current.deliveryType === "Self pickup" &&
          !nextPickupAvailable &&
          nextDeliveryAvailable
        ) {
          return { ...current, deliveryType: "Doorstep delivery" };
        }

        if (!current.deliveryType) {
          return {
            ...current,
            deliveryType: nextDeliveryAvailable
              ? "Doorstep delivery"
              : "Self pickup",
          };
        }

        return current;
      });
    }

    checkKitchenSettings();
  }, [cartItems, orderTiming]);

  function getSafePackingCharge(value) {
    return Math.min(15, Math.max(5, Number(value || 5)));
  }

  async function fetchKitchenSettings(kitchenId) {
    if (!kitchenId || kitchenId === "MIXED_KITCHENS") {
      return {
        accept_scheduled_orders: false,
        delivery_available: false,
        pickup_available: false,
        packing_charge: 5,
      };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "accept_scheduled_orders, delivery_available, pickup_available, packing_charge"
      )
      .eq("id", kitchenId)
      .maybeSingle();

    if (error) {
      return {
        accept_scheduled_orders: false,
        delivery_available: false,
        pickup_available: false,
        packing_charge: 5,
      };
    }

    return {
      accept_scheduled_orders: data?.accept_scheduled_orders === true,
      delivery_available: data?.delivery_available !== false,
      pickup_available: data?.pickup_available !== false,
      packing_charge: getSafePackingCharge(data?.packing_charge),
    };
  }

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "phone") return;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function selectDeliveryType(deliveryType) {
    if (deliveryType === "Doorstep delivery" && !deliveryAvailable) {
      alert("This kitchen is not offering delivery right now.");
      return;
    }

    if (deliveryType === "Self pickup" && !pickupAvailable) {
      alert("This kitchen is not offering self pickup right now.");
      return;
    }

    setFormData((currentData) => ({
      ...currentData,
      deliveryType,
    }));
  }

  function selectOrderTiming(nextTiming) {
    if (nextTiming === "scheduled") {
      if (checkingKitchenSettings) {
        alert("Checking kitchen schedule availability. Please try again.");
        return;
      }

      if (!kitchenAcceptsScheduledOrders) {
        alert("This kitchen is not accepting scheduled orders right now.");
        return;
      }
    }

    setOrderTiming(nextTiming);

    if (nextTiming === "now") {
      setScheduledDate("");
      setScheduledTime("");
    }
  }

  function getKitchenIdFromCart() {
    if (!cartItems || cartItems.length === 0) return null;

    const kitchenIds = cartItems
      .map((item) => item.user_id || item.seller_id)
      .filter(Boolean);

    const uniqueKitchenIds = [...new Set(kitchenIds)];

    if (uniqueKitchenIds.length === 0) return null;
    if (uniqueKitchenIds.length > 1) return "MIXED_KITCHENS";

    return uniqueKitchenIds[0];
  }

  function getScheduledDateTime() {
    if (orderTiming !== "scheduled") return null;

    if (!scheduledDate || !scheduledTime) {
      throw new Error("Please select schedule date and time.");
    }

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

    if (Number.isNaN(scheduledDateTime.getTime())) {
      throw new Error("Invalid schedule date or time.");
    }

    if (scheduledDateTime.getTime() <= Date.now()) {
      throw new Error("Scheduled time must be in the future.");
    }

    return scheduledDateTime.toISOString();
  }

  function formatScheduledDateTime(dateValue, timeValue) {
    if (!dateValue || !timeValue) return "";

    const date = new Date(`${dateValue}T${timeValue}`);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getDateOptions() {
    const options = [];

    for (let index = 0; index < 7; index += 1) {
      const date = new Date();
      date.setDate(date.getDate() + index);

      options.push({
        value: formatDateValue(date),
        day:
          index === 0
            ? "Today"
            : index === 1
            ? "Tomorrow"
            : date.toLocaleDateString([], { weekday: "short" }),
        date: date.toLocaleDateString([], {
          day: "2-digit",
          month: "short",
        }),
      });
    }

    return options;
  }

  function getTimeOptions() {
    const options = [];
    const now = new Date();
    const todayValue = formatDateValue(now);

    for (let hour = 7; hour <= 22; hour += 1) {
      for (const minute of [0, 30]) {
        const value = `${String(hour).padStart(2, "0")}:${String(
          minute
        ).padStart(2, "0")}`;

        if (scheduledDate === todayValue) {
          const slot = new Date(`${scheduledDate}T${value}`);
          const minimum = new Date(Date.now() + 20 * 60 * 1000);

          if (slot.getTime() <= minimum.getTime()) continue;
        }

        const label = new Date(`2000-01-01T${value}`).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });

        options.push({ value, label });
      }
    }

    return options;
  }

  function getKitchenName(item) {
    return item.seller || item.seller_kitchen_name || "Home Kitchen";
  }

  async function copyToClipboard(value, label) {
    try {
      await navigator.clipboard.writeText(String(value));
      setPaymentMessage(`${label} copied.`);
      setTimeout(() => setPaymentMessage(""), 1800);
    } catch {
      setPaymentMessage(`Could not copy ${label.toLowerCase()}.`);
      setTimeout(() => setPaymentMessage(""), 1800);
    }
  }

  function handlePaymentProofChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload JPG, PNG, or WEBP payment screenshot.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Payment screenshot must be below 5 MB.");
      return;
    }

    setPaymentProofFile(file);
    setPaymentProofPreview(URL.createObjectURL(file));
    setPaymentMessage("Payment screenshot selected.");
  }

  function removePaymentProof() {
    setPaymentProofFile(null);
    setPaymentProofPreview("");

    if (paymentProofInputRef.current) {
      paymentProofInputRef.current.value = "";
    }
  }

  async function uploadPaymentProof() {
    if (!paymentProofFile || !user) return "";

    const fileExtension = paymentProofFile.name.split(".").pop() || "jpg";
    const filePath = `${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExtension}`;

    const { error } = await supabase.storage
      .from("payment-proofs")
      .upload(filePath, paymentProofFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw new Error(`Payment proof upload failed: ${error.message}`);

    const { data } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function validateLiveStockBeforeOrder() {
    const foodIds = cartItems.map((item) => item.id);

    const { data, error } = await supabase
      .from("foods")
      .select("id, name, stock, user_id, seller_id")
      .in("id", foodIds);

    if (error) throw new Error(error.message);

    const latestFoodMap = new Map();

    (data || []).forEach((food) => {
      latestFoodMap.set(food.id, food);
    });

    for (const cartItem of cartItems) {
      const latestFood = latestFoodMap.get(cartItem.id);

      if (!latestFood) {
        throw new Error(`${cartItem.name} is no longer available.`);
      }

      const liveStock = Number(latestFood.stock || 0);
      const requestedQty = Number(cartItem.quantity || 0);

      if (liveStock <= 0) throw new Error(`${cartItem.name} is sold out.`);

      if (requestedQty > liveStock) {
        throw new Error(
          `${cartItem.name} has only ${liveStock} left. Please update your cart.`
        );
      }
    }

    return true;
  }

  async function handlePlaceOrder() {
    if (!user) {
      alert("Please login before placing your order.");
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.flat) {
      alert(
        "Please fill name and flat details. Phone number is taken from your login profile."
      );
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const kitchenId = getKitchenIdFromCart();

    if (kitchenId === "MIXED_KITCHENS") {
      alert("Please order from one kitchen at a time.");
      return;
    }

    if (!kitchenId) {
      alert("Kitchen details missing. Please add dishes again.");
      return;
    }

    if (!paymentProofFile && !paymentReference.trim()) {
      alert(
        "Please upload payment screenshot or enter UPI transaction reference."
      );
      return;
    }

    setLoading(true);

    try {
      const latestKitchenSettings = await fetchKitchenSettings(kitchenId);
      const latestSellerPackingCharge = getSafePackingCharge(
        latestKitchenSettings.packing_charge
      );
      const latestEffectivePackingCharge = packingRequired
        ? latestSellerPackingCharge
        : 0;

      setPackingCharge(latestSellerPackingCharge);

      if (
        latestKitchenSettings.delivery_available === false &&
        latestKitchenSettings.pickup_available === false
      ) {
        setDeliveryAvailable(false);
        setPickupAvailable(false);
        throw new Error(
          "This kitchen is currently not accepting delivery or pickup orders."
        );
      }

      if (
        formData.deliveryType === "Doorstep delivery" &&
        latestKitchenSettings.delivery_available === false
      ) {
        setDeliveryAvailable(false);

        if (latestKitchenSettings.pickup_available) {
          setPickupAvailable(true);
          setFormData((current) => ({
            ...current,
            deliveryType: "Self pickup",
          }));
        }

        throw new Error(
          "This kitchen has turned off delivery. Please select self pickup."
        );
      }

      if (
        formData.deliveryType === "Self pickup" &&
        latestKitchenSettings.pickup_available === false
      ) {
        setPickupAvailable(false);

        if (latestKitchenSettings.delivery_available) {
          setDeliveryAvailable(true);
          setFormData((current) => ({
            ...current,
            deliveryType: "Doorstep delivery",
          }));
        }

        throw new Error(
          "This kitchen has turned off self pickup. Please select delivery."
        );
      }

      if (orderTiming === "scheduled") {
        if (latestKitchenSettings.accept_scheduled_orders !== true) {
          setKitchenAcceptsScheduledOrders(false);
          setOrderTiming("now");
          setScheduledDate("");
          setScheduledTime("");

          throw new Error(
            "This kitchen is not accepting scheduled orders right now."
          );
        }
      }

      const scheduledFor = getScheduledDateTime();

      await validateLiveStockBeforeOrder();

      const paymentProofUrl = await uploadPaymentProof();

      const latestTotalAmount =
        subtotalAmount + latestEffectivePackingCharge + PLATFORM_FEE;

      const orderPayload = {
        user_id: user.id,
        seller_id: kitchenId,
        customer_name: formData.fullName,
        phone: formData.phone,
        flat: formData.flat,
        delivery_type: formData.deliveryType,
        notes: formData.notes,
        subtotal_amount: subtotalAmount,
        packing_required: packingRequired,
        packing_charge: latestEffectivePackingCharge,
        platform_fee: PLATFORM_FEE,
        total_amount: latestTotalAmount,
        status: "confirmed",
        items: cartItems,
        scheduled_order: orderTiming === "scheduled",
        scheduled_for: scheduledFor,
        payment_method: paymentMethod,
        payment_status: paymentProofUrl
          ? "proof_submitted"
          : "reference_submitted",
        payment_reference: paymentReference.trim(),
        payment_proof_url: paymentProofUrl,
      };

      const { error: stockError } = await supabase.rpc("decrement_food_stock", {
        order_items: cartItems,
      });

      if (stockError) throw new Error(stockError.message);

      const { error } = await supabase.from("orders").insert([orderPayload]);

      if (error) throw new Error(error.message);

      localStorage.setItem(
        getCheckoutStorageKey(),
        JSON.stringify({
          fullName: formData.fullName,
          flat: formData.flat,
          deliveryType: formData.deliveryType,
          orderTiming,
          scheduledDate,
          scheduledTime,
          paymentReference,
          packingRequired,
        })
      );

      localStorage.removeItem("Nefo_cart_order_timing");

      clearCart();
      setOrderPlaced(true);

      setTimeout(() => {
        navigate("/orders");
      }, 1500);
    } catch (error) {
      console.error("ORDER PLACE ERROR:", error);
      setPaymentMessage(
        `Could not place order: ${error.message || "Unknown error"}`
      );
      alert(error.message || "Could not place order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (orderPlaced) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFFF2] px-4 py-8 text-[#111827]">
        <div className={`w-full max-w-md p-7 text-center ${CARD}`}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 text-4xl">
            🎉
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            {orderTiming === "scheduled" ? "Order Scheduled" : "Order Confirmed"}
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight text-[#111827]">
            {orderTiming === "scheduled"
              ? "Your order has been scheduled."
              : "Your food is now being prepared."}
          </h1>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
            Redirecting you to live order tracking.
          </p>

          <Link
            to="/orders"
            className="mt-7 block rounded-2xl border border-[#073B35] bg-[#073B35] py-4 font-black text-white active:scale-95"
          >
            Track My Order
          </Link>
        </div>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-5 pb-28 text-[#111827]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D7F5EF] bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
          >
            <BackIcon />
          </button>

          <section className={`mt-6 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 text-4xl">
              🛒
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#111827]">
              Your cart is empty
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              Add dishes from the marketplace before checkout.
            </p>

            <Link
              to="/marketplace"
              className="mt-6 block rounded-2xl border border-[#073B35] bg-[#073B35] py-4 text-center text-sm font-black text-white"
            >
              Explore Marketplace
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] px-4 py-4 pb-40 text-[#111827]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D7F5EF] bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
              Checkout
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#073B35]">
              Complete
              <span className="block text-[#111827]">your order</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              Confirm details, pay by UPI, then upload screenshot or reference.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatTile label="Items" value={cartItems.length} />
          <StatTile label="Packing" value={`₹${effectivePackingCharge}`} />
          <StatTile label="Total" value={`₹${totalAmount}`} strong />
        </section>

        <button
          type="button"
          onClick={() => setShowMobileSummary((current) => !current)}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-[#BDEFE6] bg-white/90 px-4 py-4 text-left font-black text-[#073B35] shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-[0.99]"
        >
          <span>Order Summary</span>
          <span>{showMobileSummary ? "Hide" : `₹${totalAmount}`}</span>
        </button>

        {showMobileSummary ? (
          <div className="mt-4">
            <OrderSummaryCard
              cartItems={cartItems}
              getKitchenName={getKitchenName}
              orderTiming={orderTiming}
              formattedSchedule={formattedSchedule}
              packingRequired={packingRequired}
              checkoutBlocked={checkoutBlocked}
              subtotalAmount={subtotalAmount}
              effectivePackingCharge={effectivePackingCharge}
              totalAmount={totalAmount}
              paymentProofFile={paymentProofFile}
              paymentReference={paymentReference}
            />
          </div>
        ) : null}

        <section className="mt-5 space-y-5">
          <CardSection
            number="1"
            title="Delivery details"
            subtitle="Confirm name, phone, flat and delivery mode."
          >
            <div className="space-y-4">
              <Field label="Full name">
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={INPUT}
                  placeholder="Full Name"
                />
              </Field>

              <Field label="Phone number">
                <input
                  name="phone"
                  value={formData.phone}
                  disabled
                  readOnly
                  className={INPUT}
                  placeholder="Phone Number"
                />
              </Field>

              <Field label="Tower / flat number">
                <input
                  name="flat"
                  value={formData.flat}
                  onChange={handleChange}
                  className={INPUT}
                  placeholder="Your tower / flat number"
                />
              </Field>

              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#51615D]">
                  Delivery option
                </p>

                {checkingKitchenSettings ? (
                  <div className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4 text-sm font-bold text-[#51615D]">
                    Checking kitchen delivery options...
                  </div>
                ) : checkoutBlocked ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="font-black text-red-600">
                      Kitchen unavailable
                    </p>
                    <p className="mt-1 text-sm text-red-500">
                      This kitchen has turned off both delivery and pickup.
                    </p>
                  </div>
                ) : (
                  <div
                    className={`grid gap-3 ${
                      deliveryAvailable && pickupAvailable
                        ? "grid-cols-2"
                        : "grid-cols-1"
                    }`}
                  >
                    {deliveryAvailable ? (
                      <OptionButton
                        active={formData.deliveryType === "Doorstep delivery"}
                        onClick={() => selectDeliveryType("Doorstep delivery")}
                        title="🚚 Delivery"
                        subtitle="Doorstep"
                      />
                    ) : null}

                    {pickupAvailable ? (
                      <OptionButton
                        active={formData.deliveryType === "Self pickup"}
                        onClick={() => selectDeliveryType("Self pickup")}
                        title="🛍️ Pickup"
                        subtitle="Self pickup"
                      />
                    ) : null}
                  </div>
                )}
              </div>

              <Field label="Order notes">
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  className={`${INPUT} min-h-28 resize-none`}
                  placeholder="Extra spicy, less oil, call before arrival..."
                />
              </Field>
            </div>
          </CardSection>

          <CardSection
            number="2"
            title="Packing option"
            subtitle="Choose kitchen packing or carry your own container."
          >
            <div className="grid grid-cols-1 gap-3">
              <OptionPanel
                active={packingRequired}
                onClick={() => setPackingRequired(true)}
                title="🥡 Packing required"
                subtitle={`Packing charge ₹${sellerPackingCharge} will apply.`}
              />

              <OptionPanel
                active={!packingRequired}
                onClick={() => setPackingRequired(false)}
                title="♻️ No packing required"
                subtitle="Packing charge ₹0. Carry your own container."
              />
            </div>

            {!packingRequired ? (
              <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-black text-yellow-700">
                  Please carry your own container.
                </p>
              </div>
            ) : null}
          </CardSection>

          <CardSection
            number="3"
            title="Order timing"
            subtitle="Order now or schedule for later if the kitchen allows it."
          >
            <div className="grid grid-cols-1 gap-3">
              <OptionPanel
                active={orderTiming === "now"}
                onClick={() => selectOrderTiming("now")}
                title="⚡ Order Now"
                subtitle="Prepare immediately."
              />

              <OptionPanel
                active={orderTiming === "scheduled"}
                disabled={
                  checkingKitchenSettings ||
                  !kitchenAcceptsScheduledOrders ||
                  checkoutBlocked
                }
                onClick={() => selectOrderTiming("scheduled")}
                title="🕒 Schedule Later"
                subtitle="Choose date and time."
              />
            </div>

            {!checkingKitchenSettings && !kitchenAcceptsScheduledOrders ? (
              <p className="mt-3 text-xs font-bold text-red-500">
                This kitchen is not accepting scheduled orders right now.
              </p>
            ) : null}

            {orderTiming === "scheduled" ? (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#51615D]">
                    Select date
                  </p>

                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
                    {getDateOptions().map((option) => {
                      const active = scheduledDate === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setScheduledDate(option.value);
                            setScheduledTime("");
                          }}
                          className={`min-w-[92px] shrink-0 rounded-2xl border px-3 py-3 text-left active:scale-95 ${
                            active
                              ? "border-[#073B35] bg-[#073B35] text-white"
                              : "border-[#BDEFE6] bg-[#FFFFF2] text-[#073B35]"
                          }`}
                        >
                          <p className="text-xs font-black">{option.day}</p>
                          <p
                            className={`mt-1 text-sm font-bold ${
                              active ? "text-white/75" : "text-[#51615D]"
                            }`}
                          >
                            {option.date}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#51615D]">
                    Select time
                  </p>

                  {!scheduledDate ? (
                    <div className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4 text-sm font-bold text-[#51615D]">
                      Select date first.
                    </div>
                  ) : getTimeOptions().length === 0 ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                      No time slots available today. Choose another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {getTimeOptions().map((option) => {
                        const active = scheduledTime === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setScheduledTime(option.value)}
                            className={`h-12 rounded-2xl border text-sm font-black active:scale-95 ${
                              active
                                ? "border-[#41D3BD] bg-[#41D3BD] text-[#073B35]"
                                : "border-[#BDEFE6] bg-[#FFFFF2] text-[#073B35]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {formattedSchedule ? (
                  <div className="rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/12 p-4">
                    <p className="text-sm font-black text-[#073B35]">
                      Selected schedule
                    </p>
                    <p className="mt-1 text-base font-bold text-[#111827]">
                      {formattedSchedule}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardSection>

          <section className={`overflow-hidden ${CARD}`}>
            <div className="border-b border-[#174E47] bg-[#073B35] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-white/60">
                    Step 4
                  </p>

                  <h2 className="mt-1 text-3xl font-black">UPI Payment</h2>

                  <p className="mt-2 text-sm font-semibold text-white/65">
                    Pay first, then upload screenshot or reference.
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs font-black uppercase text-white/60">
                    Payable
                  </p>

                  <p className="text-4xl font-black text-[#41D3BD]">
                    ₹{totalAmount}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="font-black">UPI payment only</p>
                <p className="mt-1 break-all text-xs font-bold text-[#41D3BD]">
                  {Nefo_UPI_ID}
                </p>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 gap-3">
                <a
                  href={upiPaymentLink}
                  className="block rounded-2xl border border-[#073B35] bg-[#073B35] py-4 text-center font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.98]"
                >
                  Pay via UPI App
                </a>

                <button
                  type="button"
                  onClick={() => setShowQr((current) => !current)}
                  className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 font-black text-[#073B35] active:scale-[0.98]"
                >
                  {showQr ? "Hide QR" : "Scan QR"}
                </button>
              </div>

              {showQr ? (
                <div className="mt-5 rounded-[24px] border border-[#BDEFE6] bg-[#FFFFF2] p-5 text-center">
                  <p className="text-sm font-black uppercase tracking-wide text-[#0B8F80]">
                    Scan & Pay
                  </p>

                  <div className="mx-auto mt-4 w-fit rounded-3xl border border-[#D7F5EF] bg-white p-4">
                    <img
                      src={qrCodeUrl}
                      alt="Nefo UPI QR Code"
                      className="h-52 w-52 object-contain"
                    />
                  </div>

                  <p className="mt-4 font-black text-[#073B35]">
                    ₹{totalAmount}
                  </p>

                  <p className="mt-1 break-all text-sm text-[#51615D]">
                    {Nefo_UPI_ID}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-3">
                {["Google Pay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                  <a
                    key={app}
                    href={upiPaymentLink}
                    className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] py-4 text-center font-black text-[#073B35]"
                  >
                    {app}
                  </a>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(Nefo_UPI_ID, "UPI ID")}
                  className="rounded-2xl border border-[#BDEFE6] bg-white py-4 font-black text-[#073B35]"
                >
                  Copy UPI ID
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(totalAmount, "Amount")}
                  className="rounded-2xl border border-[#BDEFE6] bg-white py-4 font-black text-[#073B35]"
                >
                  Copy Amount
                </button>
              </div>

              {paymentMessage ? (
                <p className="mt-3 text-center text-sm font-bold text-[#0B8F80]">
                  {paymentMessage}
                </p>
              ) : null}

              <div className="mt-5 border-t border-[#D7F5EF] pt-5">
                <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
                  Payment proof
                </p>

                <input
                  ref={paymentProofInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={handlePaymentProofChange}
                />

                {!paymentProofPreview ? (
                  <button
                    type="button"
                    onClick={() => paymentProofInputRef.current?.click()}
                    className="mt-3 flex min-h-[128px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#41D3BD] bg-[#FFFFF2] text-[#073B35] active:scale-[0.99]"
                  >
                    <span className="text-4xl">📷</span>
                    <span className="mt-3 font-black">
                      Upload Payment Screenshot
                    </span>
                    <span className="mt-1 text-xs text-[#51615D]">
                      JPG, PNG, WEBP up to 5 MB
                    </span>
                  </button>
                ) : (
                  <div className="mt-3 rounded-3xl border border-[#BDEFE6] bg-[#FFFFF2] p-3">
                    <img
                      src={paymentProofPreview}
                      alt="Payment proof preview"
                      className="max-h-72 w-full rounded-2xl border border-[#D7F5EF] bg-white object-contain"
                    />

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => paymentProofInputRef.current?.click()}
                        className="rounded-2xl border border-[#073B35] bg-[#073B35] py-3 font-black text-white"
                      >
                        Replace
                      </button>

                      <button
                        type="button"
                        onClick={removePaymentProof}
                        className="rounded-2xl border border-red-200 bg-red-50 py-3 font-black text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <Field label="UPI transaction ID / reference">
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className={INPUT}
                    placeholder="UPI transaction ID / reference number optional"
                  />
                </Field>

                <p className="mt-3 text-xs leading-relaxed text-[#51615D]">
                  Upload screenshot after payment. Transaction reference is
                  optional but useful for verification.
                </p>
              </div>
            </div>
          </section>

          <OrderSummaryCard
            cartItems={cartItems}
            getKitchenName={getKitchenName}
            orderTiming={orderTiming}
            formattedSchedule={formattedSchedule}
            packingRequired={packingRequired}
            checkoutBlocked={checkoutBlocked}
            subtotalAmount={subtotalAmount}
            effectivePackingCharge={effectivePackingCharge}
            totalAmount={totalAmount}
            paymentProofFile={paymentProofFile}
            paymentReference={paymentReference}
          />
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[950] border-t border-[#D7F5EF] bg-[#FFFFF2]/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMobileSummary((current) => !current)}
            className="shrink-0 rounded-2xl border border-[#D7F5EF] bg-white px-4 py-3 text-left shadow-sm"
          >
            <p className="text-[10px] font-black uppercase text-[#51615D]">
              Total
            </p>
            <p className="text-xl font-black text-[#073B35]">₹{totalAmount}</p>
          </button>

          <button
            onClick={handlePlaceOrder}
            disabled={loading || checkoutBlocked}
            className="flex-1 rounded-2xl border border-[#073B35] bg-[#073B35] py-4 font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Checking..."
              : checkoutBlocked
              ? "Unavailable"
              : orderTiming === "scheduled"
              ? "Schedule Order"
              : "Place Order"}
          </button>
        </div>
      </div>
    </main>
  );
}

function CardSection({ number, title, subtitle, children }) {
  return (
    <section className={`p-5 ${CARD}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#073B35] bg-[#073B35] font-black text-white shadow-lg shadow-[#073B35]/15">
          {number}
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-black text-[#111827]">{title}</h2>

          {subtitle ? (
            <p className="mt-1 text-sm font-semibold leading-relaxed text-[#51615D]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function OrderSummaryCard({
  cartItems,
  getKitchenName,
  orderTiming,
  formattedSchedule,
  packingRequired,
  checkoutBlocked,
  subtotalAmount,
  effectivePackingCharge,
  totalAmount,
  paymentProofFile,
  paymentReference,
}) {
  return (
    <section className={`p-5 ${CARD}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#0B8F80]">
            Order Summary
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#111827]">
            Your food
          </h2>
        </div>

        <div className="rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 px-3 py-1.5 text-xs font-black text-[#073B35]">
          {cartItems.length} items
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {cartItems.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-3"
          >
            <img
              src={item.image}
              alt={item.name}
              className="h-16 w-16 shrink-0 rounded-2xl border border-[#D7F5EF] bg-[#D7F5EF] object-cover"
            />

            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#111827]">
                    {item.name}
                  </p>

                  <p className="mt-1 truncate text-xs text-[#51615D]">
                    Kitchen: {getKitchenName(item)}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#51615D]">
                    Qty {item.quantity}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-black text-[#073B35]">
                  ₹{Number(item.price || 0) * Number(item.quantity || 1)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 border-t border-[#D7F5EF] pt-5">
        {orderTiming === "scheduled" && formattedSchedule ? (
          <div className="rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/12 p-4">
            <p className="text-sm font-black text-[#073B35]">
              Scheduled Order
            </p>
            <p className="mt-1 text-sm text-[#51615D]">{formattedSchedule}</p>
          </div>
        ) : null}

        {!packingRequired ? (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-black text-yellow-700">
              No packing selected
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Please carry your own container.
            </p>
          </div>
        ) : null}

        {checkoutBlocked ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-black text-red-600">
              This kitchen is currently not accepting delivery or pickup orders.
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4">
          <p className="text-xs font-black uppercase text-[#51615D]">Payment</p>

          <p className="mt-1 font-black text-[#111827]">UPI Payment Only</p>

          {paymentProofFile ? (
            <p className="mt-2 truncate text-xs font-bold text-[#0B8F80]">
              Screenshot selected
            </p>
          ) : paymentReference ? (
            <p className="mt-2 truncate text-xs font-bold text-[#0B8F80]">
              Ref: {paymentReference}
            </p>
          ) : (
            <p className="mt-2 text-xs font-bold text-[#073B35]">
              Screenshot or reference required
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] p-4 space-y-3">
          <SummaryRow label="Subtotal" value={`₹${subtotalAmount}`} />

          <SummaryRow
            label={`Packing Charge${!packingRequired ? " (Skipped)" : ""}`}
            value={`₹${effectivePackingCharge}`}
          />

          <SummaryRow label="Platform Fee" value={`₹${PLATFORM_FEE}`} />

          <div className="flex items-end justify-between border-t border-[#D7F5EF] pt-4">
            <div>
              <p className="text-sm text-[#51615D]">Total Amount</p>
              <p className="mt-1 text-xs text-[#51615D]">
                Fresh homemade food
              </p>
            </div>

            <p className="text-3xl font-black text-[#073B35]">
              ₹{totalAmount}
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#51615D]">
          From your community. Exact kitchen door/location is not shown publicly.
        </p>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-[#51615D]">{label}</p>
      <p className="font-bold text-[#111827]">{value}</p>
    </div>
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

function OptionButton({ active, onClick, title, subtitle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left active:scale-95 ${
        active
          ? "border-[#073B35] bg-[#073B35] text-white"
          : "border-[#BDEFE6] bg-[#FFFFF2] text-[#073B35]"
      }`}
    >
      <p className="font-black">{title}</p>
      <p
        className={`mt-1 text-xs font-semibold ${
          active ? "text-white/70" : "text-[#51615D]"
        }`}
      >
        {subtitle}
      </p>
    </button>
  );
}

function OptionPanel({ active, onClick, title, subtitle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border p-4 text-left active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-[#073B35] bg-[#073B35] text-white"
          : "border-[#BDEFE6] bg-[#FFFFF2] text-[#073B35]"
      }`}
    >
      <p className="text-base font-black">{title}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          active ? "text-white/70" : "text-[#51615D]"
        }`}
      >
        {subtitle}
      </p>
    </button>
  );
}

function StatTile({ label, value, strong = false }) {
  return (
    <div className="rounded-[22px] border border-[#D7F5EF] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#7A8A86]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          strong ? "text-[#073B35]" : "text-[#111827]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
} 
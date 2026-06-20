import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 8;
const Nefo_UPI_ID = "cropg1agroresearch@sbi";
const Nefo_PAYEE_NAME = "Nefo";

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const navigate = useNavigate();

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

      if (!latestFood) throw new Error(`${cartItem.name} is no longer available.`);

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

    if (!paymentReference.trim()) {
      alert(
        "Please complete UPI payment and enter the transaction reference before placing the order."
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
        payment_status: "reference_submitted",
        payment_reference: paymentReference.trim(),
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
      alert(`Could not place order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function StepHeader({ number, title, subtitle }) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-[#073B35] text-white font-black flex items-center justify-center shrink-0 shadow-lg shadow-[#073B35]/15">
          {number}
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111827]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[#51615D] text-sm mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  }

  function OrderSummaryCard({ compact = false }) {
    return (
      <section
        className={`bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] shadow-xl shadow-[#073B35]/5 ${
          compact
            ? "p-4 max-h-[70vh] overflow-y-auto"
            : "p-5 sm:p-6 h-fit lg:sticky lg:top-24"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-[11px] sm:text-xs">
              Order Summary
            </p>

            <h2 className="text-2xl sm:text-3xl font-black mt-1 text-[#111827]">
              Your food
            </h2>
          </div>

          <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] text-xs px-3 py-1.5 rounded-full font-black">
            {cartItems.length} items
          </div>
        </div>

        <div className="mt-4 sm:mt-5 space-y-3">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover bg-[#D7F5EF] shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black truncate text-[#111827] text-sm sm:text-base">
                      {item.name}
                    </p>

                    <p className="text-[#51615D] text-xs mt-1 truncate">
                      Kitchen: {getKitchenName(item)}
                    </p>

                    <p className="text-[#51615D] text-xs sm:text-sm mt-1">
                      Qty {item.quantity}
                    </p>
                  </div>

                  <p className="font-black text-[#073B35] shrink-0 text-sm sm:text-base">
                    ₹{Number(item.price || 0) * Number(item.quantity || 1)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 sm:mt-6 border-t border-[#D7F5EF] pt-5 space-y-3 sm:space-y-4">
          {orderTiming === "scheduled" && formattedSchedule && (
            <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
              <p className="text-[#073B35] text-sm font-black">
                Scheduled Order
              </p>
              <p className="text-[#51615D] text-sm mt-1">
                {formattedSchedule}
              </p>
            </div>
          )}

          {!packingRequired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="text-yellow-700 text-sm font-black">
                No packing selected
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Please carry your own container.
              </p>
            </div>
          )}

          {checkoutBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-red-600 text-sm font-black">
                This kitchen is currently not accepting delivery or pickup
                orders.
              </p>
            </div>
          )}

          <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
            <p className="text-[#51615D] text-xs uppercase font-bold">
              Payment
            </p>

            <p className="text-[#111827] font-black mt-1">UPI Payment Only</p>

            {paymentReference ? (
              <p className="text-[#1A9F8D] text-xs font-bold mt-2 truncate">
                Ref: {paymentReference}
              </p>
            ) : (
              <p className="text-[#073B35] text-xs font-bold mt-2">
                Payment reference required
              </p>
            )}
          </div>

          <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <p className="text-[#51615D]">Subtotal</p>
              <p className="font-bold text-[#111827]">₹{subtotalAmount}</p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-[#51615D]">
                Packing Charge{" "}
                {!packingRequired && (
                  <span className="text-yellow-700 font-black">(Skipped)</span>
                )}
              </p>
              <p className="font-bold text-[#111827]">
                ₹{effectivePackingCharge}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-[#51615D]">Platform Fee</p>
              <p className="font-bold text-[#111827]">₹{PLATFORM_FEE}</p>
            </div>

            <div className="border-t border-[#D7F5EF] pt-4 flex items-end justify-between">
              <div>
                <p className="text-[#51615D] text-sm">Total Amount</p>
                <p className="text-[#51615D] text-xs mt-1">
                  Fresh homemade food
                </p>
              </div>

              <p className="text-3xl sm:text-4xl font-black text-[#073B35]">
                ₹{totalAmount}
              </p>
            </div>
          </div>

          {!compact && (
            <>
              <button
                onClick={handlePlaceOrder}
                disabled={loading || checkoutBlocked}
                className="w-full mt-3 bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-[#073B35]/15"
              >
                {loading
                  ? "Checking live stock..."
                  : checkoutBlocked
                  ? "Kitchen Unavailable"
                  : orderTiming === "scheduled"
                  ? `Schedule Order • ₹${totalAmount}`
                  : `Place Order • ₹${totalAmount}`}
              </button>

              <Link
                to="/cart"
                className="block text-center mt-3 border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] font-black py-3 rounded-2xl transition-all"
              >
                Back to Cart
              </Link>
            </>
          )}

          <p className="text-[#51615D] text-xs leading-relaxed">
            From your community. Exact kitchen door/location is not shown
            publicly.
          </p>
        </div>
      </section>
    );
  }

  if (orderPlaced) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="max-w-xl w-full bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-7 sm:p-10 text-center shadow-xl shadow-[#073B35]/5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-4xl sm:text-5xl">
              🎉
            </div>

            <p className="text-[#1A9F8D] font-black uppercase tracking-wide mt-6">
              {orderTiming === "scheduled"
                ? "Order Scheduled"
                : "Order Confirmed"}
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-4 leading-tight text-[#111827]">
              {orderTiming === "scheduled"
                ? "Your order has been scheduled."
                : "Your food is now being prepared."}
            </h1>

            <p className="text-[#51615D] mt-5 leading-relaxed">
              Redirecting you to live order tracking.
            </p>

            <Link
              to="/orders"
              className="block mt-8 bg-[#073B35] hover:bg-[#0B5149] active:scale-95 text-white font-black py-4 rounded-2xl transition-all duration-200"
            >
              Track My Order
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-3 sm:px-6 py-4 sm:py-10 pb-40 lg:pb-10">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden bg-white/85 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2.5rem] p-4 sm:p-8 shadow-xl shadow-[#073B35]/5 mb-5 lg:mb-8">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>✅</span>
                  <span>Checkout</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMobileSummary(!showMobileSummary)}
                  className="lg:hidden shrink-0 bg-[#073B35] text-white font-black px-4 py-2 rounded-2xl text-xs shadow-sm"
                >
                  Summary • ₹{totalAmount}
                </button>
              </div>

              <h1 className="text-3xl sm:text-6xl font-black mt-4 sm:mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                Complete order
              </h1>

              <p className="text-[#51615D] mt-3 sm:mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                Confirm details, select packing, pay by UPI, and submit the
                transaction reference.
              </p>

              <div className="lg:hidden mt-4 grid grid-cols-3 gap-2">
                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-black text-[#51615D]">
                    Items
                  </p>
                  <p className="text-[#073B35] font-black text-lg">
                    {cartItems.length}
                  </p>
                </div>

                <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-black text-[#51615D]">
                    Pack
                  </p>
                  <p className="text-[#073B35] font-black text-lg">
                    ₹{effectivePackingCharge}
                  </p>
                </div>

                <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-3">
                  <p className="text-[10px] uppercase font-black text-[#51615D]">
                    Total
                  </p>
                  <p className="text-[#073B35] font-black text-lg">
                    ₹{totalAmount}
                  </p>
                </div>
              </div>

              {showMobileSummary && (
                <div className="relative lg:hidden mt-5">
                  <OrderSummaryCard compact />
                </div>
              )}
            </div>
          </section>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5 lg:gap-8">
            <section className="space-y-5 sm:space-y-6">
              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <StepHeader
                  number="1"
                  title="Delivery details"
                  subtitle="Confirm your name, phone, address and delivery option."
                />

                <div className="mt-5 sm:mt-6 space-y-3 sm:space-y-4">
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 outline-none focus:border-[#41D3BD] transition-all"
                    placeholder="Full Name"
                  />

                  <input
                    name="phone"
                    value={formData.phone}
                    disabled
                    readOnly
                    className="w-full bg-[#EAF7F4] border border-[#D7F5EF] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 outline-none text-[#51615D] cursor-not-allowed"
                    placeholder="Phone Number"
                  />

                  <input
                    name="flat"
                    value={formData.flat}
                    onChange={handleChange}
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 outline-none focus:border-[#41D3BD] transition-all"
                    placeholder="Your tower / flat number"
                  />

                  <div>
                    <p className="text-[#51615D] text-sm font-bold mb-3">
                      Delivery Option
                    </p>

                    {checkingKitchenSettings ? (
                      <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4 text-[#51615D] font-bold">
                        Checking kitchen delivery options...
                      </div>
                    ) : checkoutBlocked ? (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                        <p className="text-red-600 font-black">
                          Kitchen unavailable
                        </p>
                        <p className="text-red-500 text-sm mt-1">
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
                        {deliveryAvailable && (
                          <button
                            type="button"
                            onClick={() =>
                              selectDeliveryType("Doorstep delivery")
                            }
                            className={`py-4 rounded-2xl font-black border transition-all ${
                              formData.deliveryType === "Doorstep delivery"
                                ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                                : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                            }`}
                          >
                            🚚 Delivery
                          </button>
                        )}

                        {pickupAvailable && (
                          <button
                            type="button"
                            onClick={() => selectDeliveryType("Self pickup")}
                            className={`py-4 rounded-2xl font-black border transition-all ${
                              formData.deliveryType === "Self pickup"
                                ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                                : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                            }`}
                          >
                            🛍️ Pickup
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 outline-none focus:border-[#41D3BD] transition-all resize-none"
                    placeholder="Extra spicy, less oil, call before arrival..."
                  />
                </div>
              </div>

              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <StepHeader
                  number="2"
                  title="Packing option"
                  subtitle="Choose whether you want kitchen packing or you will carry your own container."
                />

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPackingRequired(true)}
                    className={`text-left rounded-2xl p-4 border transition-all ${
                      packingRequired
                        ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                        : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                    }`}
                  >
                    <p className="font-black text-lg">🥡 Packing required</p>
                    <p
                      className={`text-sm mt-1 ${
                        packingRequired ? "text-white/70" : "text-[#51615D]"
                      }`}
                    >
                      Packing charge ₹{sellerPackingCharge} will apply.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPackingRequired(false)}
                    className={`text-left rounded-2xl p-4 border transition-all ${
                      !packingRequired
                        ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                        : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                    }`}
                  >
                    <p className="font-black text-lg">♻️ No packing required</p>
                    <p
                      className={`text-sm mt-1 ${
                        !packingRequired ? "text-white/70" : "text-[#51615D]"
                      }`}
                    >
                      Packing charge ₹0. Carry your own container.
                    </p>
                  </button>
                </div>

                {!packingRequired && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                    <p className="text-yellow-700 font-black text-sm">
                      Please carry your own container.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <StepHeader
                  number="3"
                  title="Order timing"
                  subtitle="Order now or schedule for later if the kitchen allows it."
                />

                <div className="mt-5 sm:mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => selectOrderTiming("now")}
                      className={`text-left rounded-2xl p-4 border transition-all ${
                        orderTiming === "now"
                          ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                          : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                      }`}
                    >
                      <p className="font-black text-lg">⚡ Now</p>
                      <p
                        className={`text-sm mt-1 ${
                          orderTiming === "now"
                            ? "text-white/70"
                            : "text-[#51615D]"
                        }`}
                      >
                        Prepare immediately.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => selectOrderTiming("scheduled")}
                      disabled={
                        checkingKitchenSettings ||
                        !kitchenAcceptsScheduledOrders ||
                        checkoutBlocked
                      }
                      className={`text-left rounded-2xl p-4 border transition-all ${
                        orderTiming === "scheduled"
                          ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                          : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                      } ${
                        checkingKitchenSettings ||
                        !kitchenAcceptsScheduledOrders ||
                        checkoutBlocked
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <p className="font-black text-lg">🕒 Schedule</p>
                      <p
                        className={`text-sm mt-1 ${
                          orderTiming === "scheduled"
                            ? "text-white/70"
                            : "text-[#51615D]"
                        }`}
                      >
                        Choose date and time.
                      </p>
                    </button>
                  </div>

                  {!checkingKitchenSettings &&
                    !kitchenAcceptsScheduledOrders && (
                      <p className="text-red-500 text-xs mt-3">
                        This kitchen is not accepting scheduled orders right
                        now.
                      </p>
                    )}

                  {orderTiming === "scheduled" && (
                    <div className="space-y-3 mt-4">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(event) =>
                          setScheduledDate(event.target.value)
                        }
                        className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 outline-none focus:border-[#41D3BD] transition-all"
                      />

                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(event) =>
                          setScheduledTime(event.target.value)
                        }
                        className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 outline-none focus:border-[#41D3BD] transition-all"
                      />

                      {formattedSchedule && (
                        <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 rounded-2xl p-4">
                          <p className="text-[#073B35] text-sm font-black">
                            Selected schedule
                          </p>
                          <p className="text-[#111827] text-base font-bold mt-1">
                            {formattedSchedule}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] overflow-hidden shadow-xl shadow-[#073B35]/5">
                <div className="bg-[#073B35] text-white p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-white/60">
                        Step 4
                      </p>

                      <h2 className="text-2xl sm:text-3xl font-black mt-1">
                        UPI Payment
                      </h2>

                      <p className="text-white/65 text-sm mt-2">
                        Pay first, then submit reference.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black uppercase text-white/60">
                        Payable
                      </p>

                      <p className="text-3xl sm:text-4xl font-black text-[#41D3BD]">
                        ₹{totalAmount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-black">UPI payment only</p>
                      <p className="text-white/60 text-xs mt-0.5">
                        Copy, scan, or open your UPI app
                      </p>
                    </div>

                    <p className="font-black text-xs sm:text-sm break-all text-[#41D3BD]">
                      {Nefo_UPI_ID}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href={upiPaymentLink}
                      className="block text-center w-full bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.98] text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-[#073B35]/15"
                    >
                      Pay via UPI App
                    </a>

                    <button
                      type="button"
                      onClick={() => setShowQr((current) => !current)}
                      className="block text-center w-full bg-[#FFFFF2] border border-[#41D3BD]/40 hover:bg-[#D7F5EF] text-[#073B35] font-black py-4 rounded-2xl transition-all"
                    >
                      {showQr ? "Hide QR" : "Scan QR"}
                    </button>
                  </div>

                  {showQr && (
                    <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-5 text-center">
                      <p className="text-[#1A9F8D] text-sm font-black uppercase tracking-wide">
                        Scan & Pay
                      </p>

                      <div className="mt-4 bg-white rounded-3xl p-4 w-fit mx-auto border border-[#D7F5EF]">
                        <img
                          src={qrCodeUrl}
                          alt="Nefo UPI QR Code"
                          className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
                        />
                      </div>

                      <p className="text-[#073B35] font-black mt-4">
                        ₹{totalAmount}
                      </p>

                      <p className="text-[#51615D] text-sm mt-1 break-all">
                        {Nefo_UPI_ID}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    {["Google Pay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                      <a
                        key={app}
                        href={upiPaymentLink}
                        className="text-center bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 rounded-2xl py-4 font-black transition-all text-[#073B35]"
                      >
                        {app}
                      </a>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(Nefo_UPI_ID, "UPI ID")}
                      className="bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 rounded-2xl py-4 font-black transition-all text-[#073B35]"
                    >
                      Copy UPI ID
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(totalAmount, "Amount")}
                      className="bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 rounded-2xl py-4 font-black transition-all text-[#073B35]"
                    >
                      Copy Amount
                    </button>
                  </div>

                  {paymentMessage && (
                    <p className="text-[#1A9F8D] text-sm font-bold mt-3 text-center">
                      {paymentMessage}
                    </p>
                  )}

                  <div className="mt-5 border-t border-[#D7F5EF] pt-5">
                    <p className="text-[#1A9F8D] text-sm font-black uppercase tracking-wide">
                      I have paid
                    </p>

                    <input
                      value={paymentReference}
                      onChange={(event) =>
                        setPaymentReference(event.target.value)
                      }
                      className="w-full mt-3 bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 outline-none focus:border-[#41D3BD] transition-all"
                      placeholder="Enter UPI reference / transaction ID"
                    />

                    <p className="text-[#51615D] text-xs mt-3 leading-relaxed">
                      This reference is required. Orders cannot be placed
                      without UPI payment reference.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="hidden lg:block">
              <OrderSummaryCard />
            </div>
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF] px-3 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileSummary(!showMobileSummary)}
              className="shrink-0 bg-white border border-[#D7F5EF] rounded-2xl px-4 py-3 text-left shadow-sm"
            >
              <p className="text-[#51615D] text-[10px] font-black uppercase">
                Total
              </p>
              <p className="text-[#073B35] text-xl font-black">
                ₹{totalAmount}
              </p>
            </button>

            <button
              onClick={handlePlaceOrder}
              disabled={loading || checkoutBlocked}
              className="flex-1 bg-[#073B35] hover:bg-[#0B5149] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-[#073B35]/15"
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
    </>
  );
}
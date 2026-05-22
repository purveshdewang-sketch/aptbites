import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 10;
const Nefo_UPI_ID = "cropg1agroresearch@sbi";
const Nefo_PAYEE_NAME = "Nefo";

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const navigate = useNavigate();

  const subtotalAmount = Number(cartTotal || 0);
  const totalAmount = subtotalAmount + PLATFORM_FEE;
  const paymentMethod = "upi";

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
  const [kitchenAcceptsScheduledOrders, setKitchenAcceptsScheduledOrders] =
    useState(false);
  const [checkingKitchenSchedule, setCheckingKitchenSchedule] = useState(true);

  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

  const formattedSchedule = formatScheduledDateTime(
    scheduledDate,
    scheduledTime
  );

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
    user,
  ]);

  useEffect(() => {
    async function checkKitchenSchedulePermission() {
      const kitchenId = getKitchenIdFromCart();

      if (!kitchenId || kitchenId === "MIXED_KITCHENS") {
        setKitchenAcceptsScheduledOrders(false);
        setCheckingKitchenSchedule(false);

        if (orderTiming === "scheduled") {
          setOrderTiming("now");
          setScheduledDate("");
          setScheduledTime("");
        }

        return;
      }

      setCheckingKitchenSchedule(true);

      const allowed = await fetchKitchenSchedulePermission(kitchenId);

      setKitchenAcceptsScheduledOrders(allowed);
      setCheckingKitchenSchedule(false);

      if (!allowed && orderTiming === "scheduled") {
        setOrderTiming("now");
        setScheduledDate("");
        setScheduledTime("");
      }
    }

    checkKitchenSchedulePermission();
  }, [cartItems, orderTiming]);

  async function fetchKitchenSchedulePermission(kitchenId) {
    if (!kitchenId || kitchenId === "MIXED_KITCHENS") return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("accept_scheduled_orders")
      .eq("id", kitchenId)
      .maybeSingle();

    if (error) return false;

    return data?.accept_scheduled_orders === true;
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
    setFormData((currentData) => ({
      ...currentData,
      deliveryType,
    }));
  }

  function selectOrderTiming(nextTiming) {
    if (nextTiming === "scheduled") {
      if (checkingKitchenSchedule) {
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

    if (error) {
      throw new Error(error.message);
    }

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

      if (liveStock <= 0) {
        throw new Error(`${cartItem.name} is sold out.`);
      }

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
      if (orderTiming === "scheduled") {
        const latestScheduleAllowed = await fetchKitchenSchedulePermission(
          kitchenId
        );

        if (!latestScheduleAllowed) {
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

      const orderPayload = {
        user_id: user.id,
        seller_id: kitchenId,
        customer_name: formData.fullName,
        phone: formData.phone,
        flat: formData.flat,
        delivery_type: formData.deliveryType,
        notes: formData.notes,
        subtotal_amount: subtotalAmount,
        platform_fee: PLATFORM_FEE,
        total_amount: totalAmount,
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

      if (stockError) {
        throw new Error(stockError.message);
      }

      const { error } = await supabase.from("orders").insert([orderPayload]);

      if (error) {
        throw new Error(error.message);
      }

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

  function MobileSectionHeader({ number, title, subtitle }) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#41D3BD] text-[#073B35] font-black flex items-center justify-center shrink-0">
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
        className={`bg-white/85 border border-[#D7F5EF] rounded-[2rem] shadow-xl shadow-[#073B35]/5 ${
          compact ? "p-4" : "p-5 sm:p-8 h-fit lg:sticky lg:top-24"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-xs sm:text-sm">
              Order Summary
            </p>

            <h2 className="text-xl sm:text-3xl font-black mt-1 sm:mt-2 text-[#111827]">
              Your Food
            </h2>
          </div>

          <div className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] text-xs px-3 py-1.5 rounded-full font-semibold">
            {cartItems.length} items
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-[#D7F5EF]"
              />

              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black truncate text-[#111827]">
                      {item.name}
                    </p>

                    <p className="text-[#51615D] text-sm mt-1">
                      Qty {item.quantity}
                    </p>
                  </div>

                  <p className="font-black text-[#073B35] shrink-0">
                    ₹{Number(item.price || 0) * Number(item.quantity || 1)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-[#D7F5EF] pt-5 space-y-4">
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

          <div className="flex items-center justify-between text-sm">
            <p className="text-[#51615D]">Subtotal</p>
            <p className="font-bold text-[#111827]">₹{subtotalAmount}</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-[#51615D]">Platform Fee</p>
            <p className="font-bold text-[#073B35]">₹{PLATFORM_FEE}</p>
          </div>

          <div className="border-t border-[#D7F5EF] pt-5 flex items-center justify-between">
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

          {!compact && (
            <>
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full mt-3 bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[#073B35] font-black py-5 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
              >
                {loading
                  ? "Checking live stock..."
                  : orderTiming === "scheduled"
                  ? `Schedule Order • ₹${totalAmount}`
                  : `Place Order • ₹${totalAmount}`}
              </button>

              <Link
                to="/cart"
                className="block text-center mt-3 border border-[#D7F5EF] bg-[#FFFFF2] hover:bg-[#D7F5EF] text-[#51615D] hover:text-[#073B35] font-bold py-3 rounded-2xl transition-all"
              >
                Back to Cart
              </Link>
            </>
          )}
        </div>
      </section>
    );
  }

  if (orderPlaced) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="max-w-xl w-full bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-8 sm:p-10 text-center shadow-xl shadow-[#073B35]/5">
            <div className="w-24 h-24 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-5xl">
              🎉
            </div>

            <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide mt-6">
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
              className="block mt-8 bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-95 text-[#073B35] font-black py-4 rounded-2xl transition-all duration-200"
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

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-5 sm:py-10 pb-36 lg:pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="lg:hidden mb-5">
            <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-xs">
              Checkout
            </p>

            <div className="flex items-end justify-between gap-4 mt-2">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[#111827]">
                  Complete order
                </h1>

                <p className="text-[#51615D] text-sm mt-2">
                  Delivery, UPI payment and confirmation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMobileSummary(!showMobileSummary)}
                className="shrink-0 bg-white/85 border border-[#D7F5EF] text-[#073B35] font-black px-4 py-2 rounded-2xl shadow-sm"
              >
                ₹{totalAmount}
              </button>
            </div>

            {showMobileSummary && (
              <div className="mt-4">
                <OrderSummaryCard compact />
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
            <section className="space-y-5 sm:space-y-6">
              <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
                <div className="hidden lg:block">
                  <p className="text-[#1A9F8D] font-semibold uppercase tracking-wide text-sm">
                    Checkout
                  </p>

                  <h1 className="text-5xl font-black mt-3 tracking-tight text-[#111827]">
                    Delivery details
                  </h1>

                  <p className="text-[#51615D] mt-4 leading-relaxed">
                    Homemade food prepared inside your neighbourhood community.
                  </p>
                </div>

                <div className="lg:hidden">
                  <MobileSectionHeader
                    number="1"
                    title="Delivery details"
                    subtitle="Confirm your name, flat and delivery option."
                  />
                </div>

                <div className="mt-6 sm:mt-8 space-y-4">
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] transition-all"
                    placeholder="Full Name"
                  />

                  <input
                    name="phone"
                    value={formData.phone}
                    disabled
                    readOnly
                    className="w-full bg-[#EAF7F4] border border-[#D7F5EF] rounded-2xl px-5 py-4 outline-none text-[#51615D] cursor-not-allowed"
                    placeholder="Phone Number"
                  />

                  <input
                    name="flat"
                    value={formData.flat}
                    onChange={handleChange}
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] transition-all"
                    placeholder="Your tower / flat number"
                  />

                  <div>
                    <p className="text-[#51615D] text-sm font-bold mb-3">
                      Delivery Option
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => selectDeliveryType("Doorstep delivery")}
                        className={`py-4 rounded-2xl font-black border transition-all ${
                          formData.deliveryType === "Doorstep delivery"
                            ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD]"
                            : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                        }`}
                      >
                        🚚 Delivery
                      </button>

                      <button
                        type="button"
                        onClick={() => selectDeliveryType("Self pickup")}
                        className={`py-4 rounded-2xl font-black border transition-all ${
                          formData.deliveryType === "Self pickup"
                            ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD]"
                            : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                        }`}
                      >
                        🛍️ Pickup
                      </button>
                    </div>

                    {formData.deliveryType === "Self pickup" && (
                      <p className="text-[#51615D] text-xs mt-3 leading-relaxed">
                        Pickup coordination will happen after the kitchen
                        accepts your order. Exact kitchen door details are not
                        shown publicly.
                      </p>
                    )}
                  </div>

                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] transition-all resize-none"
                    placeholder="Extra spicy, less oil, call before arrival..."
                  />
                </div>
              </div>

              <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
                <MobileSectionHeader
                  number="2"
                  title="Order timing"
                  subtitle="Order now or schedule for later if the kitchen allows it."
                />

                <div className="mt-6">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => selectOrderTiming("now")}
                      className={`py-4 rounded-2xl font-black border transition-all ${
                        orderTiming === "now"
                          ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD]"
                          : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                      }`}
                    >
                      ⚡ Now
                    </button>

                    <button
                      type="button"
                      onClick={() => selectOrderTiming("scheduled")}
                      disabled={
                        checkingKitchenSchedule ||
                        !kitchenAcceptsScheduledOrders
                      }
                      className={`py-4 rounded-2xl font-black border transition-all ${
                        orderTiming === "scheduled"
                          ? "bg-[#41D3BD] text-[#073B35] border-[#41D3BD]"
                          : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF]"
                      } ${
                        checkingKitchenSchedule ||
                        !kitchenAcceptsScheduledOrders
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      🕒 Schedule
                    </button>
                  </div>

                  {!checkingKitchenSchedule &&
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
                        className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] transition-all"
                      />

                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(event) =>
                          setScheduledTime(event.target.value)
                        }
                        className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] transition-all"
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

              <div className="bg-white/85 border border-[#D7F5EF] rounded-[2rem] overflow-hidden shadow-xl shadow-[#073B35]/5">
                <div className="bg-[#41D3BD] text-[#073B35] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-[#073B35]/70">
                        Step 3
                      </p>

                      <h2 className="text-2xl sm:text-3xl font-black mt-1">
                        UPI Payment
                      </h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black uppercase text-[#073B35]/70">
                        Payable
                      </p>

                      <p className="text-3xl sm:text-4xl font-black">
                        ₹{totalAmount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 bg-[#073B35]/10 border border-[#073B35]/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black">UPI payment only</p>
                      <p className="text-[#073B35]/70 text-xs mt-0.5">
                        Pay and submit transaction reference
                      </p>
                    </div>

                    <p className="font-black text-xs sm:text-sm break-all text-right">
                      {Nefo_UPI_ID}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                    <p className="text-[#1A9F8D] text-sm font-black uppercase tracking-wide">
                      Payment Method
                    </p>

                    <p className="text-[#111827] text-xl font-black mt-1">
                      UPI Payment Only
                    </p>

                    <p className="text-[#51615D] text-sm mt-2">
                      Complete UPI payment and enter the transaction reference
                      before placing the order.
                    </p>
                  </div>

                  <div className="mt-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a
                        href={upiPaymentLink}
                        className="block text-center w-full bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.98] text-[#073B35] font-black py-4 rounded-2xl transition-all shadow-lg shadow-[#41D3BD]/20"
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
                      <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-[2rem] p-5 text-center">
                        <p className="text-[#1A9F8D] text-sm font-black uppercase tracking-wide">
                          Scan & Pay
                        </p>

                        <div className="mt-4 bg-white rounded-3xl p-4 w-fit mx-auto border border-[#D7F5EF]">
                          <img
                            src={qrCodeUrl}
                            alt="Nefo UPI QR Code"
                            className="w-56 h-56 object-contain"
                          />
                        </div>

                        <p className="text-[#073B35] font-black mt-4">
                          ₹{totalAmount}
                        </p>

                        <p className="text-[#51615D] text-sm mt-1 break-all">
                          {Nefo_UPI_ID}
                        </p>

                        <p className="text-[#51615D] text-xs mt-3 leading-relaxed">
                          Scan this QR using any UPI app. After payment, enter
                          the transaction reference below.
                        </p>
                      </div>
                    )}

                    <p className="text-[#51615D] text-sm text-center mt-3">
                      Opens your installed UPI app if supported by your phone.
                    </p>

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
                        className="w-full mt-3 bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] transition-all"
                        placeholder="Enter UPI reference / transaction ID"
                      />

                      <p className="text-[#51615D] text-xs mt-3 leading-relaxed">
                        This reference is required. Orders cannot be placed
                        without UPI payment reference.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="hidden lg:block">
              <OrderSummaryCard />
            </div>
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF] px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileSummary(!showMobileSummary)}
              className="shrink-0 bg-white/85 border border-[#D7F5EF] rounded-2xl px-4 py-3 text-left shadow-sm"
            >
              <p className="text-[#51615D] text-[11px] font-bold uppercase">
                Total
              </p>
              <p className="text-[#073B35] text-xl font-black">
                ₹{totalAmount}
              </p>
            </button>

            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-1 bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[#073B35] font-black py-4 rounded-2xl transition-all shadow-lg shadow-[#41D3BD]/20"
            >
              {loading
                ? "Checking..."
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
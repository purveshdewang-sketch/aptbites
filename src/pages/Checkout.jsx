import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 10;
const QUICKBITES_UPI_ID = "cropg1agroresearch@sbi";
const QUICKBITES_PAYEE_NAME = "QuickBites";

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();

  const navigate = useNavigate();

  const subtotalAmount = Number(cartTotal || 0);
  const totalAmount = subtotalAmount + PLATFORM_FEE;

  const upiPaymentLink = `upi://pay?pa=${encodeURIComponent(
    QUICKBITES_UPI_ID
  )}&pn=${encodeURIComponent(
    QUICKBITES_PAYEE_NAME
  )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(
    "QuickBites food order"
  )}`;

  const getCheckoutStorageKey = () =>
    user
      ? `quickbites_checkout_details_${user.id}`
      : "quickbites_checkout_details_guest";

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
  const [sellerAcceptsScheduledOrders, setSellerAcceptsScheduledOrders] =
    useState(false);
  const [checkingSellerSchedule, setCheckingSellerSchedule] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

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
          setPaymentMethod(parsedDetails.paymentMethod || "upi");
          setPaymentReference(parsedDetails.paymentReference || "");
        } catch {
          localStorage.removeItem(getCheckoutStorageKey());
        }
      }

      const cartTimingDetails = localStorage.getItem(
        "quickbites_cart_order_timing"
      );

      if (cartTimingDetails) {
        try {
          const parsedTiming = JSON.parse(cartTimingDetails);

          setOrderTiming(parsedTiming.orderTiming || "now");
          setScheduledDate(parsedTiming.scheduledDate || "");
          setScheduledTime(parsedTiming.scheduledTime || "");
        } catch {
          localStorage.removeItem("quickbites_cart_order_timing");
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
      paymentMethod,
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
    paymentMethod,
    paymentReference,
    user,
  ]);

  useEffect(() => {
    async function checkSellerSchedulePermission() {
      const sellerId = getSellerIdFromCart();

      if (!sellerId || sellerId === "MIXED_SELLERS") {
        setSellerAcceptsScheduledOrders(false);
        setCheckingSellerSchedule(false);
        return;
      }

      setCheckingSellerSchedule(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("accept_scheduled_orders")
        .eq("id", sellerId)
        .maybeSingle();

      if (error) {
        setSellerAcceptsScheduledOrders(false);
      } else {
        setSellerAcceptsScheduledOrders(data?.accept_scheduled_orders === true);
      }

      setCheckingSellerSchedule(false);
    }

    checkSellerSchedulePermission();
  }, [cartItems]);

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
    if (nextTiming === "scheduled" && !sellerAcceptsScheduledOrders) {
      alert("This seller is not accepting scheduled orders right now.");
      return;
    }

    setOrderTiming(nextTiming);
  }

  function getSellerIdFromCart() {
    if (!cartItems || cartItems.length === 0) return null;

    const sellerIds = cartItems
      .map((item) => item.user_id || item.seller_id)
      .filter(Boolean);

    const uniqueSellerIds = [...new Set(sellerIds)];

    if (uniqueSellerIds.length === 0) return null;
    if (uniqueSellerIds.length > 1) return "MIXED_SELLERS";

    return uniqueSellerIds[0];
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
      .select("id, name, stock, user_id")
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

    const sellerId = getSellerIdFromCart();

    if (sellerId === "MIXED_SELLERS") {
      alert("Please order from one seller at a time.");
      return;
    }

    if (!sellerId) {
      alert("Seller details missing. Please add dishes again.");
      return;
    }

    if (paymentMethod === "upi" && !paymentReference.trim()) {
      const confirmWithoutReference = window.confirm(
        "You have selected UPI but have not entered payment reference. Continue as payment pending?"
      );

      if (!confirmWithoutReference) return;
    }

    setLoading(true);

    try {
      const scheduledFor = getScheduledDateTime();

      if (orderTiming === "scheduled" && !sellerAcceptsScheduledOrders) {
        throw new Error(
          "This seller is not accepting scheduled orders right now."
        );
      }

      await validateLiveStockBeforeOrder();

      const orderPayload = {
        user_id: user.id,
        seller_id: sellerId,
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
        payment_status:
          paymentMethod === "upi" && paymentReference.trim()
            ? "reference_submitted"
            : "pending",
        payment_reference: paymentReference.trim() || null,
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
          paymentMethod,
          paymentReference,
        })
      );

      localStorage.removeItem("quickbites_cart_order_timing");

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

  if (orderPlaced) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 flex items-center justify-center">
          <div className="max-w-xl w-full bg-[#111111] border border-[#222] rounded-[2rem] p-8 sm:p-10 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center text-5xl">
              🎉
            </div>

            <p className="text-yellow-400 font-semibold uppercase tracking-wide mt-6">
              {orderTiming === "scheduled" ? "Order Scheduled" : "Order Confirmed"}
            </p>

            <h1 className="text-3xl sm:text-5xl font-black mt-4 leading-tight">
              {orderTiming === "scheduled"
                ? "Your order has been scheduled."
                : "Your food is now being prepared."}
            </h1>

            <p className="text-gray-400 mt-5 leading-relaxed">
              Redirecting you to live order tracking.
            </p>

            <Link
              to="/orders"
              className="block mt-8 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black py-4 rounded-2xl transition-all duration-200"
            >
              Track My Order
            </Link>
          </div>
        </main>
      </>
    );
  }

  const formattedSchedule = formatScheduledDateTime(
    scheduledDate,
    scheduledTime
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-7 sm:py-10 pb-40">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8">
          <section className="space-y-6">
            <div className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-8">
              <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                Checkout
              </p>

              <h1 className="text-3xl sm:text-5xl font-black mt-3 tracking-tight">
                Delivery details
              </h1>

              <p className="text-gray-500 mt-4 text-sm sm:text-base leading-relaxed">
                Homemade food prepared inside your neighbourhood community.
              </p>

              <div className="mt-8 space-y-4">
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                  placeholder="Full Name"
                />

                <input
                  name="phone"
                  value={formData.phone}
                  disabled
                  readOnly
                  className="w-full bg-[#111] border border-[#333] rounded-2xl px-5 py-4 outline-none text-gray-400 cursor-not-allowed"
                  placeholder="Phone Number"
                />

                <input
                  name="flat"
                  value={formData.flat}
                  onChange={handleChange}
                  className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                  placeholder="Tower B • Flat 1204"
                />

                <div>
                  <p className="text-gray-400 text-sm font-bold mb-3">
                    Delivery Option
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => selectDeliveryType("Doorstep delivery")}
                      className={`py-4 rounded-2xl font-black border transition-all ${
                        formData.deliveryType === "Doorstep delivery"
                          ? "bg-yellow-500 text-black border-yellow-400"
                          : "bg-black text-gray-400 border-[#333]"
                      }`}
                    >
                      🚚 Delivery
                    </button>

                    <button
                      type="button"
                      onClick={() => selectDeliveryType("Self pickup")}
                      className={`py-4 rounded-2xl font-black border transition-all ${
                        formData.deliveryType === "Self pickup"
                          ? "bg-yellow-500 text-black border-yellow-400"
                          : "bg-black text-gray-400 border-[#333]"
                      }`}
                    >
                      🛍️ Self Pickup
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm font-bold mb-3">
                    Order Timing
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => selectOrderTiming("now")}
                      className={`py-4 rounded-2xl font-black border transition-all ${
                        orderTiming === "now"
                          ? "bg-yellow-500 text-black border-yellow-400"
                          : "bg-black text-gray-400 border-[#333]"
                      }`}
                    >
                      ⚡ Order Now
                    </button>

                    <button
                      type="button"
                      onClick={() => selectOrderTiming("scheduled")}
                      disabled={
                        checkingSellerSchedule || !sellerAcceptsScheduledOrders
                      }
                      className={`py-4 rounded-2xl font-black border transition-all ${
                        orderTiming === "scheduled"
                          ? "bg-yellow-500 text-black border-yellow-400"
                          : "bg-black text-gray-400 border-[#333]"
                      } ${
                        checkingSellerSchedule || !sellerAcceptsScheduledOrders
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      🕒 Schedule
                    </button>
                  </div>

                  {!checkingSellerSchedule && !sellerAcceptsScheduledOrders && (
                    <p className="text-red-400 text-xs mt-3">
                      This seller is not accepting scheduled orders right now.
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
                        className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                      />

                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(event) =>
                          setScheduledTime(event.target.value)
                        }
                        className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                      />

                      {formattedSchedule && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                          <p className="text-yellow-400 text-sm font-black">
                            Selected schedule
                          </p>
                          <p className="text-white text-base font-bold mt-1">
                            {formattedSchedule}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="4"
                  className="w-full bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all resize-none"
                  placeholder="Extra spicy, less oil, call before arrival..."
                />
              </div>
            </div>

            <div className="bg-[#111111] border border-[#222] rounded-[2rem] overflow-hidden">
              <div className="bg-yellow-500 text-black p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-black/70">
                      QuickBites Payment
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-black mt-1">
                      Pay for your order
                    </h2>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black uppercase text-black/70">
                      Payable
                    </p>

                    <p className="text-3xl sm:text-4xl font-black">
                      ₹{totalAmount}
                    </p>
                  </div>
                </div>

                <div className="mt-5 bg-black/10 border border-black/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black">UPI recommended</p>
                    <p className="text-black/70 text-sm mt-0.5">
                      Fastest way to confirm payment
                    </p>
                  </div>

                  <p className="font-black text-sm break-all text-right">
                    {QUICKBITES_UPI_ID}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-3 bg-black border border-[#222] rounded-2xl p-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`py-3 rounded-xl font-black transition-all ${
                      paymentMethod === "upi"
                        ? "bg-yellow-500 text-black"
                        : "text-gray-400"
                    }`}
                  >
                    UPI
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-3 rounded-xl font-black transition-all ${
                      paymentMethod === "cash"
                        ? "bg-yellow-500 text-black"
                        : "text-gray-400"
                    }`}
                  >
                    Cash / Later
                  </button>
                </div>

                {paymentMethod === "upi" ? (
                  <div className="mt-5">
                    <a
                      href={upiPaymentLink}
                      className="block text-center w-full bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
                    >
                      Pay via UPI App
                    </a>

                    <p className="text-gray-500 text-sm text-center mt-3">
                      Opens your installed UPI app if supported by your phone.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <a
                        href={upiPaymentLink}
                        className="text-center bg-black border border-[#333] hover:border-yellow-500/40 rounded-2xl py-4 font-black transition-all"
                      >
                        Google Pay
                      </a>

                      <a
                        href={upiPaymentLink}
                        className="text-center bg-black border border-[#333] hover:border-yellow-500/40 rounded-2xl py-4 font-black transition-all"
                      >
                        PhonePe
                      </a>

                      <a
                        href={upiPaymentLink}
                        className="text-center bg-black border border-[#333] hover:border-yellow-500/40 rounded-2xl py-4 font-black transition-all"
                      >
                        Paytm
                      </a>

                      <a
                        href={upiPaymentLink}
                        className="text-center bg-black border border-[#333] hover:border-yellow-500/40 rounded-2xl py-4 font-black transition-all"
                      >
                        BHIM
                      </a>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(QUICKBITES_UPI_ID, "UPI ID")
                        }
                        className="bg-[#111] border border-[#333] hover:border-yellow-500/40 rounded-2xl py-4 font-black transition-all"
                      >
                        Copy UPI ID
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(totalAmount, "Amount")
                        }
                        className="bg-[#111] border border-[#333] hover:border-yellow-500/40 rounded-2xl py-4 font-black transition-all"
                      >
                        Copy Amount
                      </button>
                    </div>

                    {paymentMessage && (
                      <p className="text-yellow-400 text-sm font-bold mt-3 text-center">
                        {paymentMessage}
                      </p>
                    )}

                    <div className="mt-5 border-t border-[#222] pt-5">
                      <p className="text-yellow-400 text-sm font-black uppercase tracking-wide">
                        I have paid
                      </p>

                      <input
                        value={paymentReference}
                        onChange={(event) =>
                          setPaymentReference(event.target.value)
                        }
                        className="w-full mt-3 bg-black border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500 transition-all"
                        placeholder="Enter UPI reference / transaction ID"
                      />

                      <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                        Add the reference after payment. The seller can prepare
                        the order while payment is marked for verification.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 bg-black border border-[#222] rounded-2xl p-5">
                    <p className="text-yellow-400 font-black">
                      Cash / Pay Later selected
                    </p>

                    <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                      Your payment will remain pending. Use this only if the
                      seller allows offline payment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-[#111111] border border-[#222] rounded-[2rem] p-5 sm:p-8 h-fit lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                  Order Summary
                </p>

                <h2 className="text-2xl sm:text-3xl font-black mt-2">
                  Your Food
                </h2>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-full font-semibold">
                {cartItems.length} items
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-black/40 border border-[#222] rounded-3xl p-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-2xl object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-black truncate">{item.name}</p>

                        <p className="text-gray-500 text-sm mt-1">
                          Qty {item.quantity}
                        </p>
                      </div>

                      <p className="font-black text-yellow-400 shrink-0">
                        ₹
                        {Number(item.price || 0) *
                          Number(item.quantity || 1)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-[#222] pt-6 space-y-4">
              {orderTiming === "scheduled" && formattedSchedule && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                  <p className="text-yellow-400 text-sm font-black">
                    Scheduled Order
                  </p>
                  <p className="text-gray-300 text-sm mt-1">
                    {formattedSchedule}
                  </p>
                </div>
              )}

              <div className="bg-black/40 border border-[#222] rounded-2xl p-4">
                <p className="text-gray-500 text-xs uppercase font-bold">
                  Payment
                </p>

                <p className="text-white font-black mt-1">
                  {paymentMethod === "upi" ? "UPI" : "Cash / Pay Later"}
                </p>

                {paymentMethod === "upi" && paymentReference && (
                  <p className="text-green-400 text-xs font-bold mt-2 truncate">
                    Ref: {paymentReference}
                  </p>
                )}

                {paymentMethod === "upi" && !paymentReference && (
                  <p className="text-yellow-400 text-xs font-bold mt-2">
                    Payment reference pending
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-400">Subtotal</p>
                <p className="font-bold text-white">₹{subtotalAmount}</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-400">Platform Fee</p>
                <p className="font-bold text-yellow-400">₹{PLATFORM_FEE}</p>
              </div>

              <div className="border-t border-[#222] pt-5 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Amount</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Fresh homemade food
                  </p>
                </div>

                <p className="text-4xl font-black text-yellow-400">
                  ₹{totalAmount}
                </p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full mt-3 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-5 rounded-2xl text-lg transition-all duration-200 shadow-lg shadow-yellow-500/20"
              >
                {loading
                  ? "Checking live stock..."
                  : orderTiming === "scheduled"
                  ? `Schedule Order • ₹${totalAmount}`
                  : `Place Order • ₹${totalAmount}`}
              </button>

              <Link
                to="/cart"
                className="block text-center mt-3 border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 font-bold py-3 rounded-2xl transition-all"
              >
                Back to Cart
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
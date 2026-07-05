import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const QUICK_ACTIONS = [
  {
    key: "track_order",
    label: "Track order",
    short: "Live status",
    icon: "📍",
    issueType: "order_tracking",
    aiPrompt:
      "Please check my latest order status and explain what is happening now.",
  },
  {
    key: "payment_issue",
    label: "Payment issue",
    short: "UPI / reference",
    icon: "💳",
    issueType: "payment_issue",
    aiPrompt:
      "I have a payment issue. Check the selected order payment status and tell me the correct customer-side next step.",
  },
  {
    key: "refund_request",
    label: "Refund help",
    short: "Cancel / refund",
    icon: "↩️",
    issueType: "refund_request",
    aiPrompt:
      "I need customer-side help with cancellation or refund eligibility for the selected order.",
  },
  {
    key: "food_issue",
    label: "Food issue",
    short: "Missing / wrong",
    icon: "🍱",
    issueType: "food_issue",
    aiPrompt:
      "I received a missing, wrong, damaged, or poor-quality food item. Guide me using my selected order.",
  },
  {
    key: "cart_help",
    label: "Cart help",
    short: "Qty / kitchen",
    icon: "🛒",
    issueType: "cart_help",
    aiPrompt:
      "Help me solve a NeFo cart problem such as quantity, sold-out food, or mixed kitchens.",
  },
  {
    key: "checkout_help",
    label: "Checkout help",
    short: "Address / proof",
    icon: "✅",
    issueType: "checkout_help",
    aiPrompt:
      "Help me solve a customer checkout problem involving address, packing, UPI proof, or order placement.",
  },
  {
    key: "schedule_help",
    label: "Schedule order",
    short: "Date / time",
    icon: "🕒",
    issueType: "schedule_help",
    aiPrompt:
      "Explain how I can schedule a NeFo order and solve schedule date or time problems.",
  },
  {
    key: "delivery_pickup",
    label: "Delivery / pickup",
    short: "Choose service",
    icon: "🛍️",
    issueType: "delivery_pickup",
    aiPrompt:
      "Explain the customer-side difference between doorstep delivery and self pickup for my order.",
  },
  {
    key: "order_chat",
    label: "Order chat",
    short: "Contact kitchen",
    icon: "💬",
    issueType: "order_chat",
    aiPrompt:
      "Show me how to contact the kitchen through my order chat as a customer.",
  },
  {
    key: "rating_help",
    label: "Rate food",
    short: "After delivery",
    icon: "⭐",
    issueType: "rating_help",
    aiPrompt:
      "Explain how customer dish ratings work and when I can rate my food.",
  },
  {
    key: "account_help",
    label: "Account help",
    short: "Login / profile",
    icon: "👤",
    issueType: "account_help",
    aiPrompt:
      "I need customer account help with login, password reset, phone number, address, or profile.",
  },
  {
    key: "app_help",
    label: "App problem",
    short: "Screen / navigation",
    icon: "⚙️",
    issueType: "app_help",
    aiPrompt:
      "Help me solve a customer-side NeFo app navigation or screen problem.",
  },
];

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

const CUSTOMER_AI_FUNCTION = "nefo-ai-agent";

export default function CustomerCareAgent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const chatEndRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(
    searchParams.get("order_id") || ""
  );
  const [selectedIssueType, setSelectedIssueType] = useState("");
  const [messageText, setMessageText] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "agent",
      text:
        "Hi 👋 I’m NeFo Customer Assistant. I help only with customer-side NeFo questions: food discovery, cart, checkout, payment, delivery or pickup, scheduled orders, tracking, order chat, ratings, profile, and support tickets.",
    },
  ]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const [orderError, setOrderError] = useState("");
  const [ticketError, setTicketError] = useState("");
  const [chatError, setChatError] = useState("");
  const [ticketFormError, setTicketFormError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoadingOrders(false);
      setLoadingTickets(false);
      return;
    }

    fetchOrders();
    fetchTickets();

    const ordersChannel = supabase
      .channel(`care-agent-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchOrders(false)
      )
      .subscribe();

    const ticketsChannel = supabase
      .channel(`care-agent-tickets-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchTickets(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(ticketsChannel);
    };
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, aiThinking]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((order) => String(order.id) === String(selectedOrderId));
  }, [orders, selectedOrderId]);

  const latestActiveOrder = useMemo(() => {
    return orders.find((order) => {
      const status = normalizeStatus(order.status);
      const response = normalizeSellerResponse(order.seller_response);

      return (
        status !== "completed" &&
        status !== "cancelled" &&
        response !== "rejected"
      );
    });
  }, [orders]);

  const openTickets = useMemo(() => {
    return tickets.filter(
      (ticket) =>
        String(ticket.status || "open").toLowerCase() !== "closed" &&
        String(ticket.status || "open").toLowerCase() !== "resolved"
    );
  }, [tickets]);

  async function fetchOrders(showLoading = true) {
    if (!user) return;

    if (showLoading) setLoadingOrders(true);

    setOrderError("");

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, phone, flat, delivery_type, notes, total_amount, items, status, user_id, seller_id, subtotal_amount, platform_fee, created_at, seller_response, ready_for_pickup, scheduled_order, scheduled_for, payment_method, payment_status, payment_reference, packing_charge, packing_required"
      )
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(20);

    if (error) {
      setOrderError(error.message);
      setOrders([]);
    } else {
      setOrders(data || []);

      if (!selectedOrderId && data?.[0]?.id) {
        setSelectedOrderId(String(data[0].id));
      }
    }

    setLoadingOrders(false);
  }

  async function fetchTickets(showLoading = true) {
    if (!user) return;

    if (showLoading) setLoadingTickets(true);

    setTicketError("");

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(20);

    if (error) {
      setTicketError(error.message);
      setTickets([]);
    } else {
      setTickets(data || []);
    }

    setLoadingTickets(false);
  }

  function addMessage(sender, text) {
    setChatMessages((current) => [...current, { sender, text }]);
  }

  function getAiHistory() {
    return chatMessages
      .slice(-8)
      .map((message) => ({
        role: message.sender === "agent" ? "assistant" : "user",
        content: message.text,
      }))
      .filter((message) => message.content?.trim());
  }


  function isSellerOrOwnerQuestion(question) {
    const value = String(question || "").toLowerCase();

    return (
      value.includes("seller dashboard") ||
      value.includes("add dish") ||
      value.includes("edit dish") ||
      value.includes("seller earning") ||
      value.includes("seller payout") ||
      value.includes("seller bank") ||
      value.includes("seller approval") ||
      value.includes("owner dashboard") ||
      value.includes("admin") ||
      value.includes("platform commission") ||
      value.includes("mark sold out") ||
      value.includes("restock dish")
    );
  }

  function getCustomerFallbackAnswer(question, order) {
    const value = String(question || "").toLowerCase();

    if (isSellerOrOwnerQuestion(value)) {
      return [
        "Customer Assistant only",
        "",
        "This assistant handles customer-side NeFo questions only.",
        "Seller, payout, inventory, owner, and admin controls are not available here.",
        "Approved sellers must use Seller Help inside their seller account.",
      ].join("\n");
    }

    if (
      value.includes("track") ||
      value.includes("status") ||
      value.includes("where is my order")
    ) {
      if (!order) {
        return [
          "Order tracking",
          "",
          "I could not find a selected order.",
          "Open Orders or select a recent order here, then ask again.",
        ].join("\n");
      }

      return [
        `Order #${order.id}`,
        "",
        `Status: ${getStatusLabel(order)}`,
        `Delivery mode: ${order.delivery_type || "Delivery"}`,
        `Payment status: ${order.payment_status || "Not available"}`,
        isScheduledOrder(order)
          ? `Scheduled for: ${formatDateTime(order.scheduled_for)}`
          : "Timing: Prepare now",
      ].join("\n");
    }

    if (
      value.includes("cart") ||
      value.includes("mixed kitchen") ||
      value.includes("quantity") ||
      value.includes("sold out")
    ) {
      return [
        "Cart help",
        "",
        "1. NeFo checkout accepts food from one kitchen at a time.",
        "2. Remove dishes from the other kitchen if a mixed-kitchen warning appears.",
        "3. Reduce quantity when live stock is lower than the cart quantity.",
        "4. A sold-out dish must be removed or replaced before checkout.",
        "5. Open Cart to edit quantities or delete an item.",
      ].join("\n");
    }

    if (
      value.includes("checkout") ||
      value.includes("place order") ||
      value.includes("address") ||
      value.includes("packing")
    ) {
      return [
        "Checkout check",
        "",
        "1. Confirm your name, saved phone number, and complete address.",
        "2. Choose delivery or self pickup only if the kitchen offers it.",
        "3. Choose whether packing is required.",
        "4. For UPI, upload a JPG, PNG, or WEBP screenshot below 5 MB or enter the transaction reference.",
        "5. Fix any red message shown above the relevant checkout field.",
      ].join("\n");
    }

    if (
      value.includes("schedule") ||
      value.includes("later") ||
      value.includes("date") ||
      value.includes("time slot")
    ) {
      return [
        "Scheduled order",
        "",
        "1. Choose Schedule in Checkout when the kitchen allows scheduled orders.",
        "2. Select a date from the in-app date strip.",
        "3. Open the in-app time dropdown and choose an available slot.",
        "4. Today’s slots require at least 30 minutes’ notice.",
        "5. If scheduling is unavailable, place the order for preparation now.",
      ].join("\n");
    }

    if (
      value.includes("payment") ||
      value.includes("upi") ||
      value.includes("reference") ||
      value.includes("money deducted")
    ) {
      return [
        "Payment help",
        "",
        order
          ? `Selected order payment status: ${order.payment_status || "Not available"}`
          : "Select the affected order so its payment status can be checked.",
        "A submitted screenshot or transaction reference is not automatic payment verification.",
        "If money was deducted but the order is unclear, keep the UPI reference and create a Payment Issue ticket.",
      ].join("\n");
    }

    if (
      value.includes("refund") ||
      value.includes("cancel")
    ) {
      return [
        "Cancellation or refund",
        "",
        "NeFo Customer Assistant cannot approve a cancellation or refund.",
        "Select the affected order, choose Refund Help, describe the reason, and create a support ticket.",
        "Keep the payment reference and relevant screenshots available.",
      ].join("\n");
    }

    if (
      value.includes("chat") ||
      value.includes("contact kitchen") ||
      value.includes("message")
    ) {
      return [
        "Order chat",
        "",
        "1. Open Orders.",
        "2. Open the relevant order.",
        "3. Tap the order chat option.",
        "4. Use chat for order changes, pickup coordination, or delivery details.",
      ].join("\n");
    }

    if (
      value.includes("rate") ||
      value.includes("rating") ||
      value.includes("review")
    ) {
      return [
        "Food rating",
        "",
        "Dish ratings are available after a completed order.",
        "Open Order History, select the completed order, and use the available rating option for the dish.",
        "Food Details shows the live average rating and rating count.",
      ].join("\n");
    }

    if (
      value.includes("login") ||
      value.includes("password") ||
      value.includes("profile") ||
      value.includes("phone") ||
      value.includes("otp")
    ) {
      return [
        "Customer account help",
        "",
        "1. Use Customer Login for sign-in.",
        "2. Use Reset Password when the password is forgotten.",
        "3. Update customer name, address, and profile photo from Profile.",
        "4. Checkout uses the phone number saved in the NeFo profile.",
      ].join("\n");
    }

    return [
      "Customer help",
      "",
      "I can help with food discovery, cart, checkout, UPI payment, delivery or pickup, scheduled orders, tracking, order chat, ratings, customer profile, and support tickets.",
      "Select an order when the question concerns a specific purchase.",
    ].join("\n");
  }

  async function askNeFoAi(customPrompt = "", customOrderId = null) {
    if (!user) {
      alert("Please login before using NeFo AI.");
      return;
    }

    const prompt = String(customPrompt || messageText || "").trim();

    const questionOrder = customOrderId
      ? orders.find((order) => String(order.id) === String(customOrderId)) || null
      : selectedOrder;

    const localFallback = getCustomerFallbackAnswer(prompt, questionOrder);

    if (!prompt) {
      setChatError("Please type your question first.");
      return;
    }

    setChatError("");
    setTicketFormError("");
    setAiThinking(true);

    if (!customPrompt) {
      addMessage("user", prompt);
      setMessageText("");
    }

    try {
      const { data, error } = await supabase.functions.invoke(CUSTOMER_AI_FUNCTION, {
        body: {
          role: "customer",
          message: prompt,
          order_id: customOrderId
            ? Number(customOrderId)
            : selectedOrderId
            ? Number(selectedOrderId)
            : null,
          issue_type: selectedIssueType || null,
          history: getAiHistory(),
        },
      });

      if (error) {
        let detailedMessage =
          error.message || "NeFo AI is not available right now. Please try again.";

        try {
          if (error.context) {
            const errorBody = await error.context.json();
            detailedMessage =
              errorBody?.details ||
              errorBody?.error ||
              errorBody?.message ||
              detailedMessage;
          }
        } catch {
          // Keep default error message.
        }

        addMessage(
          "agent",
          `${localFallback}

AI service note: ${detailedMessage}`
        );
        setChatError(detailedMessage);
        setAiThinking(false);
        return;
      }

      if (data?.error) {
        const detailedMessage =
          data.details || data.error || "NeFo AI returned an error.";

        addMessage(
          "agent",
          `${localFallback}

AI service note: ${String(detailedMessage)}`
        );
        setChatError(String(detailedMessage));
        setAiThinking(false);
        return;
      }

      addMessage(
        "agent",
        data?.reply ||
          localFallback
      );
    } catch (error) {
      const detailedMessage =
        error?.message || "Could not connect to NeFo AI. Please try again.";

      addMessage(
        "agent",
        `${localFallback}

AI service note: ${detailedMessage}`
      );
      setChatError(detailedMessage);
    }

    setAiThinking(false);
  }

  function normalizeStatus(status) {
    const value = String(status || "confirmed").toLowerCase();

    if (value === "placed") return "confirmed";
    if (value === "baking") return "cooking";
    if (value === "delivered") return "completed";
    if (value === "out_for_delivery") return "packing";

    return value;
  }

  function normalizeSellerResponse(response) {
    return String(response || "pending").toLowerCase();
  }

  function isScheduledOrder(order) {
    return order?.scheduled_order === true || Boolean(order?.scheduled_for);
  }

  function isSelfPickup(order) {
    return String(order?.delivery_type || "").toLowerCase().includes("pickup");
  }

  function getOrderItems(order) {
    if (!order) return [];
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

  function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getAutoStatus(order) {
    if (!order) return "confirmed";

    const dbStatus = normalizeStatus(order.status);
    const sellerResponse = normalizeSellerResponse(order.seller_response);

    if (dbStatus === "cancelled" || sellerResponse === "rejected") {
      return "cancelled";
    }

    if (dbStatus === "completed") return "completed";
    if (order.ready_for_pickup) return "ready_for_pickup";
    if (sellerResponse === "pending") return "pending";

    if (dbStatus === "cooking") return "cooking";
    if (dbStatus === "packing") return "packing";
    if (dbStatus === "accepted" || sellerResponse === "accepted") {
      return "accepted";
    }

    return "confirmed";
  }

  function getStatusLabel(order) {
    const status = getAutoStatus(order);

    if (status === "pending") return "Awaiting Kitchen";
    if (status === "confirmed") {
      return isScheduledOrder(order) ? "Scheduled Order" : "Order Confirmed";
    }

    if (status === "accepted") return "Preparing";
    if (status === "cooking") return "Cooking";
    if (status === "packing") return "Almost Ready";
    if (status === "ready_for_pickup") return "Ready for Pickup";
    if (status === "completed") {
      return isSelfPickup(order) ? "Picked Up" : "Delivered";
    }
    if (status === "cancelled") return "Cancelled";

    return "Order Confirmed";
  }

  function getStatusClass(order) {
    const status = getAutoStatus(order);

    if (status === "cancelled") return "border-red-200 bg-red-50 text-red-600";
    if (status === "pending") {
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    }
    if (status === "completed")
      return "border-green-200 bg-green-50 text-green-700";
    if (status === "ready_for_pickup") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "packing") return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "cooking")
      return "border-orange-200 bg-orange-50 text-orange-700";

    return "border-[#D8C9B3] bg-[#FFF0DF] text-[#3F5128]";
  }

  function getIssueLabel(issueType) {
    const match = QUICK_ACTIONS.find((item) => item.issueType === issueType);
    return match?.label || issueType || "Support issue";
  }

  function getAgentReplyForAction(actionKey, order) {
    if (actionKey === "track_order") {
      if (!order) {
        return "I could not find an order yet. Place an order first or select a recent order when available.";
      }

      const items = getOrderItems(order)
        .map((item) => `${item.name} x ${item.quantity}`)
        .join(", ");

      return `Order #${order.id}\nStatus: ${getStatusLabel(order)}\nAmount: ₹${order.total_amount}\nMode: ${
        order.delivery_type || "Delivery"
      }\nItems: ${items || "Not available"}`;
    }

    if (actionKey === "payment_issue") {
      if (!order) {
        return "Select the order first. If money was deducted, keep your UPI reference number ready.";
      }

      return `For Order #${order.id}, payment status is ${
        order.payment_status || "pending"
      }.\nIf money was deducted, type the UPI reference number and issue details.`;
    }

    if (actionKey === "refund_request") {
      if (!order) return "Select the order for which you need a refund.";

      return `Refund request for Order #${order.id}.\nWrite the reason clearly: payment deducted, kitchen rejected, missing item, wrong item, or cancellation issue.`;
    }

    if (actionKey === "missing_item") {
      if (!order) return "Select the order with the missing or wrong food item.";

      return `For Order #${order.id}, tell me exactly what happened.\nExample: “1 poha missing” or “wrong item received.”`;
    }

    if (actionKey === "packing_issue") {
      if (!order) return "Select the order related to packing.";

      const packingText =
        order.packing_required === false
          ? "No packing was selected. Please carry your own container."
          : `Packing was selected. Packing charge: ₹${order.packing_charge || 0}.`;

      return `Packing details for Order #${order.id}:\n${packingText}\nDescribe the issue if you still need support.`;
    }

    if (actionKey === "account_help") {
      return "Tell me the customer account issue clearly: login problem, wrong phone number, profile update, password reset, or saved address issue.";
    }

    return "Describe your issue and I will create a support ticket.";
  }

  function handleQuickAction(action) {
    setSelectedIssueType(action.issueType);
    setTicketFormError("");
    setChatError("");
    addMessage("user", action.label);

    if (action.key === "track_order" && selectedOrder) {
      addMessage("agent", getAgentReplyForAction(action.key, selectedOrder));
    }

    askNeFoAi(action.aiPrompt);
  }

  async function createSupportTicket() {
    if (!user) {
      alert("Please login before creating a support ticket.");
      return;
    }

    setTicketFormError("");

    if (!selectedIssueType) {
      setTicketFormError("Please select an issue type first.");
      return;
    }

    if (!messageText.trim()) {
      setTicketFormError("Please enter your issue details.");
      return;
    }

    setCreatingTicket(true);

    const orderId = selectedOrderId ? Number(selectedOrderId) : null;

    const ticketMessage = [
      messageText.trim(),
      selectedOrder
        ? `\n\nOrder Details:\nOrder #${selectedOrder.id}\nStatus: ${getStatusLabel(
            selectedOrder
          )}\nAmount: ₹${selectedOrder.total_amount}\nDelivery Type: ${
            selectedOrder.delivery_type || "-"
          }\nPayment Status: ${
            selectedOrder.payment_status || "-"
          }\nPayment Reference: ${
            selectedOrder.payment_reference || "-"
          }\nPacking Required: ${
            selectedOrder.packing_required === false ? "No" : "Yes"
          }\nPacking Charge: ₹${selectedOrder.packing_charge || 0}`
        : "",
    ].join("");

    const { data, error } = await supabase
      .from("support_tickets")
      .insert([
        {
          user_id: user.id,
          order_id: orderId,
          issue_type: selectedIssueType,
          message: ticketMessage,
          status: "open",
        },
      ])
      .select("*")
      .single();

    if (error) {
      setTicketFormError(error.message);
      addMessage("agent", `Could not create ticket: ${error.message}`);
      setCreatingTicket(false);
      return;
    }

    addMessage("user", messageText.trim());
    addMessage(
      "agent",
      `Ticket #${data.id} created. NeFo support will review it.`
    );

    setMessageText("");
    fetchTickets(false);
    setCreatingTicket(false);
  }

  function getTicketStatusClass(status) {
    const value = String(status || "open").toLowerCase();

    if (value === "closed" || value === "resolved") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (value === "in_progress") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
            data-nefo-back="true"
          >
            <BackIcon />
          </button>

          <section className={`mt-6 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              💬
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#181411]">
              Sign in for support
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Sign in to attach orders, ask NeFo AI, and create support tickets.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white"
            >
              Sign In
            </Link>

            <Link
              to="/"
              className="mt-3 block rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-center text-sm font-black text-[#3F5128]"
            >
              Back to Home
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
            data-nefo-back="true"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              NeFo Customer AI
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Customer help
              <span className="block text-[#181411]">for the entire app.</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Customer-only help for food discovery, cart, checkout, payment,
              orders, delivery, pickup, ratings, profile, and support tickets.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Orders" value={orders.length} />
          <MiniStat label="Open" value={openTickets.length} />
          <MiniStat label="Tickets" value={tickets.length} />
        </section>

        {latestActiveOrder ? (
          <section className={`mt-5 p-5 ${CARD}`}>
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Current Order
            </p>

            <h2 className="mt-1 text-xl font-black text-[#181411]">
              Order #{latestActiveOrder.id}
            </h2>

            <p className="mt-1 text-sm font-semibold text-[#6B6258]">
              {getStatusLabel(latestActiveOrder)} •{" "}
              {latestActiveOrder.delivery_type || "Delivery"} • ₹
              {latestActiveOrder.total_amount}
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedOrderId(String(latestActiveOrder.id));
                askNeFoAi(
                  `Please explain the current status of Order #${latestActiveOrder.id}.`,
                  latestActiveOrder.id
                );
              }}
              disabled={aiThinking}
              className="mt-4 w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 text-center text-sm font-black text-white active:scale-95 disabled:opacity-50"
            >
              Ask AI About This Order
            </button>
          </section>
        ) : null}

        <section className={`mt-5 p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Step 1
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Choose customer topic
              </h2>
            </div>

            {selectedIssueType ? (
              <span className="rounded-full border border-[#D8C9B3] bg-[#FFF0DF] px-3 py-1.5 text-xs font-black text-[#3F5128]">
                Selected
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleQuickAction(action)}
                disabled={aiThinking}
                className={`rounded-2xl border p-4 text-left transition-all active:scale-[0.98] disabled:opacity-60 ${
                  selectedIssueType === action.issueType
                    ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                    : "border-[#D8C9B3] bg-[#FFFDF7] text-[#6B6258]"
                }`}
              >
                <div className="text-2xl">{action.icon}</div>

                <p className="mt-2 text-sm font-black leading-tight">
                  {action.label}
                </p>

                <p
                  className={`mt-1 text-[11px] font-semibold ${
                    selectedIssueType === action.issueType
                      ? "text-white/65"
                      : "text-[#9A8E80]"
                  }`}
                >
                  {action.short}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Step 2
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#181411]">
            Attach order if relevant
          </h2>

          {orderError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-black text-red-600">
                Orders could not load.
              </p>

              <p className="mt-1 text-xs font-semibold text-red-500">
                {orderError}
              </p>
            </div>
          ) : null}

          {loadingOrders ? (
            <div className="mt-5 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-sm font-bold text-[#6B6258]">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className={`mt-5 p-5 text-center ${SOFT_CARD}`}>
              <p className="font-black text-[#3F5128]">No orders yet</p>

              <p className="mt-1 text-sm font-semibold text-[#6B6258]">
                You can still ask a general app question.
              </p>

              <Link
                to="/marketplace"
                className="mt-4 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 text-center font-black text-white"
              >
                Explore Food
              </Link>
            </div>
          ) : (
            <div className="mt-5 max-h-[380px] space-y-3 overflow-y-auto pr-1">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedOrderId(String(order.id))}
                  className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                    String(selectedOrderId) === String(order.id)
                      ? "border-[#3F5128] bg-[#3F5128] text-white"
                      : "border-[#D8C9B3] bg-[#FFFDF7] text-[#6B6258]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black">Order #{order.id}</p>

                      <p
                        className={`mt-1 text-xs font-semibold ${
                          String(selectedOrderId) === String(order.id)
                            ? "text-white/70"
                            : "text-[#6B6258]"
                        }`}
                      >
                        {formatDateTime(order.created_at)} •{" "}
                        {order.delivery_type || "Delivery"}
                      </p>
                    </div>

                    <p className="shrink-0 font-black">₹{order.total_amount}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                        String(selectedOrderId) === String(order.id)
                          ? "border-white/10 bg-white/10 text-[#F3C06E]"
                          : getStatusClass(order)
                      }`}
                    >
                      {getStatusLabel(order)}
                    </span>

                    {order.packing_required === false ? (
                      <span
                        className={`text-[10px] font-black ${
                          String(selectedOrderId) === String(order.id)
                            ? "text-white/60"
                            : "text-yellow-700"
                        }`}
                      >
                        No packing
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="border-b border-[#4D612F] bg-[#3F5128] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#CF743D] bg-[#CF743D] text-2xl text-white">
                🤖
              </div>

              <div>
                <p className="text-xl font-black">NeFo AI Care</p>
                <p className="mt-0.5 text-xs font-semibold text-white/70">
                  Smart support with live order context
                </p>
              </div>
            </div>
          </div>

          {selectedOrder ? (
            <div className="border-b border-[#EADFCE] bg-[#FFFDF7] p-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoPill label="Order" value={`#${selectedOrder.id}`} />
                <InfoPill
                  label="Status"
                  value={getStatusLabel(selectedOrder)}
                />
                <InfoPill
                  label="Amount"
                  value={`₹${selectedOrder.total_amount}`}
                />
                <InfoPill
                  label="Packing"
                  value={
                    selectedOrder.packing_required === false
                      ? "No packing"
                      : `₹${selectedOrder.packing_charge || 0}`
                  }
                />
              </div>

              {selectedOrder.packing_required === false ? (
                <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm font-black text-yellow-700">
                    Please carry your own container.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="bg-[#FFFDF7] p-4">
            {chatError ? (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-600">
                  NeFo AI could not reply.
                </p>

                <p className="mt-1 text-xs font-semibold text-red-500">
                  {chatError}
                </p>
              </div>
            ) : null}

            <div className="h-[360px] space-y-3 overflow-y-auto rounded-3xl border border-[#D8C9B3] bg-white p-3">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.sender}-${index}`}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[86%] whitespace-pre-line rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                      message.sender === "user"
                        ? "rounded-br-md border-[#3F5128] bg-[#3F5128] text-white"
                        : "rounded-bl-md border-[#D8C9B3] bg-[#FFF8EC] text-[#6B6258]"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {aiThinking ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-[#D8C9B3] bg-[#FFF8EC] px-4 py-3 text-sm font-black text-[#3F5128]">
                    Finding the best answer...
                  </div>
                </div>
              ) : null}

              <div ref={chatEndRef} />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Step 3 • Ask AI or create ticket
              </p>

              {ticketFormError ? (
                <p className="mb-2 text-sm font-black text-red-600">
                  {ticketFormError}
                </p>
              ) : null}

              <div className="flex gap-2">
                <input
                  value={messageText}
                  onChange={(event) => {
                    setMessageText(event.target.value);
                    setTicketFormError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !aiThinking) {
                      event.preventDefault();
                      askNeFoAi();
                    }
                  }}
                  placeholder={
                    selectedIssueType
                      ? "Ask about checkout, payment, order, profile..."
                      : "Ask any customer-side NeFo question..."
                  }
                  className={INPUT}
                />

                <button
                  type="button"
                  onClick={() => askNeFoAi()}
                  disabled={aiThinking || !messageText.trim()}
                  className="shrink-0 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-5 font-black text-white active:scale-95 disabled:opacity-50"
                >
                  {aiThinking ? "..." : "Send"}
                </button>
              </div>

              <button
                type="button"
                onClick={createSupportTicket}
                disabled={creatingTicket || !selectedIssueType || !messageText.trim()}
                className="mt-3 w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingTicket
                  ? "Creating Ticket..."
                  : selectedIssueType
                  ? `Create Ticket • ${getIssueLabel(selectedIssueType)}`
                  : "Select Issue First"}
              </button>
            </div>
          </div>
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Ticket History
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Your tickets
              </h2>
            </div>

            <span className="rounded-full border border-[#D8C9B3] bg-[#FFF0DF] px-3 py-1.5 text-xs font-black text-[#3F5128]">
              {tickets.length}
            </span>
          </div>

          {ticketError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-black text-red-600">
                Tickets could not load.
              </p>

              <p className="mt-1 text-xs font-semibold text-red-500">
                {ticketError}
              </p>
            </div>
          ) : null}

          {loadingTickets ? (
            <div className="mt-5 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-sm font-bold text-[#6B6258]">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className={`mt-5 p-5 text-center ${SOFT_CARD}`}>
              <p className="font-black text-[#3F5128]">No tickets yet</p>

              <p className="mt-1 text-sm font-semibold text-[#6B6258]">
                Created tickets will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-[#181411]">
                        Ticket #{ticket.id}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                        {getIssueLabel(ticket.issue_type)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${getTicketStatusClass(
                        ticket.status
                      )}`}
                    >
                      {ticket.status || "open"}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs font-semibold leading-relaxed text-[#6B6258]">
                    {ticket.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <Link
          to="/"
          className="mt-5 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-95"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#6B6258]">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-[#3F5128]">{value}</p>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#D8C9B3] bg-white p-3">
      <p className="text-[10px] font-black uppercase text-[#6B6258]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-[#3F5128]">
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
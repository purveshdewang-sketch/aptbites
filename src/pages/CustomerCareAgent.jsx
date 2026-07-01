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
    short: "UPI / ref",
    icon: "💳",
    issueType: "payment_issue",
    aiPrompt:
      "I have a payment issue. Please check my order payment status and tell me what to do next.",
  },
  {
    key: "refund_request",
    label: "Refund request",
    short: "Cancel / refund",
    icon: "↩️",
    issueType: "refund_request",
    aiPrompt:
      "I want help with refund eligibility. Please check my order details and explain the next step.",
  },
  {
    key: "missing_item",
    label: "Food issue",
    short: "Missing / wrong",
    icon: "🍱",
    issueType: "food_issue",
    aiPrompt:
      "I received a wrong or missing food item. Please guide me based on my order.",
  },
  {
    key: "packing_issue",
    label: "Packing issue",
    short: "Container / pack",
    icon: "🥡",
    issueType: "packing_issue",
    aiPrompt:
      "I have a packing issue. Please check whether packing was selected for my order and guide me.",
  },
  {
    key: "account_help",
    label: "Account help",
    short: "Login / profile",
    icon: "👤",
    issueType: "account_help",
    aiPrompt:
      "I need account help in Nefo. Please explain what I should do inside the app.",
  },
];

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

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
        "Hi 👋 I’m Nefo AI Care. I can check your orders, payment status, packing, refund questions, and support tickets. Ask me anything about your Nefo order.",
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
      return status !== "completed" && status !== "cancelled";
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

  async function askNefoAi(customPrompt = "", customOrderId = null) {
    if (!user) {
      alert("Please login before using Nefo AI.");
      return;
    }

    const prompt = String(customPrompt || messageText || "").trim();

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
      const { data, error } = await supabase.functions.invoke("nefo-ai-agent", {
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
          error.message || "Nefo AI is not available right now. Please try again.";

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

        addMessage("agent", detailedMessage);
        setChatError(detailedMessage);
        setAiThinking(false);
        return;
      }

      if (data?.error) {
        const detailedMessage =
          data.details || data.error || "Nefo AI returned an error.";

        addMessage("agent", String(detailedMessage));
        setChatError(String(detailedMessage));
        setAiThinking(false);
        return;
      }

      addMessage(
        "agent",
        data?.reply ||
          "I could not generate a clear answer. Please ask again with more details."
      );
    } catch (error) {
      const detailedMessage =
        error?.message || "Could not connect to Nefo AI. Please try again.";

      addMessage("agent", detailedMessage);
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

    const createdAt = new Date(order.created_at || Date.now()).getTime();
    const minutesPassed = Math.floor((Date.now() - createdAt) / 60000);

    if (minutesPassed >= 20) return "packing";
    if (minutesPassed >= 10) return "cooking";

    return "confirmed";
  }

  function getStatusLabel(order) {
    const status = getAutoStatus(order);

    if (status === "confirmed") {
      return isScheduledOrder(order) ? "Scheduled Order" : "Order Confirmed";
    }

    if (status === "cooking") return "Cooking";
    if (status === "packing") return "Almost Ready";
    if (status === "ready_for_pickup") return "Ready for Pickup";
    if (status === "completed")
      return isSelfPickup(order) ? "Picked Up" : "Delivered";
    if (status === "cancelled") return "Cancelled";

    return "Order Confirmed";
  }

  function getStatusClass(order) {
    const status = getAutoStatus(order);

    if (status === "cancelled") return "border-red-200 bg-red-50 text-red-600";
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
      return "Tell me the account issue clearly: login problem, wrong phone number, profile update, password reset, or seller account issue.";
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

    askNefoAi(action.aiPrompt);
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
      `Ticket #${data.id} created. Nefo support will review it.`
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
              Sign in to attach orders, ask Nefo AI, and create support tickets.
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
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Nefo AI Care
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Ask anything
              <span className="block text-[#181411]">about your order.</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              AI can check your order context, explain payment status, and help
              you create a support ticket.
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
                askNefoAi(
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
                Choose issue
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
            Attach order
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
                <p className="text-xl font-black">Nefo AI Care</p>
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
                  Nefo AI could not reply.
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
                      askNefoAi();
                    }
                  }}
                  placeholder={
                    selectedIssueType
                      ? "Ask about payment, refund, food issue..."
                      : "Ask anything about your order..."
                  }
                  className={INPUT}
                />

                <button
                  type="button"
                  onClick={() => askNefoAi()}
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
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { getCustomerAIResponse } from "../lib/supportAI";

const QUICK_ACTIONS = [
  {
    key: "track_order",
    label: "Track order",
    short: "Live status",
    icon: "📍",
    issueType: "order_tracking",
  },
  {
    key: "payment_issue",
    label: "Payment issue",
    short: "UPI / ref",
    icon: "💳",
    issueType: "payment_issue",
  },
  {
    key: "refund_request",
    label: "Refund request",
    short: "Cancel / refund",
    icon: "↩️",
    issueType: "refund_request",
  },
  {
    key: "missing_item",
    label: "Food issue",
    short: "Missing / wrong",
    icon: "🍱",
    issueType: "food_issue",
  },
  {
    key: "packing_issue",
    label: "Packing issue",
    short: "Container / pack",
    icon: "🥡",
    issueType: "packing_issue",
  },
  {
    key: "account_help",
    label: "Account help",
    short: "Login / profile",
    icon: "👤",
    issueType: "account_help",
  },
];

export default function CustomerCareAgent() {
  const { user } = useAuth();
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
        "Hi 👋 I’m Nefo Care. Select an issue below and I’ll help you with order status, payment, refund, packing, or food complaints.",
    },
  ]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user) return;

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
  }, [chatMessages]);

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

    setErrorMessage("");

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, customer_name, phone, flat, delivery_type, notes, total_amount, items, status, user_id, seller_id, subtotal_amount, platform_fee, created_at, seller_response, ready_for_pickup, scheduled_order, scheduled_for, payment_method, payment_status, payment_reference, packing_charge, packing_required"
      )
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(20);

    if (error) {
      setErrorMessage(error.message);
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

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(20);

    if (!error) setTickets(data || []);

    setLoadingTickets(false);
  }

  function addMessage(sender, text) {
    setChatMessages((current) => [...current, { sender, text }]);
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

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
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
    if (status === "completed") return isSelfPickup(order) ? "Picked Up" : "Delivered";
    if (status === "cancelled") return "Cancelled";

    return "Order Confirmed";
  }

  function getStatusClass(order) {
    const status = getAutoStatus(order);

    if (status === "cancelled") return "bg-red-50 text-red-600 border-red-200";
    if (status === "completed") return "bg-green-50 text-green-700 border-green-200";
    if (status === "ready_for_pickup") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (status === "packing") return "bg-blue-50 text-blue-700 border-blue-200";
    if (status === "cooking") return "bg-orange-50 text-orange-700 border-orange-200";

    return "bg-[#41D3BD]/12 text-[#073B35] border-[#41D3BD]/30";
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

      return `Order #${order.id}\nStatus: ${getStatusLabel(order)}\nAmount: ₹${order.total_amount}\nMode: ${order.delivery_type || "Delivery"}\nItems: ${items || "Not available"}`;
    }

    if (actionKey === "payment_issue") {
      if (!order) {
        return "Select the order first. If money was deducted, keep your UPI reference number ready.";
      }

      return `For Order #${order.id}, payment status is ${order.payment_status || "pending"}.\nIf money was deducted, type the UPI reference number and issue details.`;
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
    addMessage("user", action.label);
    addMessage("agent", getAgentReplyForAction(action.key, selectedOrder));

    if (action.key !== "track_order") {
      setTimeout(() => {
        addMessage(
          "agent",
          "Type the details below and tap Create Ticket if you want Nefo support to review it."
        );
      }, 250);
    }
  }

  async function createSupportTicket() {
    if (!user) {
      alert("Please login before creating a support ticket.");
      return;
    }

    if (!selectedIssueType) {
      alert("Please select an issue type first.");
      return;
    }

    if (!messageText.trim()) {
      alert("Please enter your issue details.");
      return;
    }

    setCreatingTicket(true);
    setErrorMessage("");

    const orderId = selectedOrderId ? Number(selectedOrderId) : null;

    const ticketMessage = [
      messageText.trim(),
      selectedOrder
        ? `\n\nOrder Details:\nOrder #${selectedOrder.id}\nStatus: ${getStatusLabel(
            selectedOrder
          )}\nAmount: ₹${selectedOrder.total_amount}\nDelivery Type: ${
            selectedOrder.delivery_type || "-"
          }\nPayment Status: ${selectedOrder.payment_status || "-"}\nPayment Reference: ${
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
      setErrorMessage(error.message);
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
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (value === "in_progress") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-3 sm:px-6 py-4 sm:py-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden bg-[#073B35] rounded-[1.75rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl shadow-[#073B35]/20">
            <div className="absolute -top-20 -right-16 w-72 h-72 bg-[#41D3BD]/25 rounded-full blur-[85px]" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-[95px]" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-[#41D3BD] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>💬</span>
                  <span>Chat with Us</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-white">
                  How can we
                  <span className="block text-[#41D3BD]">help today?</span>
                </h1>

                <p className="text-[#D7F5EF] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Select an issue, attach an order if needed, and create a
                  support ticket in seconds.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[360px]">
                <MiniStat label="Orders" value={orders.length} />
                <MiniStat label="Open" value={openTickets.length} />
                <MiniStat label="Tickets" value={tickets.length} />
              </div>
            </div>
          </section>

          {errorMessage && (
            <div className="mt-5 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm font-black">
              {errorMessage}
            </div>
          )}

          <section className="mt-5 grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr] gap-5">
            <aside className="space-y-5 lg:sticky lg:top-24 h-fit">
              <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                      Step 1
                    </p>
                    <h2 className="text-2xl font-black text-[#111827] mt-1">
                      Choose issue
                    </h2>
                  </div>

                  {selectedIssueType && (
                    <span className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] text-xs font-black px-3 py-1.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => handleQuickAction(action)}
                      className={`text-left rounded-2xl p-4 border transition-all active:scale-[0.98] ${
                        selectedIssueType === action.issueType
                          ? "bg-[#073B35] text-white border-[#073B35] shadow-lg shadow-[#073B35]/15"
                          : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/60"
                      }`}
                    >
                      <div className="text-2xl">{action.icon}</div>
                      <p className="font-black text-sm mt-2 leading-tight">
                        {action.label}
                      </p>
                      <p
                        className={`text-[11px] mt-1 ${
                          selectedIssueType === action.issueType
                            ? "text-white/65"
                            : "text-[#8AA5A0]"
                        }`}
                      >
                        {action.short}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Step 2
                </p>

                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  Attach order
                </h2>

                {loadingOrders ? (
                  <p className="text-[#51615D] font-bold mt-5">
                    Loading orders...
                  </p>
                ) : orders.length === 0 ? (
                  <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                    <p className="text-[#073B35] font-black">No orders yet</p>
                    <p className="text-[#51615D] text-sm mt-1">
                      You can still create an account or general support ticket.
                    </p>

                    <Link
                      to="/marketplace"
                      className="block mt-4 text-center bg-[#073B35] text-white font-black py-3 rounded-2xl"
                    >
                      Explore Food
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3 max-h-[370px] overflow-y-auto pr-1">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrderId(String(order.id))}
                        className={`w-full text-left border rounded-2xl p-4 transition-all ${
                          String(selectedOrderId) === String(order.id)
                            ? "bg-[#073B35] text-white border-[#073B35]"
                            : "bg-[#FFFFF2] text-[#51615D] border-[#D7F5EF] hover:border-[#41D3BD]/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">Order #{order.id}</p>
                            <p
                              className={`text-xs mt-1 ${
                                String(selectedOrderId) === String(order.id)
                                  ? "text-white/70"
                                  : "text-[#51615D]"
                              }`}
                            >
                              {formatDateTime(order.created_at)} •{" "}
                              {order.delivery_type || "Delivery"}
                            </p>
                          </div>

                          <p className="font-black shrink-0">
                            ₹{order.total_amount}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span
                            className={`border text-[10px] font-black px-2.5 py-1 rounded-full ${
                              String(selectedOrderId) === String(order.id)
                                ? "bg-white/10 text-[#41D3BD] border-white/10"
                                : getStatusClass(order)
                            }`}
                          >
                            {getStatusLabel(order)}
                          </span>

                          {order.packing_required === false && (
                            <span
                              className={`text-[10px] font-black ${
                                String(selectedOrderId) === String(order.id)
                                  ? "text-white/60"
                                  : "text-yellow-700"
                              }`}
                            >
                              No packing
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <section className="space-y-5">
              {latestActiveOrder && (
                <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                        Current Order
                      </p>
                      <h2 className="text-2xl font-black text-[#111827] mt-1">
                        Order #{latestActiveOrder.id} • {getStatusLabel(latestActiveOrder)}
                      </h2>
                      <p className="text-[#51615D] text-sm mt-1">
                        {latestActiveOrder.delivery_type || "Delivery"} • ₹
                        {latestActiveOrder.total_amount}
                      </p>
                    </div>

                    <Link
                      to="/orders"
                      className="bg-[#073B35] text-white font-black px-5 py-3 rounded-2xl text-center"
                    >
                      Track Order
                    </Link>
                  </div>
                </div>
              )}

              <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] overflow-hidden shadow-2xl shadow-[#073B35]/8">
                <div className="bg-[#073B35] p-4 sm:p-5 text-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#41D3BD] text-[#073B35] flex items-center justify-center text-2xl">
                      💬
                    </div>

                    <div>
                      <p className="font-black text-xl">Chat with Us</p>
                      <p className="text-[#D7F5EF] text-xs mt-0.5">
                        Smart support for Nefo orders
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:block text-right">
                    <p className="text-[#41D3BD] font-black text-xs uppercase">
                      Status
                    </p>
                    <p className="text-white text-sm font-bold">Online</p>
                  </div>
                </div>

                {selectedOrder && (
                  <div className="bg-[#FFFFF2] border-b border-[#D7F5EF] p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <InfoPill label="Order" value={`#${selectedOrder.id}`} />
                      <InfoPill label="Status" value={getStatusLabel(selectedOrder)} />
                      <InfoPill label="Amount" value={`₹${selectedOrder.total_amount}`} />
                      <InfoPill
                        label="Packing"
                        value={
                          selectedOrder.packing_required === false
                            ? "No packing"
                            : `₹${selectedOrder.packing_charge || 0}`
                        }
                      />
                    </div>

                    {selectedOrder.packing_required === false && (
                      <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
                        <p className="text-yellow-700 text-sm font-black">
                          Please carry your own container.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-[#FFFFF2] p-3 sm:p-4">
                  <div className="bg-white border border-[#D7F5EF] rounded-3xl p-3 sm:p-4 h-[310px] sm:h-[390px] overflow-y-auto space-y-3">
                    {chatMessages.map((message, index) => (
                      <div
                        key={`${message.sender}-${index}`}
                        className={`flex ${
                          message.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                            message.sender === "user"
                              ? "bg-[#073B35] text-white rounded-br-md"
                              : "bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D] rounded-bl-md"
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}

                    <div ref={chatEndRef} />
                  </div>

                  <div className="mt-4">
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs mb-2">
                      Step 3 • Describe issue
                    </p>

                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      rows="3"
                      className="w-full bg-white border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] resize-none"
                      placeholder={
                        selectedIssueType
                          ? "Write issue details, UPI reference, missing item, or refund reason..."
                          : "Select an issue first..."
                      }
                    />

                    <button
                      type="button"
                      onClick={createSupportTicket}
                      disabled={creatingTicket || !selectedIssueType}
                      className="w-full mt-3 bg-[#073B35] hover:bg-[#0B5149] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
                    >
                      {creatingTicket
                        ? "Creating Ticket..."
                        : selectedIssueType
                        ? `Create Ticket • ${getIssueLabel(selectedIssueType)}`
                        : "Select Issue First"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                      Ticket History
                    </p>
                    <h2 className="text-2xl font-black text-[#111827] mt-1">
                      Your support tickets
                    </h2>
                  </div>

                  <span className="bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] text-xs font-black px-3 py-1.5 rounded-full">
                    {tickets.length}
                  </span>
                </div>

                {loadingTickets ? (
                  <p className="text-[#51615D] font-bold mt-5">
                    Loading tickets...
                  </p>
                ) : tickets.length === 0 ? (
                  <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-5 text-center">
                    <p className="text-[#073B35] font-black">No tickets yet</p>
                    <p className="text-[#51615D] text-sm mt-1">
                      Created tickets will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[#111827]">
                              Ticket #{ticket.id}
                            </p>
                            <p className="text-[#51615D] text-xs mt-1">
                              {getIssueLabel(ticket.issue_type)}
                            </p>
                          </div>

                          <span
                            className={`border text-[10px] font-black px-2.5 py-1 rounded-full ${getTicketStatusClass(
                              ticket.status
                            )}`}
                          >
                            {ticket.status || "open"}
                          </span>
                        </div>

                        <p className="text-[#51615D] text-xs mt-3 line-clamp-2">
                          {ticket.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-3">
      <p className="text-[#D7F5EF] text-[10px] font-black uppercase">
        {label}
      </p>
      <p className="text-white text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="bg-white border border-[#D7F5EF] rounded-2xl p-3">
      <p className="text-[#51615D] text-[10px] font-black uppercase">{label}</p>
      <p className="text-[#073B35] text-sm font-black mt-1 truncate">{value}</p>
    </div>
  );
}
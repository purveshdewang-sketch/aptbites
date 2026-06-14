import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const QUICK_ACTIONS = [
  {
    key: "track_order",
    label: "Track my order",
    icon: "📍",
    issueType: "order_tracking",
  },
  {
    key: "payment_issue",
    label: "Payment issue",
    icon: "💳",
    issueType: "payment_issue",
  },
  {
    key: "refund_request",
    label: "Refund request",
    icon: "↩️",
    issueType: "refund_request",
  },
  {
    key: "missing_item",
    label: "Missing / wrong item",
    icon: "🍱",
    issueType: "food_issue",
  },
  {
    key: "packing_issue",
    label: "Packing issue",
    icon: "🥡",
    issueType: "packing_issue",
  },
  {
    key: "account_help",
    label: "Account help",
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
        "Hi 👋 I’m Nefo Smart Care. I can help with orders, payments, refunds, food issues, packing, and account support.",
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

    if (!error) {
      setTickets(data || []);
    }

    setLoadingTickets(false);
  }

  function addMessage(sender, text) {
    setChatMessages((current) => [
      ...current,
      {
        sender,
        text,
      },
    ]);
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

  function getIssueLabel(issueType) {
    const match = QUICK_ACTIONS.find((item) => item.issueType === issueType);
    return match?.label || issueType || "Support issue";
  }

  function getAgentReplyForAction(actionKey, order) {
    if (actionKey === "track_order") {
      if (!order) {
        return "I could not find an order yet. Please select an order from the list or place an order first.";
      }

      const items = getOrderItems(order)
        .map((item) => `${item.name} x ${item.quantity}`)
        .join(", ");

      return `Order #${order.id} is currently: ${getStatusLabel(order)}.\nAmount: ₹${order.total_amount}.\nMode: ${order.delivery_type || "Delivery"}.\nItems: ${items || "Not available"}.`;
    }

    if (actionKey === "payment_issue") {
      if (!order) {
        return "Please select the order for which you are facing a payment issue. Then enter your UPI reference and issue details.";
      }

      return `For Order #${order.id}, payment status is ${order.payment_status || "pending"}. If amount was deducted, enter your UPI reference number and I will create a support ticket.`;
    }

    if (actionKey === "refund_request") {
      if (!order) {
        return "Please select the order for which you need a refund.";
      }

      return `Refund request for Order #${order.id}. Please write the reason. Example: payment deducted but order not placed, kitchen rejected, missing item, or wrong item.`;
    }

    if (actionKey === "missing_item") {
      if (!order) {
        return "Please select the order with missing or wrong items.";
      }

      return `For Order #${order.id}, write what was missing or wrong. Example: “1 poha missing” or “wrong item received”.`;
    }

    if (actionKey === "packing_issue") {
      if (!order) {
        return "Please select the order related to packing.";
      }

      const packingText =
        order.packing_required === false
          ? "No packing was selected. Please carry your own container."
          : `Packing was selected. Packing charge: ₹${order.packing_charge || 0}.`;

      return `Packing details for Order #${order.id}: ${packingText} If there is still an issue, describe it and I will create a ticket.`;
    }

    if (actionKey === "account_help") {
      return "For account help, explain the issue clearly. Example: login problem, wrong phone number, profile update, or seller account issue.";
    }

    return "Please describe your issue and I will create a support ticket.";
  }

  function handleQuickAction(action) {
    setSelectedIssueType(action.issueType);

    addMessage("user", action.label);

    const reply = getAgentReplyForAction(action.key, selectedOrder);
    addMessage("agent", reply);

    if (action.key === "track_order") return;

    setTimeout(() => {
      addMessage(
        "agent",
        "If you want Nefo support to review this, type the issue details below and tap Create Ticket."
      );
    }, 250);
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
      `Ticket #${data.id} created successfully. Nefo support will review it.`
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

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-3 sm:px-6 py-4 sm:py-10 pb-24">
        <div className="max-w-7xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2.5rem] p-4 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>🤖</span>
                  <span>Nefo Smart Care</span>
                </div>

                <h1 className="text-3xl sm:text-6xl font-black mt-4 sm:mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  Smart customer
                  <span className="block text-[#111827]">care agent</span>
                </h1>

                <p className="text-[#51615D] mt-3 sm:mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Get help with order tracking, payments, refunds, food issues,
                  packing, and account support.
                </p>
              </div>

              <Link
                to="/customer-care"
                className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black px-5 py-3 rounded-2xl text-center transition-all"
              >
                Back to Care
              </Link>
            </div>
          </section>

          {errorMessage && (
            <div className="mt-5 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm font-black">
              {errorMessage}
            </div>
          )}

          <section className="mt-5 sm:mt-8 grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-5">
            <div className="space-y-5">
              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Choose Issue
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  What do you need help with?
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
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
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Chat
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                  Smart support chat
                </h2>

                <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-3 sm:p-4 h-[360px] overflow-y-auto space-y-3">
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.sender}-${index}`}
                      className={`flex ${
                        message.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                          message.sender === "user"
                            ? "bg-[#073B35] text-white"
                            : "bg-white border border-[#D7F5EF] text-[#51615D]"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}

                  <div ref={chatEndRef} />
                </div>

                <div className="mt-4 space-y-3">
                  <textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    rows="4"
                    className="w-full bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-4 py-4 outline-none focus:border-[#41D3BD] resize-none"
                    placeholder="Type your issue details here..."
                  />

                  <button
                    type="button"
                    onClick={createSupportTicket}
                    disabled={creatingTicket}
                    className="w-full bg-[#073B35] hover:bg-[#0B5149] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
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

            <aside className="space-y-5">
              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Select Order
                </p>

                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  Your recent orders
                </h2>

                {loadingOrders ? (
                  <p className="text-[#51615D] font-bold mt-5">
                    Loading orders...
                  </p>
                ) : orders.length === 0 ? (
                  <div className="mt-5 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
                    <p className="text-[#51615D] font-bold">
                      No orders found.
                    </p>
                    <Link
                      to="/marketplace"
                      className="block mt-4 text-center bg-[#073B35] text-white font-black py-3 rounded-2xl"
                    >
                      Explore Food
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
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

                        <p
                          className={`text-xs font-black mt-2 ${
                            String(selectedOrderId) === String(order.id)
                              ? "text-[#41D3BD]"
                              : "text-[#073B35]"
                          }`}
                        >
                          {getStatusLabel(order)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedOrder && (
                <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Order Details
                  </p>

                  <h2 className="text-2xl font-black text-[#111827] mt-1">
                    Order #{selectedOrder.id}
                  </h2>

                  <div className="mt-4 space-y-3">
                    <InfoRow label="Status" value={getStatusLabel(selectedOrder)} />
                    <InfoRow label="Amount" value={`₹${selectedOrder.total_amount}`} />
                    <InfoRow
                      label="Payment"
                      value={selectedOrder.payment_status || "pending"}
                    />
                    <InfoRow
                      label="Mode"
                      value={selectedOrder.delivery_type || "Delivery"}
                    />
                    <InfoRow
                      label="Packing"
                      value={
                        selectedOrder.packing_required === false
                          ? "No packing"
                          : `Required • ₹${selectedOrder.packing_charge || 0}`
                      }
                    />
                  </div>

                  {selectedOrder.packing_required === false && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                      <p className="text-yellow-700 text-sm font-black">
                        Please carry your own container.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Ticket History
                </p>

                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  Your support tickets
                </h2>

                {loadingTickets ? (
                  <p className="text-[#51615D] font-bold mt-5">
                    Loading tickets...
                  </p>
                ) : tickets.length === 0 ? (
                  <p className="text-[#51615D] text-sm mt-5">
                    No tickets created yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
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
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3">
      <p className="text-[#51615D] text-sm font-bold">{label}</p>
      <p className="text-[#073B35] text-sm font-black text-right">{value}</p>
    </div>
  );
}
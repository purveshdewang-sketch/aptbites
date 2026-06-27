import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-white/90 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#BDEFE6] bg-[#FFFFF2] shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

export default function OrderChat() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bottomRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const quickReplies = useMemo(() => {
    if (!order || !user) return [];

    const isSeller = order.seller_id === user.id;

    if (isSeller) {
      return [
        "Item unavailable",
        "Running late by 10 minutes",
        "Order is ready",
        "Thank you",
      ];
    }

    return ["Okay", "Please replace it", "Cancel that item", "Call me"];
  }, [order, user]);

  useEffect(() => {
    if (!user || !orderId) {
      setLoading(false);
      return;
    }

    fetchOrderAndMessages();

    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((currentMessages) => {
            const alreadyExists = currentMessages.some(
              (message) => message.id === payload.new.id
            );

            if (alreadyExists) return currentMessages;

            return [...currentMessages, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchOrderAndMessages() {
    setLoading(true);
    setErrorMessage("");

    const numericOrderId = Number(orderId);

    if (!numericOrderId) {
      setErrorMessage("Invalid order link.");
      setLoading(false);
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", numericOrderId)
      .maybeSingle();

    if (orderError) {
      setErrorMessage(orderError.message);
      setLoading(false);
      return;
    }

    if (!orderData) {
      setErrorMessage("Order not found.");
      setLoading(false);
      return;
    }

    const isCustomer = orderData.user_id === user.id;
    const isSeller = orderData.seller_id === user.id;

    if (!isCustomer && !isSeller) {
      setErrorMessage("You do not have access to this order chat.");
      setLoading(false);
      return;
    }

    setOrder(orderData);

    const { data: messageData, error: messageError } = await supabase
      .from("order_messages")
      .select("*")
      .eq("order_id", numericOrderId)
      .order("created_at", { ascending: true });

    if (messageError) {
      setErrorMessage(messageError.message);
      setMessages([]);
    } else {
      setMessages(messageData || []);
    }

    setLoading(false);
  }

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }

  function getSenderRole() {
    if (!order || !user) return "customer";
    return order.seller_id === user.id ? "seller" : "customer";
  }

  async function sendMessage(customMessage) {
    const finalMessage = String(customMessage || messageText || "").trim();

    if (!finalMessage || !order || !user || sending) return;

    setSending(true);
    setErrorMessage("");

    const payload = {
      order_id: Number(orderId),
      sender_id: user.id,
      sender_role: getSenderRole(),
      message: finalMessage,
      is_read: false,
    };

    const { data, error } = await supabase
      .from("order_messages")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSending(false);
      return;
    }

    setMessages((currentMessages) => {
      const alreadyExists = currentMessages.some(
        (message) => message.id === data.id
      );

      if (alreadyExists) return currentMessages;

      return [...currentMessages, data];
    });

    setMessageText("");
    setSending(false);
  }

  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDate(value) {
    if (!value) return "Date not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Date not available";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getOrderItems() {
    if (!order?.items) return [];

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

  function getShortOrderId() {
    const value = String(orderId || "");
    return value.length > 8 ? value.slice(0, 8).toUpperCase() : value;
  }

  function getStatusLabel(status) {
    const value = String(status || "confirmed")
      .replaceAll("_", " ")
      .toLowerCase();

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function getStatusClass(status) {
    const value = String(status || "").toLowerCase();

    if (value === "cancelled") {
      return "border-red-200 bg-red-50 text-red-600";
    }

    if (value === "completed" || value === "delivered") {
      return "border-[#BDEFE6] bg-[#DFF8EF] text-[#087A51]";
    }

    return "border-[#BDEFE6] bg-[#41D3BD]/12 text-[#073B35]";
  }

  function getHeaderTitle() {
    if (userRole === "seller") {
      return `Chat with ${order?.customer_name || "Customer"}`;
    }

    return "Chat with Kitchen";
  }

  function getBackLink() {
    if (userRole === "seller") return "/seller-dashboard";
    return "/orders";
  }

  const userRole = getSenderRole();
  const orderItems = getOrderItems();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-5 pb-28 text-[#111827]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D7F5EF] bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <section className={`mt-6 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 text-4xl">
              💬
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#111827]">
              Sign in to open chat
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              Order chat is available only to the customer and kitchen.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl border border-[#073B35] bg-[#073B35] py-4 text-center text-sm font-black text-white"
            >
              Sign In
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#FFFFF2] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-[#D7F5EF] bg-[#FFFFF2]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D7F5EF] bg-white/90 text-[#073B35] shadow-[6px_6px_16px_rgba(7,59,53,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Go back"
            >
              <BackIcon />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black uppercase tracking-wide text-[#0B8F80]">
                Order #{getShortOrderId()}
              </p>

              <h1 className="truncate text-lg font-black text-[#111827]">
                {order ? getHeaderTitle() : "Order Chat"}
              </h1>
            </div>

            <Link
              to={getBackLink()}
              className="shrink-0 rounded-full border border-[#BDEFE6] bg-white px-4 py-2 text-xs font-black text-[#073B35] active:scale-95"
            >
              Done
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <section className="flex flex-1 items-center justify-center px-4">
          <div className={`w-full max-w-md p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#D7F5EF] border-t-[#073B35] animate-spin" />

            <p className="mt-5 font-black text-[#073B35]">
              Loading order chat...
            </p>
          </div>
        </section>
      ) : null}

      {!loading && errorMessage && !order ? (
        <section className="flex flex-1 items-center justify-center px-4">
          <div className={`w-full max-w-md p-7 text-center ${CARD}`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 text-3xl">
              ⚠️
            </div>

            <h2 className="mt-4 text-2xl font-black text-[#111827]">
              Chat unavailable
            </h2>

            <p className="mt-2 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 w-full rounded-2xl border border-[#073B35] bg-[#073B35] py-3 font-black text-white active:scale-95"
            >
              Go Back
            </button>
          </div>
        </section>
      ) : null}

      {!loading && order ? (
        <>
          <section className="mx-auto w-full max-w-md px-4 py-4">
            <div className={`p-4 ${CARD}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-[#51615D]">
                    Order Summary
                  </p>

                  <h2 className="mt-1 text-3xl font-black text-[#073B35]">
                    ₹{order.total_amount || 0}
                  </h2>

                  <p className="mt-1 truncate text-xs font-semibold text-[#51615D]">
                    {order.delivery_type || "Delivery"} •{" "}
                    {order.flat || "Address not available"}
                  </p>

                  <p className="mt-2 text-xs font-bold text-[#8AA5A0]">
                    {formatDate(order.created_at)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black ${getStatusClass(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>

              {orderItems.length > 0 ? (
                <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
                  {orderItems.map((item) => (
                    <div
                      key={`${item.id || item.name}-${item.name}`}
                      className="shrink-0 rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] px-3 py-2"
                    >
                      <p className="max-w-[150px] truncate text-xs font-black text-[#111827]">
                        {item.name}
                      </p>

                      <p className="mt-0.5 text-[11px] font-semibold text-[#51615D]">
                        Qty {item.quantity || 1}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {errorMessage ? (
            <div className="mx-auto w-full max-w-md px-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                {errorMessage}
              </div>
            </div>
          ) : null}

          <section className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-44">
            {messages.length === 0 ? (
              <div className="flex min-h-[320px] flex-1 items-center justify-center">
                <div className={`w-full p-8 text-center ${SOFT_CARD}`}>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 text-4xl">
                    💬
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-[#111827]">
                    Start order chat
                  </h2>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
                    Use this chat only for this order. Avoid sharing private
                    addresses or external payment details.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isMine = message.sender_id === user.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-[22px] border px-4 py-3 shadow-sm ${
                          isMine
                            ? "rounded-br-md border-[#073B35] bg-[#073B35] text-white"
                            : "rounded-bl-md border-[#BDEFE6] bg-white text-[#111827]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.message}
                        </p>

                        <p
                          className={`mt-1 text-right text-[10px] ${
                            isMine ? "text-white/65" : "text-[#51615D]"
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>
            )}
          </section>

          <footer className="fixed bottom-0 left-0 right-0 z-[950] border-t border-[#D7F5EF] bg-[#FFFFF2]/95 backdrop-blur-xl">
            <div className="mx-auto max-w-md px-4 pb-4 pt-3">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 scrollbar-hide">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => sendMessage(reply)}
                    disabled={sending}
                    className="shrink-0 rounded-full border border-[#BDEFE6] bg-white px-4 py-2.5 text-xs font-black text-[#073B35] shadow-sm active:scale-95 disabled:opacity-60"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Type message..."
                  rows={1}
                  className="min-h-[54px] max-h-32 flex-1 resize-none rounded-3xl border border-[#BDEFE6] bg-white px-4 py-3 text-sm font-semibold text-[#111827] outline-none placeholder:text-[#8AA5A0] focus:border-[#41D3BD]"
                />

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={sending || !messageText.trim()}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#073B35] bg-[#073B35] text-xl font-black text-white shadow-lg shadow-[#073B35]/20 active:scale-95 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <SendIcon />
                </button>
              </div>
            </div>
          </footer>
        </>
      ) : null}
    </main>
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

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
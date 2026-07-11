import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

export default function OrderChat() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bottomRef = useRef(null);
  const messageRefreshRunningRef = useRef(false);

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
      return undefined;
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

    const refreshInterval = window.setInterval(() => {
      fetchMessagesOnly();
    }, 5000);

    return () => {
      window.clearInterval(refreshInterval);
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

  async function fetchMessagesOnly() {
    if (!user || !orderId || messageRefreshRunningRef.current) {
      return;
    }

    const numericOrderId = Number(orderId);

    if (!numericOrderId) {
      return;
    }

    messageRefreshRunningRef.current = true;

    const { data, error } = await supabase
      .from("order_messages")
      .select("*")
      .eq("order_id", numericOrderId)
      .order("created_at", { ascending: true });

    messageRefreshRunningRef.current = false;

    if (error) {
      return;
    }

    const nextMessages = data || [];

    setMessages((currentMessages) => {
      if (currentMessages.length !== nextMessages.length) {
        return nextMessages;
      }

      const hasChanged = nextMessages.some((nextMessage, index) => {
        const currentMessage = currentMessages[index];

        return (
          currentMessage?.id !== nextMessage.id ||
          currentMessage?.message !== nextMessage.message ||
          currentMessage?.created_at !== nextMessage.created_at
        );
      });

      return hasChanged ? nextMessages : currentMessages;
    });
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
      return "border-green-200 bg-green-50 text-green-700";
    }

    return "border-[#D8C9B3] bg-[#FFF0DF] text-[#3F5128]";
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
              Sign in to open chat
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Order chat is available only to the customer and kitchen.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white"
            >
              Sign In
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#FFF8EC] text-[#181411]">
      <header className="sticky top-0 z-50 border-b border-[#EADFCE] bg-[#FFF8EC]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
              aria-label="Go back"
            >
              <BackIcon />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Order #{getShortOrderId()}
              </p>

              <h1 className="truncate text-lg font-black text-[#181411]">
                {order ? getHeaderTitle() : "Order Chat"}
              </h1>
            </div>

            <Link
              to={getBackLink()}
              className="shrink-0 rounded-full border border-[#D8C9B3] bg-white px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95"
            >
              Done
            </Link>
          </div>
        </div>
      </header>

      {loading ? (
        <section className="flex flex-1 items-center justify-center px-4">
          <div className={`w-full max-w-md p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#EADFCE] border-t-[#3F5128] animate-spin" />

            <p className="mt-5 font-black text-[#3F5128]">
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

            <h2 className="mt-4 text-2xl font-black text-[#181411]">
              Chat unavailable
            </h2>

            <p className="mt-2 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 w-full rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 font-black text-white active:scale-95"
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
                  <p className="text-xs font-black uppercase tracking-wide text-[#6B6258]">
                    Order Summary
                  </p>

                  <h2 className="mt-1 text-3xl font-black text-[#3F5128]">
                    ₹{order.total_amount || 0}
                  </h2>

                  <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                    {order.delivery_type || "Delivery"} •{" "}
                    {order.flat || "Address not available"}
                  </p>

                  <p className="mt-2 text-xs font-bold text-[#9A8E80]">
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
                      className="shrink-0 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-3 py-2"
                    >
                      <p className="max-w-[150px] truncate text-xs font-black text-[#181411]">
                        {item.name}
                      </p>

                      <p className="mt-0.5 text-[11px] font-semibold text-[#6B6258]">
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
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
                    💬
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-[#181411]">
                    Start order chat
                  </h2>

                  <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
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
                            ? "rounded-br-md border-[#3F5128] bg-[#3F5128] text-white"
                            : "rounded-bl-md border-[#D8C9B3] bg-white text-[#181411]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.message}
                        </p>

                        <p
                          className={`mt-1 text-right text-[10px] ${
                            isMine ? "text-white/65" : "text-[#6B6258]"
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

          <footer className="fixed bottom-0 left-0 right-0 z-[950] border-t border-[#EADFCE] bg-[#FFF8EC]/95 backdrop-blur-xl">
            <div className="mx-auto max-w-md px-4 pb-4 pt-3">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 scrollbar-hide">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => sendMessage(reply)}
                    disabled={sending}
                    className="shrink-0 rounded-full border border-[#D8C9B3] bg-white px-4 py-2.5 text-xs font-black text-[#3F5128] shadow-sm active:scale-95 disabled:opacity-60"
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
                  className="min-h-[54px] max-h-32 flex-1 resize-none rounded-3xl border border-[#D8C9B3] bg-white px-4 py-3 text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D]"
                />

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={sending || !messageText.trim()}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#3F5128] bg-[#3F5128] text-xl font-black text-white shadow-lg shadow-[#3F5128]/20 active:scale-95 disabled:opacity-50"
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
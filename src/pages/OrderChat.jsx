import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

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
    if (!user || !orderId) return;

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

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
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

  const userRole = getSenderRole();
  const orderItems = getOrderItems();

  return (
    <main className="min-h-screen bg-[#FFFFF2] text-[#111827] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-b border-[#D7F5EF]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-2xl bg-white border border-[#D7F5EF] text-[#073B35] font-black shadow-sm active:scale-95"
            >
              ←
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#51615D] font-bold truncate">
                Order #{orderId}
              </p>

              <h1 className="text-lg font-black text-[#073B35] truncate">
                {userRole === "seller"
                  ? `Chat with ${order?.customer_name || "Customer"}`
                  : "Chat with Kitchen"}
              </h1>
            </div>

            <Link
              to={userRole === "seller" ? "/seller-dashboard" : "/orders"}
              className="hidden sm:inline-flex px-4 py-2 rounded-2xl bg-[#073B35] text-white font-black text-sm"
            >
              Done
            </Link>
          </div>
        </div>
      </header>

      {loading && (
        <section className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-[#D7F5EF] border-t-[#073B35] animate-spin" />
            <p className="mt-4 font-black text-[#073B35]">
              Loading order chat...
            </p>
          </div>
        </section>
      )}

      {!loading && errorMessage && (
        <section className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white border border-red-200 rounded-[2rem] p-6 max-w-md w-full text-center shadow-xl shadow-[#073B35]/5">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center text-3xl">
              ⚠️
            </div>

            <h2 className="text-2xl font-black text-[#111827] mt-4">
              Chat unavailable
            </h2>

            <p className="text-red-600 text-sm mt-2">{errorMessage}</p>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-6 w-full bg-[#073B35] text-white font-black py-3 rounded-2xl active:scale-95"
            >
              Go Back
            </button>
          </div>
        </section>
      )}

      {!loading && !errorMessage && order && (
        <>
          <section className="max-w-3xl mx-auto w-full px-4 py-4">
            <div className="bg-white/90 border border-[#D7F5EF] rounded-[1.75rem] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#51615D]">
                    Order Summary
                  </p>

                  <h2 className="text-2xl font-black text-[#073B35] mt-1">
                    ₹{order.total_amount}
                  </h2>

                  <p className="text-xs text-[#51615D] mt-1 truncate">
                    {order.delivery_type || "Delivery"} •{" "}
                    {order.flat || "Address not available"}
                  </p>
                </div>

                <span className="shrink-0 text-xs font-black px-3 py-1.5 rounded-full bg-[#41D3BD]/12 text-[#073B35] border border-[#41D3BD]/25">
                  {String(order.status || "confirmed")}
                </span>
              </div>

              {orderItems.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {orderItems.map((item) => (
                    <div
                      key={`${item.id}-${item.name}`}
                      className="shrink-0 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl px-3 py-2"
                    >
                      <p className="text-xs font-black text-[#111827] max-w-[150px] truncate">
                        {item.name}
                      </p>

                      <p className="text-[11px] text-[#51615D] mt-0.5">
                        Qty {item.quantity || 1}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="flex-1 max-w-3xl mx-auto w-full px-4 pb-4">
            {messages.length === 0 ? (
              <div className="h-full min-h-[300px] flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#41D3BD]/12 flex items-center justify-center text-4xl">
                    💬
                  </div>

                  <h2 className="text-2xl font-black text-[#111827] mt-5">
                    Start order chat
                  </h2>

                  <p className="text-[#51615D] text-sm mt-2 leading-relaxed">
                    Use this chat only for this order. Do not share private
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
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-[1.4rem] px-4 py-3 shadow-sm ${
                          isMine
                            ? "bg-[#073B35] text-white rounded-br-md"
                            : "bg-white border border-[#D7F5EF] text-[#111827] rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.message}
                        </p>

                        <p
                          className={`text-[10px] mt-1 text-right ${
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

          <footer className="sticky bottom-0 z-40 bg-[#FFFFF2]/95 backdrop-blur-xl border-t border-[#D7F5EF]">
            <div className="max-w-3xl mx-auto px-4 pt-3 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-3">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => sendMessage(reply)}
                    disabled={sending}
                    className="shrink-0 bg-white border border-[#D7F5EF] text-[#073B35] font-black text-xs px-4 py-2.5 rounded-full active:scale-95 disabled:opacity-60"
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
                  className="flex-1 min-h-[52px] max-h-32 resize-none rounded-3xl border border-[#D7F5EF] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#41D3BD]/35"
                />

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={sending || !messageText.trim()}
                  className="w-14 h-14 rounded-2xl bg-[#073B35] text-white font-black text-xl shadow-lg shadow-[#073B35]/20 active:scale-95 disabled:opacity-50"
                >
                  ➤
                </button>
              </div>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
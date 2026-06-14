import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function SellerHelper() {
  const { user } = useAuth();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "👨‍🍳 Hi! I'm your Seller Assistant. Ask me about orders, earnings, visibility, stock, or kitchen settings.",
    },
  ]);

  const [sellerData, setSellerData] = useState(null);

  useEffect(() => {
    loadSellerData();
  }, [user]);

  async function loadSellerData() {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: foods } = await supabase
      .from("foods")
      .select("*")
      .eq("user_id", user.id);

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id);

    setSellerData({
      profile,
      foods: foods || [],
      orders: orders || [],
    });
  }

  function sendMessage() {
    if (!input.trim()) return;

    const question = input.toLowerCase();

    let answer =
      "I couldn't understand that. Try asking about orders, earnings, stock or visibility.";

    if (
      question.includes("order") &&
      question.includes("receive")
    ) {
      const activeFoods =
        sellerData?.foods?.filter((f) => Number(f.stock) > 0).length || 0;

      answer =
        `Kitchen Online: ${
          sellerData?.profile?.seller_online ? "Yes" : "No"
        }\n` +
        `Active Dishes: ${activeFoods}\n` +
        `Delivery: ${
          sellerData?.profile?.delivery_available ? "ON" : "OFF"
        }\n` +
        `Pickup: ${
          sellerData?.profile?.pickup_available ? "ON" : "OFF"
        }\n\n` +
        `These settings directly affect order volume.`;
    }

    if (
      question.includes("earn") ||
      question.includes("earning")
    ) {
      const completed =
        sellerData?.orders?.filter(
          (o) => o.status === "completed"
        ) || [];

      const total = completed.reduce(
        (sum, order) =>
          sum + Number(order.subtotal_amount || 0),
        0
      );

      answer =
        `Completed Orders: ${completed.length}\n` +
        `Total Earnings: ₹${total}`;
    }

    if (
      question.includes("visible") ||
      question.includes("food")
    ) {
      const soldOut =
        sellerData?.foods?.filter(
          (food) => Number(food.stock) <= 0
        ).length || 0;

      answer =
        `Total Dishes: ${sellerData?.foods?.length || 0}\n` +
        `Sold Out Dishes: ${soldOut}\n` +
        `Kitchen Status: ${
          sellerData?.profile?.seller_online
            ? "Online"
            : "Offline"
        }`;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", text: input },
      { role: "assistant", text: answer },
    ]);

    setInput("");
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] p-4">
        <div className="max-w-3xl mx-auto">

          <div className="bg-white rounded-3xl border border-[#D7F5EF] p-5">
            <h1 className="text-3xl font-black text-[#073B35]">
              Seller Assistant
            </h1>

            <p className="text-gray-500 mt-2">
              Smart helper for your kitchen.
            </p>
          </div>

          <div className="mt-4 bg-white rounded-3xl border border-[#D7F5EF] p-4 h-[500px] overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 ${
                  msg.role === "user"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                <div className="inline-block bg-[#F7FDFB] rounded-2xl px-4 py-3">
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about orders, stock, earnings..."
              className="flex-1 border rounded-2xl px-4 py-3"
            />

            <button
              onClick={sendMessage}
              className="bg-[#073B35] text-white px-6 rounded-2xl font-black"
            >
              Send
            </button>
          </div>

        </div>
      </main>
    </>
  );
}
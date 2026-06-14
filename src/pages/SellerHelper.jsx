import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const QUICK_PROMPTS = [
  "Why am I not receiving orders?",
  "Why is my food not visible?",
  "How much did I earn today?",
  "Which dishes need restocking?",
  "How can I improve sales?",
  "Check my kitchen settings",
];

export default function SellerHelper() {
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "👨‍🍳 Hi! I’m your Seller Assistant. I can check your orders, earnings, stock, food visibility, kitchen settings, and sales improvement opportunities.",
    },
  ]);

  const [sellerData, setSellerData] = useState({
    profile: null,
    foods: [],
    orders: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSellerData();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadSellerData() {
    if (!user) return;

    setLoading(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const { data: foods } = await supabase
      .from("foods")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id)
      .order("id", { ascending: false });

    setSellerData({
      profile,
      foods: foods || [],
      orders: orders || [],
    });

    setLoading(false);
  }

  const stats = useMemo(() => {
    const foods = sellerData.foods || [];
    const orders = sellerData.orders || [];
    const profile = sellerData.profile || {};

    const today = new Date().toDateString();

    const completedOrders = orders.filter(
      (order) => String(order.status || "").toLowerCase() === "completed"
    );

    const todayOrders = orders.filter((order) => {
      if (!order.created_at) return false;
      return new Date(order.created_at).toDateString() === today;
    });

    const todayCompletedOrders = completedOrders.filter((order) => {
      if (!order.created_at) return false;
      return new Date(order.created_at).toDateString() === today;
    });

    const activeOrders = orders.filter((order) => {
      const status = String(order.status || "").toLowerCase();
      const sellerResponse = String(order.seller_response || "").toLowerCase();

      return (
        status !== "completed" &&
        status !== "cancelled" &&
        sellerResponse !== "rejected"
      );
    });

    const activeFoods = foods.filter((food) => Number(food.stock || 0) > 0);
    const soldOutFoods = foods.filter((food) => Number(food.stock || 0) <= 0);
    const lowStockFoods = foods.filter((food) => {
      const stock = Number(food.stock || 0);
      return stock > 0 && stock <= 3;
    });

    const todayEarnings = todayCompletedOrders.reduce(
      (sum, order) => sum + Number(order.subtotal_amount || 0),
      0
    );

    const totalEarnings = completedOrders.reduce(
      (sum, order) => sum + Number(order.subtotal_amount || 0),
      0
    );

    const avgOrder =
      completedOrders.length > 0
        ? Math.round(totalEarnings / completedOrders.length)
        : 0;

    const itemSalesMap = {};

    completedOrders.forEach((order) => {
      const items = getOrderItems(order);

      items.forEach((item) => {
        const name = item.name || "Unknown item";
        const quantity = Number(item.quantity || 0);
        const revenue = Number(item.price || 0) * quantity;

        if (!itemSalesMap[name]) {
          itemSalesMap[name] = {
            name,
            quantity: 0,
            revenue: 0,
          };
        }

        itemSalesMap[name].quantity += quantity;
        itemSalesMap[name].revenue += revenue;
      });
    });

    const bestSellingItems = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    return {
      profile,
      foods,
      orders,
      completedOrders,
      todayOrders,
      activeOrders,
      activeFoods,
      soldOutFoods,
      lowStockFoods,
      todayEarnings,
      totalEarnings,
      avgOrder,
      bestSellingItems,
    };
  }, [sellerData]);

  function getOrderItems(order) {
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

  function addMessage(role, text) {
    setMessages((current) => [...current, { role, text }]);
  }

  function sendMessage(customText = "") {
    const userText = customText || input;

    if (!userText.trim()) return;

    const answer = generateAnswer(userText);

    addMessage("user", userText);
    addMessage("assistant", answer);

    setInput("");
  }

  function generateAnswer(text) {
    const question = text.toLowerCase();

    if (
      question.includes("not receiving") ||
      question.includes("no order") ||
      question.includes("orders low") ||
      question.includes("not getting order")
    ) {
      return diagnoseOrders();
    }

    if (
      question.includes("visible") ||
      question.includes("not showing") ||
      question.includes("food not") ||
      question.includes("dish not")
    ) {
      return diagnoseVisibility();
    }

    if (
      question.includes("earn") ||
      question.includes("earning") ||
      question.includes("sales") ||
      question.includes("income")
    ) {
      return getEarningsAnswer();
    }

    if (
      question.includes("stock") ||
      question.includes("restock") ||
      question.includes("sold out")
    ) {
      return getStockAnswer();
    }

    if (
      question.includes("improve") ||
      question.includes("more sales") ||
      question.includes("grow") ||
      question.includes("increase")
    ) {
      return getSalesImprovementAnswer();
    }

    if (
      question.includes("setting") ||
      question.includes("delivery") ||
      question.includes("pickup") ||
      question.includes("schedule") ||
      question.includes("packing")
    ) {
      return getSettingsAnswer();
    }

    if (
      question.includes("bank") ||
      question.includes("payout") ||
      question.includes("payment")
    ) {
      return getPayoutAnswer();
    }

    return getGeneralAnswer();
  }

  function diagnoseOrders() {
    const problems = [];

    if (stats.profile?.seller_online === false) {
      problems.push("Your kitchen is offline. Turn it online from Seller Dashboard.");
    }

    if (!stats.profile?.delivery_available && !stats.profile?.pickup_available) {
      problems.push("Both delivery and pickup are off. At least one must be ON.");
    }

    if (stats.foods.length === 0) {
      problems.push("You have not added any dishes yet.");
    }

    if (stats.activeFoods.length === 0 && stats.foods.length > 0) {
      problems.push("All your dishes are sold out. Restock at least 2–3 dishes.");
    }

    if (stats.lowStockFoods.length > 0) {
      problems.push(
        `${stats.lowStockFoods.length} dishes are low stock. Customers may avoid ordering if availability looks limited.`
      );
    }

    if (problems.length === 0) {
      problems.push(
        "Your core settings look okay. To improve orders, add better dish photos, keep stock above 5, add breakfast/snack items, and keep delivery ON."
      );
    }

    return `Order diagnosis:\n\n${problems
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n")}`;
  }

  function diagnoseVisibility() {
    return `Food visibility check:\n\nKitchen status: ${
      stats.profile?.seller_online === false ? "Offline" : "Online"
    }\nTotal dishes: ${stats.foods.length}\nVisible/active dishes: ${
      stats.activeFoods.length
    }\nSold out dishes: ${stats.soldOutFoods.length}\n\n${
      stats.activeFoods.length === 0
        ? "Main issue: No active stocked dishes. Add stock to make dishes visible."
        : "Your stocked dishes should be visible if your kitchen is online."
    }`;
  }

  function getEarningsAnswer() {
    return `Earnings summary:\n\nToday’s earnings: ₹${stats.todayEarnings}\nTotal earnings: ₹${stats.totalEarnings}\nCompleted orders: ${stats.completedOrders.length}\nToday’s orders: ${stats.todayOrders.length}\nAverage order value: ₹${stats.avgOrder}`;
  }

  function getStockAnswer() {
    if (stats.foods.length === 0) {
      return "You have not added dishes yet. Add at least 3 dishes before expecting orders.";
    }

    if (stats.lowStockFoods.length === 0 && stats.soldOutFoods.length === 0) {
      return "Stock looks healthy. Keep your best-selling items above 5 units during peak ordering time.";
    }

    return `Stock alert:\n\nLow stock dishes:\n${
      stats.lowStockFoods.length > 0
        ? stats.lowStockFoods
            .map((food) => `• ${food.name}: ${food.stock} left`)
            .join("\n")
        : "None"
    }\n\nSold out dishes:\n${
      stats.soldOutFoods.length > 0
        ? stats.soldOutFoods.map((food) => `• ${food.name}`).join("\n")
        : "None"
    }`;
  }

  function getSalesImprovementAnswer() {
    const suggestions = [];

    if (stats.profile?.seller_online === false) {
      suggestions.push("Turn kitchen online.");
    }

    if (!stats.profile?.delivery_available) {
      suggestions.push("Enable delivery if possible. It increases customer convenience.");
    }

    if (!stats.profile?.accept_scheduled_orders) {
      suggestions.push("Enable scheduled orders for breakfast/lunch planning.");
    }

    if (stats.foods.length < 3) {
      suggestions.push("Add at least 3–5 dishes so customers have choice.");
    }

    if (stats.soldOutFoods.length > 0) {
      suggestions.push("Restock sold-out dishes.");
    }

    if (stats.bestSellingItems.length > 0) {
      suggestions.push(
        `Promote your best seller: ${stats.bestSellingItems[0].name}.`
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Add sharper dish photos, write better descriptions, keep prices simple, and keep top dishes in stock during peak hours."
      );
    }

    return `Sales improvement plan:\n\n${suggestions
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n")}`;
  }

  function getSettingsAnswer() {
    return `Kitchen settings:\n\nKitchen online: ${
      stats.profile?.seller_online === false ? "OFF" : "ON"
    }\nDelivery: ${
      stats.profile?.delivery_available === false ? "OFF" : "ON"
    }\nSelf pickup: ${
      stats.profile?.pickup_available === false ? "OFF" : "ON"
    }\nScheduled orders: ${
      stats.profile?.accept_scheduled_orders === false ? "OFF" : "ON"
    }\nPacking charge: ₹${stats.profile?.packing_charge || 5}`;
  }

  function getPayoutAnswer() {
    const missing = [];

    if (!stats.profile?.bank_account_holder) missing.push("Account holder name");
    if (!stats.profile?.bank_name) missing.push("Bank name");
    if (!stats.profile?.bank_account_number) missing.push("Account number");
    if (!stats.profile?.bank_ifsc) missing.push("IFSC code");

    if (missing.length > 0) {
      return `Payout setup incomplete.\n\nMissing:\n${missing
        .map((item) => `• ${item}`)
        .join(
          "\n"
        )}\n\nGo to Profile → Payout Details and complete these fields.`;
    }

    return "Your payout details look complete. For settlement issues, contact Nefo owner/admin with your order IDs.";
  }

  function getGeneralAnswer() {
    return `I can help with:\n\n• Why orders are low\n• Why food is not visible\n• Today’s earnings\n• Stock/restocking\n• Delivery, pickup, packing settings\n• Payout/bank setup\n• Sales improvement tips\n\nTry: “Why am I not receiving orders?”`;
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-3 sm:px-6 py-4 sm:py-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <section className="relative overflow-hidden bg-[#073B35] rounded-[1.75rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl shadow-[#073B35]/20">
            <div className="absolute -top-20 -right-16 w-72 h-72 bg-[#41D3BD]/25 rounded-full blur-[85px]" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-[#41D3BD] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>👨‍🍳</span>
                  <span>Seller Help</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-white">
                  Your smart
                  <span className="block text-[#41D3BD]">kitchen assistant</span>
                </h1>

                <p className="text-[#D7F5EF] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Get live diagnostics on orders, earnings, visibility, stock,
                  payout setup, and kitchen settings.
                </p>
              </div>

              <Link
                to="/seller-dashboard"
                className="bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-5 py-3 rounded-2xl text-center"
              >
                Seller Dashboard
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
            <StatCard label="Dishes" value={stats.foods.length} />
            <StatCard label="Active" value={stats.activeFoods.length} />
            <StatCard label="Orders" value={stats.orders.length} />
            <StatCard label="Today" value={`₹${stats.todayEarnings}`} />
            <StatCard label="Low Stock" value={stats.lowStockFoods.length} />
          </section>

          <section className="mt-5 grid grid-cols-1 lg:grid-cols-[0.75fr_1.25fr] gap-5">
            <aside className="space-y-5 lg:sticky lg:top-24 h-fit">
              <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Quick Questions
                </p>

                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  Ask faster
                </h2>

                <div className="mt-5 grid gap-3">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="text-left bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 text-[#073B35] font-black rounded-2xl p-4 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Live Diagnosis
                </p>

                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  Kitchen health
                </h2>

                <div className="mt-5 space-y-3">
                  <HealthRow
                    label="Kitchen online"
                    active={stats.profile?.seller_online !== false}
                  />
                  <HealthRow
                    label="Delivery"
                    active={stats.profile?.delivery_available !== false}
                  />
                  <HealthRow
                    label="Self pickup"
                    active={stats.profile?.pickup_available !== false}
                  />
                  <HealthRow
                    label="Active dishes"
                    active={stats.activeFoods.length > 0}
                    value={stats.activeFoods.length}
                  />
                  <HealthRow
                    label="Bank details"
                    active={Boolean(
                      stats.profile?.bank_account_holder &&
                        stats.profile?.bank_name &&
                        stats.profile?.bank_account_number &&
                        stats.profile?.bank_ifsc
                    )}
                  />
                </div>
              </div>
            </aside>

            <section className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] overflow-hidden shadow-2xl shadow-[#073B35]/8">
              <div className="bg-[#073B35] p-4 sm:p-5 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#41D3BD] text-[#073B35] flex items-center justify-center text-2xl">
                    👨‍🍳
                  </div>

                  <div>
                    <p className="font-black text-xl">Seller Assistant</p>
                    <p className="text-[#D7F5EF] text-xs mt-0.5">
                      Smart diagnostics for your kitchen
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadSellerData}
                  className="hidden sm:block bg-white/10 hover:bg-white/15 text-white font-black px-4 py-2 rounded-2xl"
                >
                  Refresh
                </button>
              </div>

              <div className="bg-[#FFFFF2] p-3 sm:p-4">
                {loading && (
                  <div className="mb-3 bg-white border border-[#D7F5EF] rounded-2xl p-4 text-[#51615D] font-bold">
                    Loading seller data...
                  </div>
                )}

                <div className="bg-white border border-[#D7F5EF] rounded-3xl p-3 sm:p-4 h-[420px] overflow-y-auto space-y-3">
                  {messages.map((msg, index) => (
                    <div
                      key={`${msg.role}-${index}`}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === "user"
                            ? "bg-[#073B35] text-white rounded-br-md"
                            : "bg-[#FFFFF2] border border-[#D7F5EF] text-[#51615D] rounded-bl-md"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  <div ref={chatEndRef} />
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendMessage();
                    }}
                    placeholder="Ask about orders, stock, earnings, visibility..."
                    className="flex-1 bg-white border border-[#D7F5EF] rounded-2xl px-4 py-3 outline-none focus:border-[#41D3BD]"
                  />

                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    className="bg-[#073B35] hover:bg-[#0B5149] text-white px-5 sm:px-6 rounded-2xl font-black"
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-4 shadow-lg shadow-[#073B35]/5">
      <p className="text-[#51615D] text-xs font-black uppercase">{label}</p>
      <p className="text-[#073B35] text-2xl font-black mt-2">{value}</p>
    </div>
  );
}

function HealthRow({ label, active, value }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-3">
      <p className="text-[#51615D] text-sm font-bold">{label}</p>
      <p
        className={`text-sm font-black ${
          active ? "text-green-600" : "text-red-500"
        }`}
      >
        {value !== undefined ? value : active ? "OK" : "Fix"}
      </p>
    </div>
  );
}
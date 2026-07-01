import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const QUICK_ACTIONS = [
  {
    label: "Photo upload issue",
    icon: "📷",
    prompt: "I am having trouble uploading a food photo",
  },
  {
    label: "Dish not saving",
    icon: "🍽️",
    prompt: "My dish is not saving",
  },
  {
    label: "Food not visible",
    icon: "👀",
    prompt: "Why is my food not visible?",
  },
  {
    label: "Orders are low",
    icon: "📉",
    prompt: "Why am I not receiving orders?",
  },
  {
    label: "Stock help",
    icon: "📦",
    prompt: "Which dishes need restocking?",
  },
  {
    label: "Earnings",
    icon: "₹",
    prompt: "How much did I earn today?",
  },
  {
    label: "Bank / payout",
    icon: "🏦",
    prompt: "Check my payout setup",
  },
  {
    label: "Dashboard issue",
    icon: "⚙️",
    prompt: "I am facing a problem in seller dashboard",
  },
];

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

export default function SellerHelper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "👨‍🍳 Hi! I’m Nefo AI Seller Assistant. I can check your live seller data, dishes, stock, orders, payout setup, kitchen visibility, and dashboard issues.",
    },
  ]);

  const [sellerData, setSellerData] = useState({
    profile: null,
    foods: [],
    orders: [],
  });

  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);
  const [sellerDataError, setSellerDataError] = useState("");
  const [aiErrorMessage, setAiErrorMessage] = useState("");

  useEffect(() => {
    loadSellerData();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiThinking]);

  async function loadSellerData() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSellerDataError("");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const { data: foods, error: foodsError } = await supabase
      .from("foods")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_id", user.id)
      .order("id", { ascending: false });

    if (profileError || foodsError || ordersError) {
      setSellerDataError(
        profileError?.message || foodsError?.message || ordersError?.message
      );
    }

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
          itemSalesMap[name] = { name, quantity: 0, revenue: 0 };
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

  function getAiHistory() {
    return messages
      .slice(-8)
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.text,
      }))
      .filter((message) => message.content?.trim());
  }

  async function askSellerAi(customText = "") {
    if (!user) {
      alert("Please login before using Seller Assistant.");
      return;
    }

    const userText = String(customText || input || "").trim();

    if (!userText) return;

    setInput("");
    setAiErrorMessage("");
    setAiThinking(true);
    addMessage("user", userText);

    try {
      const { data, error } = await supabase.functions.invoke("nefo-ai-agent", {
        body: {
          role: "seller",
          message: userText,
          history: getAiHistory(),
        },
      });

      if (error) {
        let detailedMessage =
          error.message ||
          "Nefo AI Seller Assistant is not available right now.";

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

        const fallback = generateLocalFallbackAnswer(userText);

        addMessage("assistant", `${fallback}\n\nAI note: ${detailedMessage}`);
        setAiErrorMessage(detailedMessage);
        setAiThinking(false);
        return;
      }

      if (data?.error) {
        const detailedMessage =
          data.details || data.error || "Nefo AI returned an error.";

        const fallback = generateLocalFallbackAnswer(userText);

        addMessage(
          "assistant",
          `${fallback}\n\nAI note: ${String(detailedMessage)}`
        );

        setAiErrorMessage(String(detailedMessage));
        setAiThinking(false);
        return;
      }

      addMessage(
        "assistant",
        data?.reply ||
          "I could not generate a clear answer. Please ask again with more details."
      );
    } catch (error) {
      const detailedMessage =
        error?.message || "Could not connect to Nefo AI Seller Assistant.";

      const fallback = generateLocalFallbackAnswer(userText);

      addMessage("assistant", `${fallback}\n\nAI note: ${detailedMessage}`);
      setAiErrorMessage(detailedMessage);
    }

    setAiThinking(false);
  }

  function generateLocalFallbackAnswer(text) {
    const question = text.toLowerCase().trim();

    if (detectPhotoUploadIssue(question)) {
      return `Photo upload check:

1. Use JPG, PNG, or WEBP only.
2. Try a smaller image below 3 MB.
3. Check camera/gallery permission.
4. Refresh the app.
5. Try Upload from gallery instead of Camera.

If it still fails, send Nefo support your phone model and screenshot.`;
    }

    if (detectDishSaveIssue(question)) {
      return `Dish saving check:

1. Fill dish name, price, stock, kitchen name, ready time, and category.
2. Add a valid food photo.
3. Make sure price and stock are numbers.
4. Refresh and try again.
5. If image uploads but dish does not save, try a smaller image.

If the same issue continues, send Nefo support a screenshot of the filled dish form.`;
    }

    if (detectDashboardIssue(question)) {
      return `Seller dashboard check:

1. Refresh the app.
2. Logout and login again.
3. Confirm your seller account is approved.
4. Check internet connection.
5. If the app looks old, rebuild and reinstall the Android APK.`;
    }

    if (detectOrderLowIssue(question)) return diagnoseOrders();
    if (detectVisibilityIssue(question)) return diagnoseVisibility();
    if (detectEarningsIssue(question)) return getEarningsAnswer();
    if (detectStockIssue(question)) return getStockAnswer();
    if (detectSalesIssue(question)) return getSalesImprovementAnswer();
    if (detectSettingsIssue(question)) return getSettingsAnswer();
    if (detectPayoutIssue(question)) return getPayoutAnswer();

    return getGeneralAnswer();
  }

  function detectPhotoUploadIssue(question) {
    return (
      question.includes("photo") ||
      question.includes("picture") ||
      question.includes("image") ||
      question.includes("upload") ||
      question.includes("camera") ||
      question.includes("gallery")
    );
  }

  function detectDishSaveIssue(question) {
    return (
      question.includes("dish not saving") ||
      question.includes("food not saving") ||
      question.includes("add dish") ||
      question.includes("save dish") ||
      question.includes("not save") ||
      question.includes("does not save")
    );
  }

  function detectDashboardIssue(question) {
    return (
      question.includes("dashboard") ||
      question.includes("blank") ||
      question.includes("button") ||
      question.includes("not working") ||
      question.includes("page") ||
      question.includes("old") ||
      question.includes("changes missing") ||
      question.includes("not updating")
    );
  }

  function detectOrderLowIssue(question) {
    return (
      question.includes("not receiving") ||
      question.includes("no order") ||
      question.includes("orders low") ||
      question.includes("not getting order") ||
      question.includes("no sales") ||
      question.includes("no customer")
    );
  }

  function detectVisibilityIssue(question) {
    return (
      question.includes("visible") ||
      question.includes("not showing") ||
      question.includes("food not") ||
      question.includes("dish not") ||
      question.includes("marketplace")
    );
  }

  function detectEarningsIssue(question) {
    return (
      question.includes("earn") ||
      question.includes("earning") ||
      question.includes("income") ||
      question.includes("revenue") ||
      question.includes("money")
    );
  }

  function detectStockIssue(question) {
    return (
      question.includes("stock") ||
      question.includes("restock") ||
      question.includes("sold out") ||
      question.includes("quantity")
    );
  }

  function detectSalesIssue(question) {
    return (
      question.includes("improve") ||
      question.includes("more sales") ||
      question.includes("grow") ||
      question.includes("increase") ||
      question.includes("boost") ||
      question.includes("promote")
    );
  }

  function detectSettingsIssue(question) {
    return (
      question.includes("setting") ||
      question.includes("delivery") ||
      question.includes("pickup") ||
      question.includes("schedule") ||
      question.includes("packing") ||
      question.includes("online") ||
      question.includes("offline")
    );
  }

  function detectPayoutIssue(question) {
    return (
      question.includes("bank") ||
      question.includes("payout") ||
      question.includes("settlement") ||
      question.includes("account number") ||
      question.includes("ifsc") ||
      question.includes("upi")
    );
  }

  function diagnoseOrders() {
    const problems = [];

    if (stats.profile?.seller_online === false) {
      problems.push(
        "Your kitchen is offline. Turn it online from Seller Dashboard."
      );
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
        "Your core settings look okay. Improve orders by adding better dish photos, keeping stock above 5, adding breakfast/snack items, and keeping delivery ON."
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
        : "Your stocked dishes should be visible if your kitchen is online and delivery/pickup is enabled."
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
    return `I can help with:

• Food photo upload issues
• Dish saving problems
• Seller dashboard problems
• Why orders are low
• Why food is not visible
• Today’s earnings
• Stock/restocking
• Delivery, pickup, packing settings
• Payout/bank setup
• Sales improvement tips

Try: “Why is my food not visible?”`;
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
              👨‍🍳
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#181411]">
              Sign in as seller
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Seller Assistant is available only for approved seller accounts.
            </p>

            <Link
              to="/seller-login"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white"
            >
              Seller Login
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
              Nefo AI Seller
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Smart seller
              <span className="block text-[#181411]">assistant</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              AI help for uploads, orders, visibility, payout, stock, and
              dashboard issues.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Dishes" value={stats.foods.length} />
          <StatCard label="Active" value={stats.activeFoods.length} />
          <StatCard label="Today" value={`₹${stats.todayEarnings}`} strong />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Orders" value={stats.orders.length} />
          <StatCard label="Low Stock" value={stats.lowStockFoods.length} muted />
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Kitchen Health
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#181411]">
                Live checks
              </h2>
            </div>

            <button
              type="button"
              onClick={loadSellerData}
              className="shrink-0 rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {sellerDataError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-600">
                  Kitchen health could not load completely.
                </p>

                <p className="mt-1 text-xs font-semibold text-red-500">
                  {sellerDataError}
                </p>
              </div>
            ) : null}

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
        </section>

        <section className={`mt-5 p-5 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Quick Help
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#181411]">
            Common seller issues
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => askSellerAi(item.prompt)}
                disabled={aiThinking}
                className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-left text-[#3F5128] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <div className="text-2xl">{item.icon}</div>

                <p className="mt-2 text-sm font-black leading-tight">
                  {item.label}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className={`mt-5 overflow-hidden ${CARD}`}>
          <div className="border-b border-[#4D612F] bg-[#3F5128] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#CF743D] bg-[#CF743D] text-2xl text-white">
                🤖
              </div>

              <div className="min-w-0">
                <p className="text-xl font-black">Nefo AI Seller</p>

                <p className="mt-0.5 text-xs font-semibold text-white/70">
                  Live support for kitchen operations
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFDF7] p-4">
            {loading ? (
              <div className="mb-3 rounded-2xl border border-[#D8C9B3] bg-white p-4 font-bold text-[#6B6258]">
                Loading seller data...
              </div>
            ) : null}

            {aiErrorMessage ? (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-600">
                  Nefo AI could not reply.
                </p>

                <p className="mt-1 text-xs font-semibold text-red-500">
                  {aiErrorMessage}
                </p>
              </div>
            ) : null}

            <div className="h-[420px] space-y-3 overflow-y-auto rounded-3xl border border-[#D8C9B3] bg-white p-3">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] whitespace-pre-line rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-br-md border-[#3F5128] bg-[#3F5128] text-white"
                        : "rounded-bl-md border-[#D8C9B3] bg-[#FFF8EC] text-[#6B6258]"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {aiThinking ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-[#D8C9B3] bg-[#FFF8EC] px-4 py-3 text-sm font-black text-[#3F5128]">
                    Finding the best fix...
                  </div>
                </div>
              ) : null}

              <div ref={chatEndRef} />
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !aiThinking) askSellerAi();
                }}
                placeholder="Ask about orders, stock, payout..."
                className={INPUT}
              />

              <button
                type="button"
                onClick={() => askSellerAi()}
                disabled={aiThinking || !input.trim()}
                className="shrink-0 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-5 font-black text-white active:scale-95 disabled:opacity-50"
              >
                {aiThinking ? "..." : "Send"}
              </button>
            </div>
          </div>
        </section>

        <Link
          to="/seller-dashboard"
          className="mt-5 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-95"
        >
          Back to Seller Dashboard
        </Link>
      </div>
    </main>
  );
}

function StatCard({ label, value, strong = false, muted = false }) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#6B6258]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          muted ? "text-[#9A8E80]" : strong ? "text-[#3F5128]" : "text-[#181411]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function HealthRow({ label, active, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-3">
      <p className="text-sm font-bold text-[#6B6258]">{label}</p>

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
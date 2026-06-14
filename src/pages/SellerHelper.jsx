import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const QUICK_ACTIONS = [
  {
    label: "Photo upload issue",
    icon: "📷",
    prompt: "I am having trouble uploading a food photo",
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
  {
    label: "Improve sales",
    icon: "🚀",
    prompt: "How can I improve sales?",
  },
];

export default function SellerHelper() {
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  const [input, setInput] = useState("");
  const [conversationState, setConversationState] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "👨‍🍳 Hi! I’m your Seller Assistant. Tell me what problem you are facing. I can help with food photo upload, dashboard issues, orders, stock, earnings, payouts, visibility, and sales improvement.",
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
    const question = text.toLowerCase().trim();

    if (conversationState?.type === "photo_upload_followup") {
      return handlePhotoUploadFollowup(question);
    }

    if (conversationState?.type === "dashboard_followup") {
      return handleDashboardFollowup(question);
    }

    if (detectPhotoUploadIssue(question)) {
      setConversationState({ type: "photo_upload_followup" });

      return `I can help with food photo upload.

What exactly happens when you upload?

1. Nothing happens after selecting image
2. Upload keeps loading
3. Error message appears
4. Image uploads but dish does not save
5. Image preview shows but final upload fails

Reply with 1, 2, 3, 4, or 5.`;
    }

    if (detectDashboardIssue(question)) {
      setConversationState({ type: "dashboard_followup" });

      return `I can help with seller dashboard issues.

What problem are you facing?

1. Page is blank
2. Dish is not saving
3. Orders are not showing
4. Buttons are not working
5. Settings are not updating
6. Something else

Reply with 1, 2, 3, 4, 5, or describe the issue.`;
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

  function detectDashboardIssue(question) {
    return (
      question.includes("dashboard") ||
      question.includes("blank") ||
      question.includes("button") ||
      question.includes("not working") ||
      question.includes("page") ||
      question.includes("save") ||
      question.includes("saving") ||
      question.includes("error")
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
      question.includes("revenue")
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

  function handlePhotoUploadFollowup(answer) {
    if (answer === "1" || answer.includes("nothing")) {
      return `If nothing happens after selecting an image:

1. Try the Upload button instead of Camera.
2. Use JPG, PNG, or WEBP only.
3. Close and reopen the page.
4. Check whether browser permission for camera/photos is blocked.
5. Try a smaller image.

If this still happens, tell me your phone model and whether you used Camera or Upload.`;
    }

    if (answer === "2" || answer.includes("loading")) {
      return `If upload keeps loading, the common causes are:

1. Weak internet connection.
2. Image file is too large.
3. Supabase storage upload is blocked.
4. The food-images bucket policy may be incorrect.
5. The app session may have expired.

Try this:
• Use a JPG image below 3 MB.
• Refresh the app.
• Login again.
• Try gallery upload instead of camera.

If it still fails, owner/admin should check Supabase Storage → food-images bucket policies.`;
    }

    if (answer === "3" || answer.includes("error")) {
      return `If an error appears:

Please copy the exact error message.

Most common fixes:
1. "Bucket not found" → food-images bucket missing.
2. "Permission denied" → storage policy issue.
3. "Payload too large" → image too big.
4. "Network error" → internet or upload timeout.

Send me the exact error text and I’ll tell the next fix.`;
    }

    if (answer === "4" || answer.includes("does not save")) {
      return `If image uploads but dish does not save:

Check these fields:
1. Dish name
2. Price
3. Kitchen name
4. Ready time
5. Stock
6. Image

The seller dashboard requires all these before saving.

If all are filled and it still fails, the issue may be in the foods table insert or image URL save.`;
    }

    if (answer === "5" || answer.includes("preview")) {
      return `If preview shows but final upload fails:

That means the phone selected the image correctly, but upload/save failed.

Likely causes:
1. Storage upload failed.
2. Food table insert failed.
3. Internet interrupted.
4. Image file too large.

Try smaller JPG below 3 MB first.`;
    }

    return `For photo upload issues, tell me which case matches:

1. Nothing happens
2. Upload keeps loading
3. Error appears
4. Upload works but dish does not save
5. Preview shows but final upload fails`;
  }

  function handleDashboardFollowup(answer) {
    if (answer === "1" || answer.includes("blank")) {
      return `Blank dashboard usually means a React error or missing data.

Try:
1. Refresh the page.
2. Logout and login again.
3. Open browser console and check red error.
4. Confirm seller profile is approved.
5. Confirm required profile fields exist.

If you send the exact red error, I can identify the file.`;
    }

    if (answer === "2" || answer.includes("not saving")) {
      return `If dish is not saving:

Check:
1. Dish image uploaded.
2. Dish name filled.
3. Price filled.
4. Stock filled.
5. Kitchen name filled.
6. Ready time filled.

If all fields are filled, likely issue is:
• Supabase foods insert policy
• food-images storage policy
• Image upload failed before food insert`;
    }

    if (answer === "3" || answer.includes("orders")) {
      return `If orders are not showing:

Check:
1. Is the order seller_id equal to your seller user id?
2. Is your kitchen online?
3. Did customer complete checkout?
4. Is seller_response rejected?
5. Is status completed/cancelled?

Seller dashboard only shows orders linked to your seller_id.`;
    }

    if (answer === "4" || answer.includes("button")) {
      return `If dashboard buttons are not working:

Try:
1. Refresh page.
2. Check internet.
3. Check if you are logged in as seller.
4. Check if browser console shows an error.
5. Try again after logout/login.

If one specific button fails, tell me button name.`;
    }

    if (answer === "5" || answer.includes("setting")) {
      return `If settings are not updating:

Possible causes:
1. profiles table update policy issue.
2. User id does not match profile id.
3. Internet request failed.
4. Seller profile was not loaded.

Try changing one setting and check if a message appears below the hero section.`;
    }

    return `Tell me which dashboard issue you mean:

1. Page is blank
2. Dish is not saving
3. Orders are not showing
4. Buttons are not working
5. Settings are not updating`;
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
    return `I can help with:\n\n• Food photo upload issues\n• Seller dashboard problems\n• Why orders are low\n• Why food is not visible\n• Today’s earnings\n• Stock/restocking\n• Delivery, pickup, packing settings\n• Payout/bank setup\n• Sales improvement tips\n\nTry: “Food image is not uploading.”`;
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
                  Get help with upload issues, dashboard problems, orders,
                  stock, visibility, earnings, payouts, and sales.
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

          <section className="mt-5 grid grid-cols-1 lg:grid-cols-[0.78fr_1.22fr] gap-5">
            <aside className="space-y-5 lg:sticky lg:top-24 h-fit order-2 lg:order-1">
              <div className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
                <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                  Quick Help
                </p>

                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  Common seller issues
                </h2>

                <div className="mt-5 grid grid-cols-2 lg:grid-cols-1 gap-3">
                  {QUICK_ACTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      className="text-left bg-[#FFFFF2] border border-[#D7F5EF] hover:border-[#41D3BD]/60 text-[#073B35] rounded-2xl p-4 transition-all active:scale-[0.98]"
                    >
                      <div className="text-2xl">{item.icon}</div>
                      <p className="font-black text-sm mt-2 leading-tight">
                        {item.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden lg:block bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] p-4 sm:p-5 shadow-xl shadow-[#073B35]/5">
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

            <section className="bg-white/95 border border-[#D7F5EF] rounded-[1.75rem] overflow-hidden shadow-2xl shadow-[#073B35]/8 order-1 lg:order-2">
              <div className="bg-[#073B35] p-4 sm:p-5 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#41D3BD] text-[#073B35] flex items-center justify-center text-2xl">
                    👨‍🍳
                  </div>

                  <div>
                    <p className="font-black text-xl">Seller Assistant</p>
                    <p className="text-[#D7F5EF] text-xs mt-0.5">
                      Support agent for kitchen issues
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

                <div className="bg-white border border-[#D7F5EF] rounded-3xl p-3 sm:p-4 h-[430px] sm:h-[520px] overflow-y-auto space-y-3">
                  {messages.map((msg, index) => (
                    <div
                      key={`${msg.role}-${index}`}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
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
                    placeholder="Type seller issue..."
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
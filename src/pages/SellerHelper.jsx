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

export default function SellerHelper() {
  const { user } = useAuth();
  const chatEndRef = useRef(null);

  const [input, setInput] = useState("");
  const [conversationState, setConversationState] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "👨‍🍳 Hi! I’m your Seller Assistant. Tell me what problem you are facing. I can help with photo upload, dish saving, orders, stock, earnings, payout setup, visibility, and dashboard issues.",
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

    if (conversationState?.type === "dish_save_followup") {
      return handleDishSaveFollowup(question);
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
4. Image preview shows but final upload fails
5. Camera does not open

Reply with 1, 2, 3, 4, or 5.`;
    }

    if (detectDishSaveIssue(question)) {
      setConversationState({ type: "dish_save_followup" });

      return `I can help with dish saving.

What exactly happens?

1. Add Dish button does nothing
2. It keeps loading
3. A message/error appears
4. Photo uploads but dish does not save
5. Dish saves but does not appear in marketplace

Reply with 1, 2, 3, 4, or 5.`;
    }

    if (detectDashboardIssue(question)) {
      setConversationState({ type: "dashboard_followup" });

      return `I can help with seller dashboard issues.

What problem are you facing?

1. Page is blank
2. Orders are not showing
3. Buttons are not working
4. Settings are not updating
5. Page looks old or changes are missing

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

1. Try Upload instead of Camera.
2. Use JPG, PNG, or WEBP only.
3. Close and reopen the app.
4. Check photo/gallery permission.
5. Try a smaller image.

If it still happens, tell Nefo support your phone model and whether you used Camera or Upload.`;
    }

    if (answer === "2" || answer.includes("loading")) {
      return `If upload keeps loading:

1. Check your internet connection.
2. Try a JPG image below 3 MB.
3. Refresh the app.
4. Login again.
5. Try Upload from gallery instead of Camera.

If it still keeps loading, contact Nefo support and share a screenshot.`;
    }

    if (answer === "3" || answer.includes("error")) {
      return `If an error appears:

Please copy or screenshot the exact error.

Quick fixes:
1. Use JPG, PNG, or WEBP only.
2. Keep image size below 3 MB.
3. Refresh the app.
4. Login again.
5. Try a different photo.

If the same error continues, send the screenshot to Nefo support.`;
    }

    if (answer === "4" || answer.includes("preview")) {
      return `If preview shows but final upload fails:

The phone selected the image correctly, but final save did not complete.

Try this:
1. Use a JPG image below 3 MB.
2. Check internet connection.
3. Refresh the app.
4. Login again.
5. Try another photo.

If it still fails, contact Nefo support with a screenshot.`;
    }

    if (answer === "5" || answer.includes("camera")) {
      return `If camera does not open:

1. Check camera permission for the app/browser.
2. Try Upload from gallery instead.
3. Restart the app.
4. Try taking the photo separately and uploading from gallery.
5. Make sure your browser/app has camera access enabled.

If it still fails, use gallery upload for now.`;
    }

    return `For photo upload issues, tell me which case matches:

1. Nothing happens
2. Upload keeps loading
3. Error appears
4. Preview shows but final upload fails
5. Camera does not open`;
  }

  function handleDishSaveFollowup(answer) {
    if (answer === "1" || answer.includes("nothing")) {
      return `If Add Dish button does nothing:

1. Check all required fields are filled.
2. Add a dish photo.
3. Check price and stock are numbers.
4. Refresh the app.
5. Try again after login.

Required fields:
• Dish name
• Price
• Stock
• Kitchen name
• Ready time
• Photo`;
    }

    if (answer === "2" || answer.includes("loading")) {
      return `If dish keeps loading while saving:

1. Check internet connection.
2. Use a smaller food photo.
3. Refresh and try again.
4. Logout and login again.
5. Avoid tapping Add Dish multiple times.

If it keeps loading every time, send Nefo support a screenshot.`;
    }

    if (answer === "3" || answer.includes("error")) {
      return `If a message/error appears:

Please screenshot or copy the exact message.

Basic fixes:
1. Fill every required field.
2. Use JPG/PNG/WEBP image.
3. Keep image below 3 MB.
4. Check internet.
5. Try again after refreshing.`;
    }

    if (answer === "4" || answer.includes("photo")) {
      return `If photo uploads but dish does not save:

Check these fields:
1. Dish name
2. Price
3. Kitchen name
4. Ready time
5. Stock
6. Category

Then tap Add Dish again.

If it still does not save, send Nefo support a screenshot of the filled dish form.`;
    }

    if (answer === "5" || answer.includes("marketplace")) {
      return `If dish saves but does not appear in marketplace:

Check:
1. Kitchen is Online.
2. Dish stock is more than 0.
3. Dish image is visible.
4. Seller account is approved.
5. Refresh marketplace.

If stock is 0, customers will see it as unavailable or sold out.`;
    }

    return `For dish saving issues, tell me which case matches:

1. Add Dish button does nothing
2. It keeps loading
3. Error appears
4. Photo uploads but dish does not save
5. Dish saves but does not appear in marketplace`;
  }

  function handleDashboardFollowup(answer) {
    if (answer === "1" || answer.includes("blank")) {
      return `If the seller dashboard is blank:

1. Refresh the app.
2. Logout and login again.
3. Check your internet connection.
4. Make sure your seller account is approved.
5. Try opening again after a few minutes.

If it still shows blank, send Nefo support a screenshot.`;
    }

    if (answer === "2" || answer.includes("orders")) {
      return `If orders are not showing:

1. Check if your kitchen is Online.
2. Check if your dishes are in stock.
3. Refresh Seller Dashboard.
4. Logout and login again.
5. Ask customer to confirm their order was placed.

If an order is still missing, contact Nefo support with customer name or order number.`;
    }

    if (answer === "3" || answer.includes("button")) {
      return `If buttons are not working:

1. Refresh the app.
2. Check your internet.
3. Logout and login again.
4. Try again after a few seconds.
5. Tell Nefo support which button is failing.

Example: Accept Order, Add Dish, Save Profile, Complete Order.`;
    }

    if (answer === "4" || answer.includes("setting")) {
      return `If settings are not updating:

1. Change one setting at a time.
2. Wait for confirmation message.
3. Refresh Seller Dashboard.
4. Check if the setting stayed updated.
5. Logout and login again.

If it still fails, send Nefo support a screenshot.`;
    }

    if (answer === "5" || answer.includes("old") || answer.includes("missing")) {
      return `If changes are missing or the page looks old:

1. Refresh the app.
2. Close and reopen the app.
3. Clear browser cache if using web.
4. If using Android APK, rebuild and reinstall the APK.
5. Confirm you are opening the latest app version.

This usually happens when the website is updated but the Android app has not been synced/rebuilt.`;
    }

    return `Tell me which dashboard issue you mean:

1. Page is blank
2. Orders are not showing
3. Buttons are not working
4. Settings are not updating
5. Page looks old or changes are missing`;
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
    return `I can help with:\n\n• Food photo upload issues\n• Dish saving problems\n• Seller dashboard problems\n• Why orders are low\n• Why food is not visible\n• Today’s earnings\n• Stock/restocking\n• Delivery, pickup, packing settings\n• Payout/bank setup\n• Sales improvement tips\n\nTry: “Food image is not uploading.”`;
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
                  Smart seller
                  <span className="block text-[#41D3BD]">assistant</span>
                </h1>

                <p className="text-[#D7F5EF] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Get step-by-step help for seller issues, uploads, orders,
                  visibility, payouts, stock, and dashboard problems.
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
                  Kitchen Health
                </p>

                <h2 className="text-2xl font-black text-[#111827] mt-1">
                  Live checks
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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const QUICK_ACTIONS = [
  {
    label: "Photo upload issue",
    icon: "📷",
    prompt:
      "I am having trouble uploading a food photo",
  },
  {
    label: "Dish not saving",
    icon: "🍽️",
    prompt: "My dish is not saving",
  },
  {
    label: "Food not visible",
    icon: "👀",
    prompt:
      "Why is my food not visible?",
  },
  {
    label: "Orders are low",
    icon: "📉",
    prompt:
      "Why am I not receiving orders?",
  },
  {
    label: "Stock help",
    icon: "📦",
    prompt:
      "Which dishes need restocking?",
  },
  {
    label: "Earnings",
    icon: "₹",
    prompt:
      "How much did I earn today?",
  },
  {
    label: "Bank / payout",
    icon: "🏦",
    prompt: "Check my payout setup",
  },
  {
    label: "Dashboard issue",
    icon: "⚙️",
    prompt:
      "I am facing a problem in seller dashboard",
  },
  {
    label: "Order help",
    icon: "🛎️",
    prompt:
      "How do I manage my active orders?",
  },
  {
    label: "Customer chats",
    icon: "💬",
    prompt:
      "How do I find and reply to customer messages?",
  },
  {
    label: "Scheduled orders",
    icon: "🕒",
    prompt:
      "How do scheduled orders work for my kitchen?",
  },
  {
    label: "Profile photo",
    icon: "👤",
    prompt:
      "Why is my seller profile photo not showing?",
  },
];

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white";

const LOW_STOCK_LIMIT = 3;
const UNLIMITED_STOCK = 999999;
const MAX_AI_MENU_ITEMS = 60;
const MAX_AI_RECENT_ORDERS = 25;
const SELLER_AI_FUNCTION = "nefo-ai-agent";

function getOrderItems(order) {
  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (typeof order?.items === "string") {
    try {
      const parsedItems = JSON.parse(
        order.items
      );

      return Array.isArray(parsedItems)
        ? parsedItems
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function buildSellerStats(sellerData) {
  const foods =
    sellerData?.foods || [];

  const orders =
    sellerData?.orders || [];

  const profile =
    sellerData?.profile || {};

  const today =
    new Date().toDateString();

  const completedOrders =
    orders.filter((order) => {
      const status = String(
        order.status || ""
      ).toLowerCase();

      const sellerResponse =
        String(
          order.seller_response ||
            ""
        ).toLowerCase();

      return (
        status === "completed" &&
        sellerResponse !== "rejected"
      );
    });

  const todayOrders =
    orders.filter((order) => {
      if (!order.created_at) {
        return false;
      }

      return (
        new Date(
          order.created_at
        ).toDateString() === today
      );
    });

  const todayCompletedOrders =
    completedOrders.filter(
      (order) => {
        if (!order.created_at) {
          return false;
        }

        return (
          new Date(
            order.created_at
          ).toDateString() ===
          today
        );
      }
    );

  const activeOrders =
    orders.filter((order) => {
      const status = String(
        order.status || ""
      ).toLowerCase();

      const sellerResponse =
        String(
          order.seller_response ||
            ""
        ).toLowerCase();

      return (
        status !== "completed" &&
        status !== "cancelled" &&
        sellerResponse !== "rejected"
      );
    });

  const pendingOrders =
    activeOrders.filter(
      (order) => {
        return (
          String(
            order.seller_response ||
              "pending"
          ).toLowerCase() ===
          "pending"
        );
      }
    );

  const activeFoods =
    foods.filter((food) => {
      return (
        Number(food.stock || 0) >
        0
      );
    });

  const soldOutFoods =
    foods.filter((food) => {
      return (
        Number(food.stock || 0) <=
        0
      );
    });

  const lowStockFoods =
    foods.filter((food) => {
      const stock = Number(
        food.stock || 0
      );

      return (
        stock > 0 &&
        stock <= LOW_STOCK_LIMIT
      );
    });

  const todayEarnings =
    todayCompletedOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.seller_amount ||
            order.subtotal_amount ||
            order.total_amount ||
            0
        ),
      0
    );

  const totalEarnings =
    completedOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.seller_amount ||
            order.subtotal_amount ||
            order.total_amount ||
            0
        ),
      0
    );

  const averageOrder =
    completedOrders.length > 0
      ? Math.round(
          totalEarnings /
            completedOrders.length
        )
      : 0;

  const itemSalesMap = {};

  completedOrders.forEach(
    (order) => {
      const items =
        getOrderItems(order);

      items.forEach((item) => {
        const name =
          item.name ||
          "Unknown item";

        const quantity = Number(
          item.quantity || 0
        );

        const revenue =
          Number(item.price || 0) *
          quantity;

        if (!itemSalesMap[name]) {
          itemSalesMap[name] = {
            name,
            quantity: 0,
            revenue: 0,
          };
        }

        itemSalesMap[
          name
        ].quantity += quantity;

        itemSalesMap[
          name
        ].revenue += revenue;
      });
    }
  );

  const bestSellingItems =
    Object.values(itemSalesMap)
      .sort(
        (first, second) =>
          second.quantity -
          first.quantity
      )
      .slice(0, 5);

  return {
    profile,
    foods,
    orders,
    completedOrders,
    todayOrders,
    activeOrders,
    pendingOrders,
    activeFoods,
    soldOutFoods,
    lowStockFoods,
    todayEarnings,
    totalEarnings,
    averageOrder,
    bestSellingItems,
  };
}

function getBankDetailsComplete(
  profile
) {
  if (
    profile?.bank_details_completed ===
    true
  ) {
    return true;
  }

  return Boolean(
    profile?.bank_account_holder &&
      profile?.bank_name &&
      profile?.bank_account_number &&
      profile?.bank_ifsc
  );
}

function buildSafeSellerContext(
  stats
) {
  return {
    generated_at:
      new Date().toISOString(),

    kitchen: {
      name:
        stats.profile
          ?.seller_kitchen_name ||
        stats.profile?.full_name ||
        "Kitchen",

      online:
        stats.profile
          ?.seller_online !== false,

      delivery_available:
        stats.profile
          ?.delivery_available !==
        false,

      pickup_available:
        stats.profile
          ?.pickup_available !==
        false,

      scheduled_orders:
        stats.profile
          ?.accept_scheduled_orders !==
        false,

      packing_charge: Number(
        stats.profile
          ?.packing_charge || 5
      ),

      payout_setup_complete:
        getBankDetailsComplete(
          stats.profile
        ),
    },

    summary: {
      total_dishes:
        stats.foods.length,

      active_dishes:
        stats.activeFoods.length,

      low_stock_dishes:
        stats.lowStockFoods.length,

      sold_out_dishes:
        stats.soldOutFoods.length,

      total_orders:
        stats.orders.length,

      active_orders:
        stats.activeOrders.length,

      pending_orders:
        stats.pendingOrders.length,

      completed_orders:
        stats.completedOrders.length,

      today_orders:
        stats.todayOrders.length,

      today_earnings:
        stats.todayEarnings,

      total_earnings:
        stats.totalEarnings,

      average_order_value:
        stats.averageOrder,
    },

    menu: stats.foods
      .slice(0, MAX_AI_MENU_ITEMS)
      .map((food) => ({
        id: food.id,
        name: food.name,
        category:
          food.category || "",
        type: food.type || "",
        price: Number(
          food.price || 0
        ),
        stock: Number(
          food.stock || 0
        ),
        ready_time:
          food.time || "",
        description:
          food.description || "",
        status:
          Number(
            food.stock || 0
          ) >= UNLIMITED_STOCK
            ? "unlimited"
            : Number(
                food.stock || 0
              ) <= 0
            ? "sold_out"
            : Number(
                food.stock || 0
              ) <= LOW_STOCK_LIMIT
            ? "low_stock"
            : "available",
      })),

    low_stock_items:
      stats.lowStockFoods.map(
        (food) => ({
          name: food.name,
          stock: Number(
            food.stock || 0
          ),
        })
      ),

    sold_out_items:
      stats.soldOutFoods.map(
        (food) => ({
          name: food.name,
        })
      ),

    best_selling_items:
      stats.bestSellingItems,

    recent_orders: stats.orders
      .slice(
        0,
        MAX_AI_RECENT_ORDERS
      )
      .map((order) => ({
        id: order.id,

        status:
          order.status ||
          "confirmed",

        seller_response:
          order.seller_response ||
          "pending",

        total_amount: Number(
          order.total_amount || 0
        ),

        subtotal_amount: Number(
          order.subtotal_amount ||
            0
        ),

        created_at:
          order.created_at || null,

        scheduled_order:
          order.scheduled_order ===
          true,

        scheduled_for:
          order.scheduled_for ||
          null,

        delivery_type:
          order.delivery_type ||
          "",

        ready_for_pickup:
          order.ready_for_pickup ===
          true,

        items: getOrderItems(
          order
        ).map((item) => ({
          name: item.name,
          quantity: Number(
            item.quantity || 0
          ),
          price: Number(
            item.price || 0
          ),
        })),
      })),
  };
}

function detectPhotoUploadIssue(
  question
) {
  return (
    question.includes("photo") ||
    question.includes("picture") ||
    question.includes("image") ||
    question.includes("upload") ||
    question.includes("camera") ||
    question.includes("gallery")
  );
}

function detectDishSaveIssue(
  question
) {
  return (
    question.includes(
      "dish not saving"
    ) ||
    question.includes(
      "food not saving"
    ) ||
    question.includes("add dish") ||
    question.includes("save dish") ||
    question.includes("not save") ||
    question.includes(
      "does not save"
    )
  );
}

function detectDashboardIssue(
  question
) {
  return (
    question.includes("dashboard") ||
    question.includes("blank") ||
    question.includes("button") ||
    question.includes(
      "not working"
    ) ||
    question.includes("page") ||
    question.includes(
      "changes missing"
    ) ||
    question.includes(
      "not updating"
    )
  );
}

function detectOrderLowIssue(
  question
) {
  return (
    question.includes(
      "not receiving"
    ) ||
    question.includes("no order") ||
    question.includes(
      "orders low"
    ) ||
    question.includes(
      "not getting order"
    ) ||
    question.includes("no sales") ||
    question.includes(
      "no customer"
    )
  );
}

function detectVisibilityIssue(
  question
) {
  return (
    question.includes("visible") ||
    question.includes(
      "not showing"
    ) ||
    question.includes("food not") ||
    question.includes("dish not") ||
    question.includes(
      "marketplace"
    )
  );
}

function detectEarningsIssue(
  question
) {
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
    question.includes("quantity") ||
    question.includes(
      "almost out"
    ) ||
    question.includes(
      "how many items"
    )
  );
}

function detectSalesIssue(question) {
  return (
    question.includes("improve") ||
    question.includes(
      "more sales"
    ) ||
    question.includes("grow") ||
    question.includes("increase") ||
    question.includes("boost") ||
    question.includes("promote")
  );
}

function detectSettingsIssue(
  question
) {
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

function detectOrderManagementIssue(
  question
) {
  return (
    question.includes("accept order") ||
    question.includes("reject order") ||
    question.includes("complete order") ||
    question.includes("active order") ||
    question.includes("manage order") ||
    question.includes("ready for pickup") ||
    question.includes("preparing")
  );
}

function detectChatIssue(
  question
) {
  return (
    question.includes("customer chat") ||
    question.includes("customer message") ||
    question.includes("reply customer") ||
    question.includes("chat tab") ||
    question.includes("message customer")
  );
}

function detectProfileIssue(
  question
) {
  return (
    question.includes("profile photo") ||
    question.includes("profile picture") ||
    question.includes("avatar") ||
    question.includes("kitchen name") ||
    question.includes("seller profile")
  );
}

function detectPayoutIssue(
  question
) {
  return (
    question.includes("bank") ||
    question.includes("payout") ||
    question.includes(
      "settlement"
    ) ||
    question.includes(
      "account number"
    ) ||
    question.includes("ifsc") ||
    question.includes("upi")
  );
}

export default function SellerHelper() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const chatEndRef =
    useRef(null);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState([
    {
      role: "assistant",
      text:
        "Hi! I’m NeFo AI Seller Assistant. I can check your live dishes, stock, orders, earnings, payout setup, kitchen visibility, and dashboard settings.",
    },
  ]);

  const [
    sellerData,
    setSellerData,
  ] = useState({
    profile: null,
    foods: [],
    orders: [],
  });

  const [loading, setLoading] =
    useState(true);

  const [
    aiThinking,
    setAiThinking,
  ] = useState(false);

  const [
    sellerDataError,
    setSellerDataError,
  ] = useState("");

  const [
    aiErrorMessage,
    setAiErrorMessage,
  ] = useState("");

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    loadSellerData();

    const liveChannel = supabase
      .channel(
        `seller-helper-live-${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "foods",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadSellerData({
            silent: true,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          loadSellerData({
            silent: true,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          loadSellerData({
            silent: true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        liveChannel
      );
    };
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages, aiThinking]);

  async function loadSellerData({
    silent = false,
  } = {}) {
    if (!user) {
      const emptyData = {
        profile: null,
        foods: [],
        orders: [],
      };

      setSellerData(emptyData);
      setLoading(false);

      return {
        data: emptyData,
        errors: [
          "Seller is not signed in.",
        ],
      };
    }

    if (!silent) {
      setLoading(true);
    }

    setSellerDataError("");

    const [
      profileResult,
      foodsResult,
      ordersResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("foods")
        .select("*")
        .eq("user_id", user.id)
        .order("id", {
          ascending: false,
        }),

      supabase
        .from("orders")
        .select("*")
        .eq("seller_id", user.id)
        .order("id", {
          ascending: false,
        }),
    ]);

    const queryErrors = [
      profileResult.error
        ? `Profile: ${profileResult.error.message}`
        : "",

      foodsResult.error
        ? `Menu: ${foodsResult.error.message}`
        : "",

      ordersResult.error
        ? `Orders: ${ordersResult.error.message}`
        : "",
    ].filter(Boolean);

    const nextData = {
      profile:
        profileResult.data || null,

      foods:
        foodsResult.data || [],

      orders:
        ordersResult.data || [],
    };

    setSellerData(nextData);

    setSellerDataError(
      queryErrors.join(" • ")
    );

    setLastUpdatedAt(
      new Date()
    );

    if (!silent) {
      setLoading(false);
    }

    return {
      data: nextData,
      errors: queryErrors,
    };
  }

  const stats = useMemo(
    () =>
      buildSellerStats(
        sellerData
      ),
    [sellerData]
  );

  function addMessage(role, text) {
    setMessages((current) => [
      ...current,
      {
        role,
        text,
      },
    ]);
  }

  function getAiHistory() {
    return messages
      .slice(-8)
      .map((message) => ({
        role:
          message.role ===
          "assistant"
            ? "assistant"
            : "user",

        content: message.text,
      }))
      .filter((message) =>
        message.content?.trim()
      );
  }

  function getStockAnswer(
    currentStats
  ) {
    if (
      currentStats.foods.length === 0
    ) {
      return [
        "Stock status",
        "",
        "Your menu currently contains no dishes.",
        "",
        "Add a dish from Seller Dashboard → Menu.",
      ].join("\n");
    }

    if (
      currentStats.lowStockFoods
        .length === 0 &&
      currentStats.soldOutFoods
        .length === 0
    ) {
      return [
        "Stock status",
        "",
        `You have ${currentStats.foods.length} dishes in your menu.`,
        "",
        "No dishes are low stock or sold out.",
        "",
        `Low stock means ${LOW_STOCK_LIMIT} or fewer remaining.`,
      ].join("\n");
    }

    const lines = [
      "Stock alert",
      "",
      `Low-stock dishes: ${currentStats.lowStockFoods.length}`,
    ];

    if (
      currentStats.lowStockFoods
        .length > 0
    ) {
      currentStats.lowStockFoods.forEach(
        (food) => {
          lines.push(
            `• ${food.name}: ${food.stock} left`
          );
        }
      );
    } else {
      lines.push("• None");
    }

    lines.push(
      "",
      `Sold-out dishes: ${currentStats.soldOutFoods.length}`
    );

    if (
      currentStats.soldOutFoods
        .length > 0
    ) {
      currentStats.soldOutFoods.forEach(
        (food) => {
          lines.push(
            `• ${food.name}`
          );
        }
      );
    } else {
      lines.push("• None");
    }

    return lines.join("\n");
  }

  function getEarningsAnswer(
    currentStats
  ) {
    return [
      "Earnings summary",
      "",
      `Today’s earnings: ₹${currentStats.todayEarnings}`,
      `Total earnings: ₹${currentStats.totalEarnings}`,
      `Completed orders: ${currentStats.completedOrders.length}`,
      `Today’s orders: ${currentStats.todayOrders.length}`,
      `Average order value: ₹${currentStats.averageOrder}`,
    ].join("\n");
  }

  function diagnoseVisibility(
    currentStats
  ) {
    const kitchenOnline =
      currentStats.profile
        ?.seller_online !== false;

    const serviceAvailable =
      currentStats.profile
        ?.delivery_available !==
        false ||
      currentStats.profile
        ?.pickup_available !==
        false;

    const lines = [
      "Food visibility check",
      "",
      `Kitchen status: ${
        kitchenOnline
          ? "Online"
          : "Offline"
      }`,
      `Total dishes: ${currentStats.foods.length}`,
      `Active dishes: ${currentStats.activeFoods.length}`,
      `Sold-out dishes: ${currentStats.soldOutFoods.length}`,
      `Delivery or pickup available: ${
        serviceAvailable
          ? "Yes"
          : "No"
      }`,
      "",
    ];

    if (
      currentStats.foods.length === 0
    ) {
      lines.push(
        "No dishes are saved under this seller account."
      );
    } else if (!kitchenOnline) {
      lines.push(
        "Main issue: Your kitchen is offline."
      );
    } else if (!serviceAvailable) {
      lines.push(
        "Main issue: Both delivery and pickup are turned off."
      );
    } else if (
      currentStats.activeFoods
        .length === 0
    ) {
      lines.push(
        "Main issue: Every dish is sold out."
      );
    } else {
      lines.push(
        "Your stocked dishes should be visible to customers."
      );
    }

    return lines.join("\n");
  }

  function diagnoseOrders(
    currentStats
  ) {
    const problems = [];

    if (
      currentStats.profile
        ?.seller_online === false
    ) {
      problems.push(
        "Your kitchen is offline. Turn it online from Seller Dashboard."
      );
    }

    if (
      currentStats.profile
        ?.delivery_available ===
        false &&
      currentStats.profile
        ?.pickup_available === false
    ) {
      problems.push(
        "Both delivery and pickup are off. At least one must be ON."
      );
    }

    if (
      currentStats.foods.length === 0
    ) {
      problems.push(
        "No dishes are currently saved in your menu."
      );
    }

    if (
      currentStats.activeFoods
        .length === 0 &&
      currentStats.foods.length > 0
    ) {
      problems.push(
        "All your dishes are sold out."
      );
    }

    if (
      currentStats.lowStockFoods
        .length > 0
    ) {
      problems.push(
        `${currentStats.lowStockFoods.length} dishes are low stock.`
      );
    }

    if (problems.length === 0) {
      problems.push(
        "Your core kitchen settings look correct."
      );

      problems.push(
        "Keep popular dishes above 5 units and use clear food photos."
      );

      problems.push(
        "Keep the kitchen online during ordering hours."
      );
    }

    return [
      "Order diagnosis",
      "",
      ...problems.map(
        (item, index) =>
          `${index + 1}. ${item}`
      ),
    ].join("\n");
  }

  function getSettingsAnswer(
    currentStats
  ) {
    return [
      "Kitchen settings",
      "",
      `Kitchen online: ${
        currentStats.profile
          ?.seller_online === false
          ? "OFF"
          : "ON"
      }`,

      `Delivery: ${
        currentStats.profile
          ?.delivery_available ===
        false
          ? "OFF"
          : "ON"
      }`,

      `Self pickup: ${
        currentStats.profile
          ?.pickup_available ===
        false
          ? "OFF"
          : "ON"
      }`,

      `Scheduled orders: ${
        currentStats.profile
          ?.accept_scheduled_orders ===
        false
          ? "OFF"
          : "ON"
      }`,

      `Packing charge: ₹${
        currentStats.profile
          ?.packing_charge || 5
      }`,
    ].join("\n");
  }

  function getPayoutAnswer(
    currentStats
  ) {
    const missing = [];

    if (
      !currentStats.profile
        ?.bank_account_holder
    ) {
      missing.push(
        "Account holder name"
      );
    }

    if (
      !currentStats.profile
        ?.bank_name
    ) {
      missing.push("Bank name");
    }

    if (
      !currentStats.profile
        ?.bank_account_number
    ) {
      missing.push(
        "Account number"
      );
    }

    if (
      !currentStats.profile
        ?.bank_ifsc
    ) {
      missing.push("IFSC code");
    }

    if (
      currentStats.profile
        ?.bank_details_completed ===
        true ||
      missing.length === 0
    ) {
      return [
        "Payout setup",
        "",
        "Your payout details appear complete.",
        "",
        "For a settlement problem, contact NeFo support with the affected order ID.",
      ].join("\n");
    }

    return [
      "Payout setup incomplete",
      "",
      "Missing information:",
      ...missing.map(
        (item) => `• ${item}`
      ),
      "",
      "Open Profile → Payout Details to complete these fields.",
    ].join("\n");
  }

  function getSalesAnswer(
    currentStats
  ) {
    const suggestions = [];

    if (
      currentStats.profile
        ?.seller_online === false
    ) {
      suggestions.push(
        "Turn the kitchen online."
      );
    }

    if (
      currentStats.profile
        ?.delivery_available ===
        false
    ) {
      suggestions.push(
        "Enable delivery where possible."
      );
    }

    if (
      currentStats.profile
        ?.accept_scheduled_orders ===
        false
    ) {
      suggestions.push(
        "Enable scheduled orders for planned meals."
      );
    }

    if (
      currentStats.foods.length < 3
    ) {
      suggestions.push(
        "Add at least 3–5 dishes."
      );
    }

    if (
      currentStats.soldOutFoods
        .length > 0
    ) {
      suggestions.push(
        "Restock sold-out dishes."
      );
    }

    if (
      currentStats.bestSellingItems
        .length > 0
    ) {
      suggestions.push(
        `Promote ${currentStats.bestSellingItems[0].name}, your current best seller.`
      );
    }

    if (
      suggestions.length === 0
    ) {
      suggestions.push(
        "Use sharper dish photos."
      );

      suggestions.push(
        "Keep descriptions short and clear."
      );

      suggestions.push(
        "Keep popular dishes in stock during peak hours."
      );
    }

    return [
      "Sales improvement plan",
      "",
      ...suggestions.map(
        (item, index) =>
          `${index + 1}. ${item}`
      ),
    ].join("\n");
  }

  function getLocalAnswer(
    text,
    currentStats
  ) {
    const question =
      text.toLowerCase().trim();

    if (
      detectPhotoUploadIssue(
        question
      )
    ) {
      return [
        "Photo upload check",
        "",
        "1. Use JPG, PNG, or WEBP.",
        "2. Use an image below 3 MB.",
        "3. Check camera and gallery permission.",
        "4. Try Gallery instead of Camera.",
        "5. Refresh the app and try again.",
      ].join("\n");
    }

    if (
      detectDishSaveIssue(
        question
      )
    ) {
      return [
        "Dish saving check",
        "",
        "1. Enter dish name, price, stock, kitchen name, ready time, and category.",
        "2. Add a valid food image.",
        "3. Confirm that price and stock contain numbers.",
        "4. Try a smaller image.",
        "5. Refresh and submit again.",
      ].join("\n");
    }

    if (
      detectOrderLowIssue(
        question
      )
    ) {
      return diagnoseOrders(
        currentStats
      );
    }

    if (
      detectVisibilityIssue(
        question
      )
    ) {
      return diagnoseVisibility(
        currentStats
      );
    }

    if (
      detectEarningsIssue(
        question
      )
    ) {
      return getEarningsAnswer(
        currentStats
      );
    }

    if (
      detectStockIssue(question)
    ) {
      return getStockAnswer(
        currentStats
      );
    }

    if (
      detectSalesIssue(question)
    ) {
      return getSalesAnswer(
        currentStats
      );
    }

    if (
      detectSettingsIssue(
        question
      )
    ) {
      return getSettingsAnswer(
        currentStats
      );
    }

    if (
      detectPayoutIssue(
        question
      )
    ) {
      return getPayoutAnswer(
        currentStats
      );
    }

    if (
      detectOrderManagementIssue(
        question
      )
    ) {
      return [
        "Order management",
        "",
        "1. Open Seller Dashboard → Orders.",
        "2. Tap Accept to confirm a new order.",
        "3. Use Chat with customer for changes or delivery details.",
        "4. For pickup orders, tap Mark Ready for Pickup when prepared.",
        "5. Tap Complete Order only after delivery or collection.",
        "6. Use Reject only when the order cannot be fulfilled.",
      ].join("\n");
    }

    if (
      detectChatIssue(
        question
      )
    ) {
      return [
        "Customer chat",
        "",
        "1. Open Seller Dashboard → Chats.",
        "2. Select the customer conversation linked to the order.",
        "3. You can also open Orders and tap Chat with customer.",
        "4. Chats appear after a customer sends an order message.",
      ].join("\n");
    }

    if (
      detectProfileIssue(
        question
      )
    ) {
      return [
        "Seller profile",
        "",
        "1. Tap the circular profile button at the top-right of Seller Dashboard.",
        "2. Update the kitchen name, photo, or payout details in Profile.",
        "3. Save the changes and reopen Seller Dashboard.",
        "4. A missing photo usually means profiles.avatar_url was not saved or the image URL is not public.",
      ].join("\n");
    }

    if (
      detectDashboardIssue(
        question
      )
    ) {
      return [
        "Seller dashboard check",
        "",
        "1. Refresh the app.",
        "2. Confirm that the seller account is approved.",
        "3. Check the internet connection.",
        "4. Sign out and sign in again.",
        "5. Rebuild and reinstall the APK if old changes are still appearing.",
      ].join("\n");
    }

    return "";
  }

  function getGeneralFallback(
    currentStats
  ) {
    return [
      "I loaded your live seller data.",
      "",
      `Dishes: ${currentStats.foods.length}`,
      `Active dishes: ${currentStats.activeFoods.length}`,
      `Low-stock dishes: ${currentStats.lowStockFoods.length}`,
      `Active orders: ${currentStats.activeOrders.length}`,
      `Today’s earnings: ₹${currentStats.todayEarnings}`,
      "",
      "Ask about a specific dish, stock level, order, earnings, visibility, delivery, pickup, scheduling, or payout setup.",
    ].join("\n");
  }

  async function askSellerAi(
    customText = ""
  ) {
    if (!user) {
      alert(
        "Please login before using Seller Assistant."
      );

      return;
    }

    const userText = String(
      customText || input || ""
    ).trim();

    if (!userText) return;

    setInput("");
    setAiErrorMessage("");
    setAiThinking(true);

    addMessage(
      "user",
      userText
    );

    try {
      const {
        data: freshData,
        errors: refreshErrors,
      } = await loadSellerData({
        silent: true,
      });

      if (
        refreshErrors.length > 0
      ) {
        const errorText =
          refreshErrors.join(" • ");

        setAiErrorMessage(
          errorText
        );

        addMessage(
          "assistant",
          [
            "I could not load your complete live seller data.",
            "",
            errorText,
            "",
            "Please tap Refresh and try again. I will not treat a loading error as an empty menu.",
          ].join("\n")
        );

        return;
      }

      const freshStats =
        buildSellerStats(
          freshData
        );

      const directAnswer =
        getLocalAnswer(
          userText,
          freshStats
        );

      const safeSellerContext =
        buildSafeSellerContext(
          freshStats
        );

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          SELLER_AI_FUNCTION,
          {
            body: {
              role: "seller",
              message: userText,
              history:
                getAiHistory(),

              // Safe optional context for forward compatibility.
              // The server agent reloads authoritative Supabase data itself.
              seller_context:
                safeSellerContext,
              local_diagnosis:
                directAnswer || null,
            },
          }
        );

      if (error) {
        let detailedMessage =
          error.message ||
          "NeFo AI Seller Assistant is not available right now.";

        try {
          if (error.context) {
            const errorBody =
              await error.context.json();

            detailedMessage =
              errorBody?.details ||
              errorBody?.error ||
              errorBody?.message ||
              detailedMessage;
          }
        } catch {
          // Keep the existing message.
        }

        setAiErrorMessage(
          detailedMessage
        );

        addMessage(
          "assistant",
          [
            directAnswer ||
              getGeneralFallback(
                freshStats
              ),
            "",
            `AI service note: ${detailedMessage}`,
          ].join("\n")
        );

        return;
      }

      if (data?.error) {
        const detailedMessage =
          data.details ||
          data.error ||
          "NeFo AI returned an error.";

        setAiErrorMessage(
          String(
            detailedMessage
          )
        );

        addMessage(
          "assistant",
          [
            directAnswer ||
              getGeneralFallback(
                freshStats
              ),
            "",
            `AI service note: ${String(
              detailedMessage
            )}`,
          ].join("\n")
        );

        return;
      }

      addMessage(
        "assistant",
        data?.reply ||
          getGeneralFallback(
            freshStats
          )
      );
    } catch (error) {
      const detailedMessage =
        error?.message ||
        "Could not connect to NeFo AI Seller Assistant.";

      setAiErrorMessage(
        detailedMessage
      );

      addMessage(
        "assistant",
        [
          "I could not complete the live seller check.",
          "",
          detailedMessage,
        ].join("\n")
      );
    } finally {
      setAiThinking(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
            data-nefo-back="true"
          >
            <BackIcon />
          </button>

          <section
            className={`mt-6 p-8 text-center ${CARD}`}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              👨‍🍳
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#181411]">
              Sign in as seller
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Seller Assistant is
              available only for approved
              seller accounts.
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
            onClick={() =>
              navigate(-1)
            }
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
            data-nefo-back="true"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              NeFo AI Seller
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Smart seller
              <span className="block text-[#181411]">
                assistant
              </span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Live help for dishes,
              stock, orders, earnings,
              payout, visibility, and
              kitchen settings.
            </p>

            {lastUpdatedAt ? (
              <p className="mt-2 text-[11px] font-bold text-[#9A8E80]">
                Updated{" "}
                {lastUpdatedAt.toLocaleTimeString(
                  [],
                  {
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )}
              </p>
            ) : null}
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatCard
            label="Dishes"
            value={
              stats.foods.length
            }
          />

          <StatCard
            label="Active"
            value={
              stats.activeFoods.length
            }
          />

          <StatCard
            label="Today"
            value={`₹${stats.todayEarnings}`}
            strong
          />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3">
          <StatCard
            label="Orders"
            value={
              stats.orders.length
            }
          />

          <StatCard
            label="Low Stock"
            value={
              stats.lowStockFoods.length
            }
            muted
          />
        </section>

        <section
          className={`mt-5 p-5 ${CARD}`}
        >
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
              onClick={() =>
                loadSellerData()
              }
              disabled={loading}
              className="shrink-0 rounded-full border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-2 text-xs font-black text-[#3F5128] active:scale-95 disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : "Refresh"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {sellerDataError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-600">
                  Kitchen data could not
                  load completely.
                </p>

                <p className="mt-1 text-xs font-semibold text-red-500">
                  {sellerDataError}
                </p>
              </div>
            ) : null}

            <HealthRow
              label="Kitchen online"
              active={
                stats.profile
                  ?.seller_online !==
                false
              }
            />

            <HealthRow
              label="Delivery"
              active={
                stats.profile
                  ?.delivery_available !==
                false
              }
            />

            <HealthRow
              label="Self pickup"
              active={
                stats.profile
                  ?.pickup_available !==
                false
              }
            />

            <HealthRow
              label="Active dishes"
              active={
                stats.activeFoods.length >
                0
              }
              value={
                stats.activeFoods.length
              }
            />

            <HealthRow
              label="Bank details"
              active={getBankDetailsComplete(
                stats.profile
              )}
            />
          </div>
        </section>

        <section
          className={`mt-5 p-5 ${CARD}`}
        >
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Quick Help
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#181411]">
            Common seller issues
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(
              (item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() =>
                    askSellerAi(
                      item.prompt
                    )
                  }
                  disabled={
                    aiThinking
                  }
                  className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-left text-[#3F5128] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="text-2xl">
                    {item.icon}
                  </div>

                  <p className="mt-2 text-sm font-black leading-tight">
                    {item.label}
                  </p>
                </button>
              )
            )}
          </div>
        </section>

        <section
          className={`mt-5 overflow-hidden ${CARD}`}
        >
          <div className="border-b border-[#4D612F] bg-[#3F5128] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#CF743D] bg-[#CF743D] text-2xl text-white">
                🤖
              </div>

              <div className="min-w-0">
                <p className="text-xl font-black">
                  NeFo AI Seller Assistance
                </p>

                <p className="mt-0.5 text-xs font-semibold text-white/70">
                  Connected to live kitchen
                  data
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
                  NeFo AI service issue
                </p>

                <p className="mt-1 text-xs font-semibold text-red-500">
                  {aiErrorMessage}
                </p>
              </div>
            ) : null}

            <div className="h-[420px] space-y-3 overflow-y-auto rounded-3xl border border-[#D8C9B3] bg-white p-3">
              {messages.map(
                (message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                        message.role ===
                        "user"
                          ? "rounded-br-md border-[#3F5128] bg-[#3F5128] text-white"
                          : "rounded-bl-md border-[#D8C9B3] bg-[#FFF8EC] text-[#6B6258]"
                      }`}
                    >
                      <FormattedMessage
                        text={
                          message.text
                        }
                        isUser={
                          message.role ===
                          "user"
                        }
                      />
                    </div>
                  </div>
                )
              )}

              {aiThinking ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-[#D8C9B3] bg-[#FFF8EC] px-4 py-3 text-sm font-black text-[#3F5128]">
                    Checking live kitchen
                    data...
                  </div>
                </div>
              ) : null}

              <div ref={chatEndRef} />
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !aiThinking
                  ) {
                    askSellerAi();
                  }
                }}
                placeholder="Ask about orders, stock, payout..."
                className={INPUT}
              />

              <button
                type="button"
                onClick={() =>
                  askSellerAi()
                }
                disabled={
                  aiThinking ||
                  !input.trim()
                }
                className="shrink-0 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-5 font-black text-white active:scale-95 disabled:opacity-50"
              >
                {aiThinking
                  ? "..."
                  : "Send"}
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

function FormattedMessage({
  text,
  isUser,
}) {
  if (isUser) {
    return (
      <p className="whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  const lines = String(
    text || ""
  ).split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map(
        (line, index) => {
          const trimmed =
            line.trim();

          if (!trimmed) {
            return (
              <div
                key={index}
                className="h-1"
              />
            );
          }

          const numberedMatch =
            trimmed.match(
              /^(\d+)\.\s+(.*)$/
            );

          const bulletMatch =
            trimmed.match(
              /^[•*-]\s+(.*)$/
            );

          if (numberedMatch) {
            return (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <span className="shrink-0 font-black text-[#3F5128]">
                  {numberedMatch[1]}.
                </span>

                <span>
                  <InlineText
                    text={
                      numberedMatch[2]
                    }
                  />
                </span>
              </div>
            );
          }

          if (bulletMatch) {
            return (
              <div
                key={index}
                className="flex items-start gap-2"
              >
                <span className="mt-1 shrink-0 text-[#CF743D]">
                  •
                </span>

                <span>
                  <InlineText
                    text={
                      bulletMatch[1]
                    }
                  />
                </span>
              </div>
            );
          }

          const looksLikeHeading =
            index === 0 ||
            trimmed.endsWith(":") ||
            /^#{1,3}\s+/.test(
              trimmed
            );

          const cleanHeading =
            trimmed.replace(
              /^#{1,3}\s+/,
              ""
            );

          return (
            <p
              key={index}
              className={
                looksLikeHeading
                  ? "font-black text-[#3F5128]"
                  : ""
              }
            >
              <InlineText
                text={cleanHeading}
              />
            </p>
          );
        }
      )}
    </div>
  );
}

function InlineText({ text }) {
  const parts = String(
    text || ""
  ).split(
    /(\*\*[^*]+\*\*)/g
  );

  return parts.map(
    (part, index) => {
      if (
        part.startsWith("**") &&
        part.endsWith("**")
      ) {
        return (
          <strong
            key={index}
            className="font-black text-[#181411]"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }

      return (
        <span key={index}>
          {part}
        </span>
      );
    }
  );
}

function StatCard({
  label,
  value,
  strong = false,
  muted = false,
}) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#6B6258]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          muted
            ? "text-[#9A8E80]"
            : strong
            ? "text-[#3F5128]"
            : "text-[#181411]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function HealthRow({
  label,
  active,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-3">
      <p className="text-sm font-bold text-[#6B6258]">
        {label}
      </p>

      <p
        className={`text-sm font-black ${
          active
            ? "text-green-600"
            : "text-red-500"
        }`}
      >
        {value !== undefined
          ? value
          : active
          ? "OK"
          : "Fix"}
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
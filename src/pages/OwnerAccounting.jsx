import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 10;
const SELLER_COMMISSION_RATE = 0.1;

export default function OwnerAccounting() {
  const [orders, setOrders] = useState([]);
  const [sellerMap, setSellerMap] = useState({});
  const [dateFilter, setDateFilter] = useState("week");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchAccountingData();

    const channel = supabase
      .channel("owner-accounting-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchAccountingData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAccountingData(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage("");

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false });

    if (orderError) {
      setErrorMessage(orderError.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const sellerIds = [
      ...new Set(
        (orderData || []).map((order) => order.seller_id).filter(Boolean)
      ),
    ];

    let nextSellerMap = {};

    if (sellerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, seller_kitchen_name")
        .in("id", sellerIds);

      (profileData || []).forEach((profile) => {
        nextSellerMap[profile.id] = profile;
      });
    }

    setSellerMap(nextSellerMap);
    setOrders(orderData || []);
    setLoading(false);
  }

  function normalizeStatus(status) {
    return String(status || "confirmed").toLowerCase();
  }

  function normalizePaymentMethod(method) {
    return String(method || "upi").toLowerCase();
  }

  function normalizePaymentStatus(status) {
    return String(status || "pending").toLowerCase();
  }

  function isSameDay(dateA, dateB) {
    return dateA.toDateString() === dateB.toDateString();
  }

  function isInCurrentWeek(date) {
    const now = new Date();
    const firstDay = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);

    firstDay.setDate(diff);
    firstDay.setHours(0, 0, 0, 0);

    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    lastDay.setHours(23, 59, 59, 999);

    return date >= firstDay && date <= lastDay;
  }

  function isInCurrentMonth(date) {
    const now = new Date();

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  function matchesDateFilter(order) {
    if (!order.created_at) return false;

    const orderDate = new Date(order.created_at);
    const now = new Date();

    if (Number.isNaN(orderDate.getTime())) return false;

    if (dateFilter === "all") return true;
    if (dateFilter === "today") return isSameDay(orderDate, now);

    if (dateFilter === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return isSameDay(orderDate, yesterday);
    }

    if (dateFilter === "week") return isInCurrentWeek(orderDate);
    if (dateFilter === "month") return isInCurrentMonth(orderDate);

    return true;
  }

  function matchesPaymentFilter(order) {
    const method = normalizePaymentMethod(order.payment_method);
    const paymentStatus = normalizePaymentStatus(order.payment_status);

    if (paymentFilter === "all") return true;
    if (paymentFilter === "upi") return method === "upi";
    if (paymentFilter === "cash") return method === "cash";
    if (paymentFilter === "pending") return paymentStatus === "pending";
    if (paymentFilter === "reference") {
      return paymentStatus === "reference_submitted";
    }

    return true;
  }

  function matchesStatusFilter(order) {
    const status = normalizeStatus(order.status);

    if (statusFilter === "all") return true;

    if (statusFilter === "active") {
      return status !== "completed" && status !== "cancelled";
    }

    return status === statusFilter;
  }

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

  function getSellerName(order) {
    const sellerProfile = sellerMap[order.seller_id];

    if (sellerProfile?.seller_kitchen_name) {
      return sellerProfile.seller_kitchen_name;
    }

    if (sellerProfile?.full_name) return sellerProfile.full_name;

    const firstItem = getOrderItems(order)[0];

    if (firstItem?.seller_kitchen_name) return firstItem.seller_kitchen_name;
    if (firstItem?.seller) return firstItem.seller;

    return "Unknown Kitchen";
  }

  function getSellerEmail(order) {
    return sellerMap[order.seller_id]?.email || "";
  }

  function getSellerPhone(order) {
    return sellerMap[order.seller_id]?.phone || "";
  }

  function getOrderSubtotal(order) {
    const subtotal = Number(order.subtotal_amount || 0);

    if (subtotal > 0) return subtotal;

    const total = Number(order.total_amount || 0);
    const platformFee = getOrderPlatformFee(order);

    return Math.max(total - platformFee, 0);
  }

  function getOrderPlatformFee(order) {
    return Number(order.platform_fee || PLATFORM_FEE || 0);
  }

  function getPlatformRevenue(order) {
    const status = normalizeStatus(order.status);

    if (status === "cancelled") return 0;

    return getOrderPlatformFee(order);
  }

  function getSellerGrossEarning(order) {
    const status = normalizeStatus(order.status);

    if (status === "cancelled") return 0;

    return getOrderSubtotal(order);
  }

  function getSellerCommission(order) {
    const sellerGross = getSellerGrossEarning(order);

    return Math.round(sellerGross * SELLER_COMMISSION_RATE);
  }

  function getSellerNetPayout(order) {
    const sellerGross = getSellerGrossEarning(order);
    const commission = getSellerCommission(order);

    return Math.max(sellerGross - commission, 0);
  }

  function getNefoTotalEarning(order) {
    return getPlatformRevenue(order) + getSellerCommission(order);
  }

  function getItemsText(order) {
    const items = getOrderItems(order);

    if (items.length === 0) return "-";

    return items
      .map((item) => {
        const name = item.name || "Item";
        const quantity = Number(item.quantity || 1);
        const price = Number(item.price || 0);

        return `${name} x ${quantity} @ ₹${price}`;
      })
      .join("; ");
  }

  function getDateFilterLabel() {
    if (dateFilter === "today") return "Today";
    if (dateFilter === "yesterday") return "Yesterday";
    if (dateFilter === "week") return "This Week";
    if (dateFilter === "month") return "This Month";
    if (dateFilter === "all") return "All Time";
    return dateFilter;
  }

  function getPaymentLabel(order) {
    const method = normalizePaymentMethod(order.payment_method);
    const paymentStatus = normalizePaymentStatus(order.payment_status);

    if (method === "cash") return "Cash / Later";
    if (paymentStatus === "reference_submitted") return "UPI Ref Submitted";

    return "UPI Pending";
  }

  function getPaymentBadgeClass(order) {
    const method = normalizePaymentMethod(order.payment_method);
    const paymentStatus = normalizePaymentStatus(order.payment_status);

    if (method === "cash") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (paymentStatus === "reference_submitted") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }

  function getStatusBadgeClass(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "completed") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (currentStatus === "cancelled") {
      return "bg-red-50 text-red-600 border-red-200";
    }

    return "bg-[#41D3BD]/12 text-[#073B35] border-[#41D3BD]/30";
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return (
        matchesDateFilter(order) &&
        matchesPaymentFilter(order) &&
        matchesStatusFilter(order)
      );
    });
  }, [orders, dateFilter, paymentFilter, statusFilter]);

  const analytics = useMemo(() => {
    const totalOrders = filteredOrders.length;

    const completedOrders = filteredOrders.filter(
      (order) => normalizeStatus(order.status) === "completed"
    ).length;

    const cancelledOrders = filteredOrders.filter(
      (order) => normalizeStatus(order.status) === "cancelled"
    ).length;

    const activeOrders = filteredOrders.filter((order) => {
      const status = normalizeStatus(order.status);
      return status !== "completed" && status !== "cancelled";
    }).length;

    const grossSales = filteredOrders.reduce((total, order) => {
      return total + Number(order.total_amount || 0);
    }, 0);

    const foodSales = filteredOrders.reduce((total, order) => {
      return total + getOrderSubtotal(order);
    }, 0);

    const platformRevenue = filteredOrders.reduce((total, order) => {
      return total + getPlatformRevenue(order);
    }, 0);

    const sellerGrossEarning = filteredOrders.reduce((total, order) => {
      return total + getSellerGrossEarning(order);
    }, 0);

    const sellerCommission = filteredOrders.reduce((total, order) => {
      return total + getSellerCommission(order);
    }, 0);

    const sellerNetPayout = filteredOrders.reduce((total, order) => {
      return total + getSellerNetPayout(order);
    }, 0);

    const nefoTotalEarning = filteredOrders.reduce((total, order) => {
      return total + getNefoTotalEarning(order);
    }, 0);

    const paymentPendingOrders = filteredOrders.filter((order) => {
      return normalizePaymentStatus(order.payment_status) === "pending";
    }).length;

    const upiReferenceSubmitted = filteredOrders.filter((order) => {
      return normalizePaymentStatus(order.payment_status) === "reference_submitted";
    }).length;

    const cashOrders = filteredOrders.filter((order) => {
      return normalizePaymentMethod(order.payment_method) === "cash";
    }).length;

    const averageOrderValue =
      totalOrders > 0 ? Math.round(grossSales / totalOrders) : 0;

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeOrders,
      grossSales,
      foodSales,
      platformRevenue,
      sellerGrossEarning,
      sellerCommission,
      sellerNetPayout,
      nefoTotalEarning,
      paymentPendingOrders,
      upiReferenceSubmitted,
      cashOrders,
      averageOrderValue,
    };
  }, [filteredOrders]);

  const sellerLedger = useMemo(() => {
    const ledger = {};

    filteredOrders.forEach((order) => {
      const sellerId = order.seller_id || "unknown";
      const sellerName = getSellerName(order);
      const status = normalizeStatus(order.status);
      const paymentStatus = normalizePaymentStatus(order.payment_status);
      const paymentMethod = normalizePaymentMethod(order.payment_method);

      if (!ledger[sellerId]) {
        ledger[sellerId] = {
          sellerId,
          sellerName,
          email: getSellerEmail(order),
          phone: getSellerPhone(order),
          totalOrders: 0,
          activeOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          grossSales: 0,
          foodSales: 0,
          platformFee: 0,
          sellerGrossEarning: 0,
          sellerCommission: 0,
          sellerNetPayout: 0,
          nefoTotalEarning: 0,
          pendingPayments: 0,
          upiReferenceSubmitted: 0,
          cashOrders: 0,
        };
      }

      ledger[sellerId].totalOrders += 1;
      ledger[sellerId].grossSales += Number(order.total_amount || 0);
      ledger[sellerId].foodSales += getOrderSubtotal(order);
      ledger[sellerId].platformFee += getPlatformRevenue(order);
      ledger[sellerId].sellerGrossEarning += getSellerGrossEarning(order);
      ledger[sellerId].sellerCommission += getSellerCommission(order);
      ledger[sellerId].sellerNetPayout += getSellerNetPayout(order);
      ledger[sellerId].nefoTotalEarning += getNefoTotalEarning(order);

      if (status === "completed") ledger[sellerId].completedOrders += 1;
      if (status === "cancelled") ledger[sellerId].cancelledOrders += 1;

      if (status !== "completed" && status !== "cancelled") {
        ledger[sellerId].activeOrders += 1;
      }

      if (paymentStatus === "pending") ledger[sellerId].pendingPayments += 1;

      if (paymentStatus === "reference_submitted") {
        ledger[sellerId].upiReferenceSubmitted += 1;
      }

      if (paymentMethod === "cash") ledger[sellerId].cashOrders += 1;
    });

    return Object.values(ledger).sort(
      (a, b) => b.sellerNetPayout - a.sellerNetPayout
    );
  }, [filteredOrders, sellerMap]);

  function downloadAccountingCSV() {
    const headers = [
      "Order ID",
      "Date",
      "Customer",
      "Customer Phone",
      "Kitchen",
      "Seller Email",
      "Seller Phone",
      "Items",
      "Delivery Type",
      "Flat",
      "Order Status",
      "Payment Method",
      "Payment Status",
      "Payment Reference",
      "Food Sales",
      "Platform Fee",
      "Seller Gross Earning",
      "Seller Commission",
      "Net Seller Payout",
      "Nefo Total Earning",
      "Gross Total",
      "Scheduled Order",
      "Scheduled For",
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      formatDateTime(order.created_at),
      order.customer_name || "",
      order.phone || "",
      getSellerName(order),
      getSellerEmail(order),
      getSellerPhone(order),
      getItemsText(order),
      order.delivery_type || "",
      order.flat || "",
      order.status || "confirmed",
      order.payment_method || "upi",
      order.payment_status || "pending",
      order.payment_reference || "",
      getOrderSubtotal(order),
      getOrderPlatformFee(order),
      getSellerGrossEarning(order),
      getSellerCommission(order),
      getSellerNetPayout(order),
      getNefoTotalEarning(order),
      Number(order.total_amount || 0),
      order.scheduled_order ? "Yes" : "No",
      order.scheduled_for ? formatDateTime(order.scheduled_for) : "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const safeCell = String(cell).replaceAll('"', '""');
            return `"${safeCell}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Nefo-weekly-payout-${dateFilter}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-28">
        <div className="max-w-7xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#41D3BD]/10 rounded-full blur-[110px]" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>📒</span>
                  <span>Owner Accounting</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  Weekly seller
                  <span className="block text-[#111827]">payouts</span>
                </h1>

                <p className="text-[#51615D] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Track seller earnings, deduct Nefo commission, calculate net
                  seller payout, and verify payment status before weekly
                  settlement.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/owner-dashboard"
                  className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black px-5 py-3 rounded-2xl transition-all"
                >
                  Owner Dashboard
                </Link>

                <button
                  type="button"
                  onClick={downloadAccountingCSV}
                  className="bg-[#073B35] hover:bg-[#0B5149] text-white font-black px-5 py-3 rounded-2xl shadow-lg shadow-[#073B35]/15 transition-all"
                >
                  Download Payout CSV
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-4 sm:p-5 shadow-lg shadow-[#073B35]/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3">
              <select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] font-bold"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] font-bold"
              >
                <option value="all">All Payments</option>
                <option value="upi">UPI Orders</option>
                <option value="reference">UPI Reference Submitted</option>
                <option value="pending">Payment Pending</option>
                <option value="cash">Cash / Pay Later</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] font-bold"
              >
                <option value="all">All Status</option>
                <option value="active">Active Orders</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="confirmed">Confirmed</option>
                <option value="cooking">Cooking</option>
                <option value="packing">Packing</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
              </select>

              <button
                type="button"
                onClick={() => fetchAccountingData()}
                className="bg-[#FFFFF2] border border-[#41D3BD]/45 hover:bg-[#D7F5EF] text-[#073B35] font-black px-5 py-4 rounded-2xl transition-all"
              >
                Refresh
              </button>
            </div>
          </section>

          {loading && (
            <div className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-3xl p-8 text-center shadow-lg shadow-[#073B35]/5">
              <p className="text-[#51615D] font-bold">
                Loading accounting data...
              </p>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-3xl p-6">
              <p className="text-red-600 font-black">
                Could not load accounting page.
              </p>
              <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
            </div>
          )}

          {!loading && !errorMessage && (
            <>
              <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AccountingCard
                  title="Gross Sales"
                  value={`₹${analytics.grossSales}`}
                />
                <AccountingCard
                  title="Food Sales"
                  value={`₹${analytics.foodSales}`}
                />
                <AccountingCard
                  title="Seller Commission"
                  value={`₹${analytics.sellerCommission}`}
                />
                <AccountingCard
                  title="Net Seller Payout"
                  value={`₹${analytics.sellerNetPayout}`}
                />
                <AccountingCard
                  title="Platform Fee"
                  value={`₹${analytics.platformRevenue}`}
                />
                <AccountingCard
                  title="Nefo Total Earning"
                  value={`₹${analytics.nefoTotalEarning}`}
                />
                <AccountingCard
                  title="Total Orders"
                  value={analytics.totalOrders}
                />
                <AccountingCard
                  title="Payment Pending"
                  value={analytics.paymentPendingOrders}
                />
              </section>

              <section className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_0.75fr] gap-5">
                <div className="bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Weekly Payout Logic
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                    {getDateFilterLabel()} payout summary
                  </h2>

                  <div className="mt-5 space-y-3">
                    <MoneyRow
                      label="Seller Gross Earning"
                      value={`₹${analytics.sellerGrossEarning}`}
                    />
                    <MoneyRow
                      label={`Nefo Commission (${Math.round(
                        SELLER_COMMISSION_RATE * 100
                      )}%)`}
                      value={`₹${analytics.sellerCommission}`}
                    />
                    <MoneyRow
                      label="Net Amount to Send Sellers"
                      value={`₹${analytics.sellerNetPayout}`}
                    />
                    <MoneyRow
                      label="Nefo Platform Fee"
                      value={`₹${analytics.platformRevenue}`}
                    />
                    <MoneyRow
                      label="Nefo Total Earning"
                      value={`₹${analytics.nefoTotalEarning}`}
                    />
                  </div>
                </div>

                <div className="bg-[#073B35] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/15 relative overflow-hidden">
                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#41D3BD]/20 blur-[70px] rounded-full" />

                  <div className="relative">
                    <p className="text-[#41D3BD] font-black uppercase tracking-wide text-xs">
                      Payout Rule
                    </p>

                    <h2 className="text-2xl font-black text-white mt-2">
                      Weekly payout = seller earning minus commission
                    </h2>

                    <p className="text-[#D7F5EF] text-sm mt-3 leading-relaxed">
                      For every non-cancelled order, Nefo calculates seller food
                      earning, deducts seller commission, and shows the net payout
                      amount. Use this page before sending weekly settlements.
                    </p>

                    <p className="text-[#41D3BD] text-sm font-black mt-5">
                      Current commission:{" "}
                      {Math.round(SELLER_COMMISSION_RATE * 100)}%
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                      Weekly Seller Payout Ledger
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                      How much to send each seller
                    </h2>
                  </div>

                  <p className="text-[#51615D] text-sm font-bold">
                    {sellerLedger.length} sellers
                  </p>
                </div>

                {sellerLedger.length === 0 ? (
                  <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-8 text-center">
                    <p className="text-[#51615D] font-bold">
                      No seller payout data found for selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left min-w-[1180px]">
                      <thead>
                        <tr className="border-b border-[#D7F5EF] text-[#51615D] text-sm">
                          <th className="py-3 pr-4">Kitchen</th>
                          <th className="py-3 pr-4">Orders</th>
                          <th className="py-3 pr-4">Completed</th>
                          <th className="py-3 pr-4">Gross Sales</th>
                          <th className="py-3 pr-4">Seller Earning</th>
                          <th className="py-3 pr-4">Commission</th>
                          <th className="py-3 pr-4">Net Payout</th>
                          <th className="py-3 pr-4">Platform Fee</th>
                          <th className="py-3 pr-4">Nefo Earning</th>
                          <th className="py-3 pr-4">Pending Payments</th>
                          <th className="py-3 pr-4">Payout Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sellerLedger.map((seller) => (
                          <tr
                            key={seller.sellerId}
                            className="border-b border-[#D7F5EF] text-sm"
                          >
                            <td className="py-4 pr-4">
                              <p className="font-black text-[#111827]">
                                {seller.sellerName}
                              </p>
                              <p className="text-[#51615D] text-xs mt-1">
                                {seller.phone || seller.email || "No contact"}
                              </p>
                            </td>
                            <td className="py-4 pr-4 text-[#51615D]">
                              {seller.totalOrders}
                            </td>
                            <td className="py-4 pr-4 text-green-600 font-bold">
                              {seller.completedOrders}
                            </td>
                            <td className="py-4 pr-4 text-[#073B35] font-black">
                              ₹{seller.grossSales}
                            </td>
                            <td className="py-4 pr-4 text-[#51615D]">
                              ₹{seller.sellerGrossEarning}
                            </td>
                            <td className="py-4 pr-4 text-red-500 font-black">
                              ₹{seller.sellerCommission}
                            </td>
                            <td className="py-4 pr-4 text-[#073B35] font-black">
                              ₹{seller.sellerNetPayout}
                            </td>
                            <td className="py-4 pr-4 text-[#51615D]">
                              ₹{seller.platformFee}
                            </td>
                            <td className="py-4 pr-4 text-[#073B35] font-black">
                              ₹{seller.nefoTotalEarning}
                            </td>
                            <td className="py-4 pr-4 text-yellow-700 font-bold">
                              {seller.pendingPayments}
                            </td>
                            <td className="py-4 pr-4">
                              <span
                                className={`text-xs font-black px-3 py-1.5 rounded-full border ${
                                  seller.pendingPayments > 0
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                                }`}
                              >
                                {seller.pendingPayments > 0
                                  ? "Hold / Verify"
                                  : "Ready to Pay"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                      Accounting Register
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                      Order-wise payout calculation
                    </h2>
                  </div>

                  <p className="text-[#51615D] text-sm font-bold">
                    {filteredOrders.length} records
                  </p>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-8 text-center">
                    <p className="text-[#51615D] font-bold">
                      No orders found for selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {filteredOrders.map((order) => (
                      <article
                        key={order.id}
                        className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4 sm:p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[#51615D] text-sm font-bold">
                              Order #{order.id} •{" "}
                              {formatDateTime(order.created_at)}
                            </p>

                            <h3 className="text-2xl sm:text-3xl font-black mt-1 text-[#073B35]">
                              ₹{Number(order.total_amount || 0)}
                            </h3>

                            <p className="text-[#51615D] text-sm mt-2">
                              Customer: {order.customer_name || "Unknown"} •{" "}
                              {order.phone || "No phone"}
                            </p>

                            <p className="text-[#51615D] text-sm mt-1">
                              Kitchen: {getSellerName(order)}
                            </p>

                            <p className="text-[#51615D] text-sm mt-1">
                              {order.delivery_type || "Delivery"} •{" "}
                              {order.flat || "No flat"}
                            </p>

                            <p className="text-[#51615D] text-sm mt-3 line-clamp-2">
                              Items: {getItemsText(order)}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-4">
                              <span className="bg-white border border-[#D7F5EF] text-[#073B35] text-xs font-black px-3 py-1.5 rounded-full">
                                Seller Earning ₹{getSellerGrossEarning(order)}
                              </span>

                              <span className="bg-white border border-red-200 text-red-500 text-xs font-black px-3 py-1.5 rounded-full">
                                Commission ₹{getSellerCommission(order)}
                              </span>

                              <span className="bg-white border border-[#D7F5EF] text-[#073B35] text-xs font-black px-3 py-1.5 rounded-full">
                                Net Payout ₹{getSellerNetPayout(order)}
                              </span>

                              <span className="bg-white border border-[#D7F5EF] text-[#073B35] text-xs font-black px-3 py-1.5 rounded-full">
                                Nefo Earning ₹{getNefoTotalEarning(order)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap sm:justify-end gap-2">
                            <span
                              className={`w-fit border text-xs font-black px-3 py-1.5 rounded-full ${getStatusBadgeClass(
                                order.status
                              )}`}
                            >
                              {order.status || "confirmed"}
                            </span>

                            <span
                              className={`w-fit border text-xs font-black px-3 py-1.5 rounded-full ${getPaymentBadgeClass(
                                order
                              )}`}
                            >
                              {getPaymentLabel(order)}
                            </span>
                          </div>
                        </div>

                        {order.payment_reference && (
                          <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4">
                            <p className="text-green-700 text-xs font-black uppercase">
                              Payment Reference
                            </p>

                            <p className="text-[#111827] font-bold mt-1 break-all">
                              {order.payment_reference}
                            </p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function AccountingCard({ title, value }) {
  return (
    <div className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-5 shadow-lg shadow-[#073B35]/5">
      <p className="text-[#51615D] text-xs uppercase font-black">{title}</p>

      <p className="text-2xl sm:text-3xl font-black text-[#073B35] mt-3">
        {value}
      </p>
    </div>
  );
}

function MoneyRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[#FFFFF2] border border-[#D7F5EF] rounded-2xl p-4">
      <p className="text-[#51615D] font-bold">{label}</p>
      <p className="text-[#073B35] font-black shrink-0">{value}</p>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 10;

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-black text-[#181411] outline-none focus:border-[#CF743D] focus:bg-white";

export default function OwnerDashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [sellerMap, setSellerMap] = useState({});
  const [dateFilter, setDateFilter] = useState("today");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchOwnerData();

    const channel = supabase
      .channel("owner-dashboard-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOwnerData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOwnerData(showLoading = true) {
    if (showLoading) setLoading(true);

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

    const nextSellerMap = {};

    if (sellerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, seller_kitchen_name, seller_online, delivery_available, pickup_available"
        )
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

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getSellerName(order) {
    const sellerProfile = sellerMap[order.seller_id];

    if (sellerProfile?.seller_kitchen_name) {
      return sellerProfile.seller_kitchen_name;
    }

    if (sellerProfile?.full_name) return sellerProfile.full_name;

    const firstItem = getOrderItems(order)[0];

    if (firstItem?.seller) return firstItem.seller;
    if (firstItem?.seller_kitchen_name) return firstItem.seller_kitchen_name;

    return "Unknown Kitchen";
  }

  function getPaymentLabel(order) {
    const method = normalizePaymentMethod(order.payment_method);
    const status = normalizePaymentStatus(order.payment_status);

    if (method === "cash") return "Cash / Later";
    if (status === "reference_submitted") return "UPI Ref Submitted";

    return "UPI Pending";
  }

  function getPaymentBadgeClass(order) {
    const method = normalizePaymentMethod(order.payment_method);
    const status = normalizePaymentStatus(order.payment_status);

    if (method === "cash") return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "reference_submitted") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  function getStatusBadgeClass(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "completed") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (currentStatus === "cancelled") {
      return "border-red-200 bg-red-50 text-red-600";
    }

    return "border-[#D8C9B3] bg-[#FFF0DF] text-[#3F5128]";
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return matchesDateFilter(order) && matchesPaymentFilter(order);
    });
  }, [orders, dateFilter, paymentFilter]);

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

    const totalSales = filteredOrders.reduce((total, order) => {
      return total + Number(order.total_amount || 0);
    }, 0);

    const subtotalSales = filteredOrders.reduce((total, order) => {
      return total + Number(order.subtotal_amount || 0);
    }, 0);

    const platformFeeEarned = filteredOrders.reduce((total, order) => {
      return total + Number(order.platform_fee || PLATFORM_FEE || 0);
    }, 0);

    const upiReferenceSubmitted = filteredOrders.filter((order) => {
      return (
        normalizePaymentMethod(order.payment_method) === "upi" &&
        normalizePaymentStatus(order.payment_status) === "reference_submitted"
      );
    }).length;

    const paymentPending = filteredOrders.filter((order) => {
      return normalizePaymentStatus(order.payment_status) === "pending";
    }).length;

    const cashOrders = filteredOrders.filter((order) => {
      return normalizePaymentMethod(order.payment_method) === "cash";
    }).length;

    return {
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeOrders,
      totalSales,
      subtotalSales,
      platformFeeEarned,
      upiReferenceSubmitted,
      paymentPending,
      cashOrders,
    };
  }, [filteredOrders]);

  const sellerWiseReport = useMemo(() => {
    const report = {};

    filteredOrders.forEach((order) => {
      const sellerId = order.seller_id || "unknown";
      const sellerName = getSellerName(order);

      if (!report[sellerId]) {
        report[sellerId] = {
          sellerId,
          sellerName,
          orders: 0,
          completed: 0,
          cancelled: 0,
          grossSales: 0,
          platformFee: 0,
          pendingPayments: 0,
        };
      }

      report[sellerId].orders += 1;
      report[sellerId].grossSales += Number(order.total_amount || 0);
      report[sellerId].platformFee += Number(
        order.platform_fee || PLATFORM_FEE || 0
      );

      if (normalizeStatus(order.status) === "completed") {
        report[sellerId].completed += 1;
      }

      if (normalizeStatus(order.status) === "cancelled") {
        report[sellerId].cancelled += 1;
      }

      if (normalizePaymentStatus(order.payment_status) === "pending") {
        report[sellerId].pendingPayments += 1;
      }
    });

    return Object.values(report).sort((a, b) => b.grossSales - a.grossSales);
  }, [filteredOrders, sellerMap]);

  const aiInsights = useMemo(() => {
    const insights = [];

    if (analytics.totalOrders === 0) {
      insights.push(
        "No orders found for this filter. Check seller availability and marketplace visibility."
      );
    }

    if (analytics.activeOrders > 0) {
      insights.push(`${analytics.activeOrders} active orders need live monitoring.`);
    }

    if (analytics.paymentPending > 0) {
      insights.push(
        `${analytics.paymentPending} orders have pending payment status. Verify references before settlement.`
      );
    }

    if (analytics.cancelledOrders > 0) {
      insights.push(
        `${analytics.cancelledOrders} cancelled orders detected. Review seller/customer issues.`
      );
    }

    const sellersWithPendingPayments = sellerWiseReport.filter(
      (seller) => seller.pendingPayments > 0
    );

    if (sellersWithPendingPayments.length > 0) {
      insights.push(
        `${sellersWithPendingPayments.length} sellers have pending payment follow-ups.`
      );
    }

    const topSeller = sellerWiseReport[0];

    if (topSeller && topSeller.orders > 0) {
      insights.push(
        `${topSeller.sellerName} is the top kitchen for this period with ₹${topSeller.grossSales} sales.`
      );
    }

    if (analytics.platformFeeEarned > 0) {
      insights.push(
        `Platform fee earned for this filter is ₹${analytics.platformFeeEarned}.`
      );
    }

    return insights.length > 0
      ? insights
      : ["Operations look stable for the selected filter."];
  }, [analytics, sellerWiseReport]);

  function downloadCSV() {
    const headers = [
      "Order ID",
      "Date",
      "Customer",
      "Phone",
      "Seller",
      "Delivery Type",
      "Flat",
      "Status",
      "Payment Method",
      "Payment Status",
      "Payment Reference",
      "Subtotal",
      "Platform Fee",
      "Total",
      "Scheduled",
      "Scheduled For",
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      formatDateTime(order.created_at),
      order.customer_name || "",
      order.phone || "",
      getSellerName(order),
      order.delivery_type || "",
      order.flat || "",
      order.status || "",
      order.payment_method || "",
      order.payment_status || "",
      order.payment_reference || "",
      order.subtotal_amount || 0,
      order.platform_fee || 0,
      order.total_amount || 0,
      order.scheduled_order ? "Yes" : "No",
      order.scheduled_for || "",
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
    link.download = `NeFo-owner-report-${dateFilter}.csv`;
    link.click();

    URL.revokeObjectURL(url);
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
              Owner Dashboard
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Orders
              <span className="block text-[#181411]">& payments</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Daily control center for orders, UPI references, platform fees,
              seller performance, and operational records.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <Link
            to="/marketplace"
            className="rounded-2xl border border-[#D8C9B3] bg-white px-4 py-4 text-center text-sm font-black text-[#3F5128] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Marketplace
          </Link>

          <Link
            to="/owner-accounting"
            className="rounded-2xl border border-[#CF743D] bg-[#CF743D] px-4 py-4 text-center text-sm font-black text-white shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Accounting
          </Link>

          <Link
            to="/owner-seller-applications"
            className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
          >
            Applications
          </Link>

          <Link
            to="/owner-support-tickets"
            className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
          >
            Support Tickets
          </Link>

          <Link
            to="/owner-commission-settings"
            className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
          >
            Commission
          </Link>

          <button
            type="button"
            onClick={downloadCSV}
            className="rounded-2xl border border-[#3F5128] bg-[#3F5128] px-4 py-4 text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-95"
          >
            CSV Export
          </button>
        </section>

        <section className="mt-5 rounded-[28px] border border-[#3F5128] bg-[#3F5128] p-5 text-white shadow-xl shadow-[#3F5128]/15">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                NeFo AI Insights
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Owner command center
              </h2>
            </div>

            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white/75">
              Live
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {aiInsights.map((insight, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/15 bg-white/10 p-4"
              >
                <p className="text-sm font-bold leading-relaxed text-white">
                  {index + 1}. {insight}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={`mt-5 p-4 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Filters
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className={INPUT}
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
              className={INPUT}
            >
              <option value="all">All Payments</option>
              <option value="upi">UPI Orders</option>
              <option value="reference">UPI Reference Submitted</option>
              <option value="pending">Payment Pending</option>
              <option value="cash">Cash / Pay Later</option>
            </select>

            <button
              type="button"
              onClick={() => fetchOwnerData()}
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-5 py-4 font-black text-[#3F5128] active:scale-95"
            >
              Refresh
            </button>
          </div>
        </section>

        {loading ? (
          <section className={`mt-5 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#EADFCE] border-t-[#3F5128] animate-spin" />

            <p className="mt-4 font-bold text-[#6B6258]">
              Loading owner dashboard...
            </p>
          </section>
        ) : null}

        {!loading && errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-black text-red-600">
              Could not load dashboard.
            </p>

            <p className="mt-2 text-sm font-semibold text-red-500">
              {errorMessage}
            </p>
          </div>
        ) : null}

        {!loading && !errorMessage ? (
          <>
            <section className="mt-5 grid grid-cols-2 gap-3">
              <StatCard title="Total Orders" value={analytics.totalOrders} />
              <StatCard title="Active Orders" value={analytics.activeOrders} />
              <StatCard title="Completed" value={analytics.completedOrders} />
              <StatCard title="Cancelled" value={analytics.cancelledOrders} />
              <StatCard title="Total Sales" value={`₹${analytics.totalSales}`} />
              <StatCard
                title="Subtotal Sales"
                value={`₹${analytics.subtotalSales}`}
              />
              <StatCard
                title="Platform Fee"
                value={`₹${analytics.platformFeeEarned}`}
              />
              <StatCard
                title="UPI Ref"
                value={analytics.upiReferenceSubmitted}
              />
            </section>

            <section className={`mt-5 p-5 ${CARD}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                    Seller Report
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-[#181411]">
                    Seller-wise sales
                  </h2>
                </div>

                <p className="shrink-0 text-sm font-black text-[#6B6258]">
                  {sellerWiseReport.length}
                </p>
              </div>

              {sellerWiseReport.length === 0 ? (
                <div className={`mt-6 p-6 text-center ${SOFT_CARD}`}>
                  <p className="font-bold text-[#6B6258]">
                    No seller data found.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {sellerWiseReport.map((seller) => (
                    <article
                      key={seller.sellerId}
                      className="rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-[#181411]">
                            {seller.sellerName}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                            {seller.orders} orders
                          </p>
                        </div>

                        <p className="shrink-0 text-xl font-black text-[#3F5128]">
                          ₹{seller.grossSales}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <SmallMetric label="Done" value={seller.completed} />
                        <SmallMetric label="Cancel" value={seller.cancelled} />
                        <SmallMetric
                          label="Pending"
                          value={seller.pendingPayments}
                        />
                      </div>

                      <div className="mt-3 rounded-2xl border border-[#D8C9B3] bg-white p-3">
                        <p className="text-xs font-black uppercase text-[#6B6258]">
                          Platform Fee
                        </p>

                        <p className="mt-1 font-black text-[#3F5128]">
                          ₹{seller.platformFee}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={`mt-5 p-5 ${CARD}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                    Order Register
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-[#181411]">
                    Orders + payments
                  </h2>
                </div>

                <p className="shrink-0 text-sm font-black text-[#6B6258]">
                  {filteredOrders.length}
                </p>
              </div>

              {filteredOrders.length === 0 ? (
                <div className={`mt-6 p-8 text-center ${SOFT_CARD}`}>
                  <p className="font-bold text-[#6B6258]">
                    No orders found for selected filters.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#6B6258]">
                            Order #{order.id}
                          </p>

                          <h3 className="mt-1 text-3xl font-black text-[#3F5128]">
                            ₹{order.total_amount}
                          </h3>
                        </div>

                        <p className="shrink-0 text-right text-xs font-semibold leading-relaxed text-[#6B6258]">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>

                      <div className="mt-4 space-y-2 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                        <DetailLine
                          label="Customer"
                          value={`${order.customer_name || "-"} • ${
                            order.phone || "-"
                          }`}
                        />

                        <DetailLine label="Kitchen" value={getSellerName(order)} />

                        <DetailLine
                          label="Delivery"
                          value={`${order.delivery_type || "-"} • ${
                            order.flat || "-"
                          }`}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          {order.status || "confirmed"}
                        </span>

                        <span
                          className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black ${getPaymentBadgeClass(
                            order
                          )}`}
                        >
                          {getPaymentLabel(order)}
                        </span>
                      </div>

                      {order.payment_reference ? (
                        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                          <p className="text-xs font-black uppercase text-green-700">
                            Payment Reference
                          </p>

                          <p className="mt-1 break-all font-bold text-[#181411]">
                            {order.payment_reference}
                          </p>
                        </div>
                      ) : null}

                      {order.scheduled_order ? (
                        <div className="mt-4 rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] p-4">
                          <p className="text-xs font-black uppercase text-[#3F5128]">
                            Scheduled For
                          </p>

                          <p className="mt-1 font-bold text-[#181411]">
                            {formatDateTime(order.scheduled_for)}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-4 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#6B6258]">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-[#3F5128]">{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#D8C9B3] bg-white p-3">
      <p className="text-[10px] font-black uppercase text-[#6B6258]">
        {label}
      </p>

      <p className="mt-1 font-black text-[#3F5128]">{value}</p>
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="text-sm">
      <span className="font-black text-[#3F5128]">{label}: </span>
      <span className="font-semibold text-[#6B6258]">{value || "-"}</span>
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
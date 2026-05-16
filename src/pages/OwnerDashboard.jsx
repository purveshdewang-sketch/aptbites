import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 10;

export default function OwnerDashboard() {
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
      ...new Set((orderData || []).map((order) => order.seller_id).filter(Boolean)),
    ];

    let nextSellerMap = {};

    if (sellerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
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
    if (paymentFilter === "reference") return paymentStatus === "reference_submitted";

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

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getSellerName(order) {
    const sellerProfile = sellerMap[order.seller_id];

    if (sellerProfile?.full_name) return sellerProfile.full_name;

    const firstItem = getOrderItems(order)[0];

    if (firstItem?.seller) return firstItem.seller;

    return "Unknown Seller";
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

    if (method === "cash") {
      return "bg-blue-900/40 text-blue-300 border-blue-500/20";
    }

    if (status === "reference_submitted") {
      return "bg-green-900/40 text-green-300 border-green-500/20";
    }

    return "bg-yellow-900/30 text-yellow-300 border-yellow-500/20";
  }

  function getStatusBadgeClass(status) {
    const currentStatus = normalizeStatus(status);

    if (currentStatus === "completed") {
      return "bg-green-900/40 text-green-300 border-green-500/20";
    }

    if (currentStatus === "cancelled") {
      return "bg-red-900/40 text-red-300 border-red-500/20";
    }

    return "bg-yellow-900/30 text-yellow-300 border-yellow-500/20";
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
      report[sellerId].platformFee += Number(order.platform_fee || PLATFORM_FEE || 0);

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
    link.download = `Nefo-owner-report-${dateFilter}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-7 sm:py-10 pb-28">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                Owner Dashboard
              </p>

              <h1 className="text-3xl sm:text-5xl font-black mt-3 tracking-tight">
                Orders & Payments
              </h1>

              <p className="text-gray-500 mt-3 max-w-2xl">
                Daily control center for Nefo orders, payment references,
                platform fees, and seller-wise performance.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/marketplace"
                className="border border-[#333] hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 font-bold px-5 py-3 rounded-2xl"
              >
                Marketplace
              </Link>

              <button
                type="button"
                onClick={downloadCSV}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-5 py-3 rounded-2xl"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3">
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="bg-[#111] border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500"
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
              className="bg-[#111] border border-[#333] rounded-2xl px-5 py-4 outline-none focus:border-yellow-500"
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
              className="bg-[#111] border border-[#333] hover:border-yellow-500/50 text-yellow-400 font-black px-5 py-4 rounded-2xl"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div className="mt-8 bg-[#111] border border-[#222] rounded-3xl p-8 text-center">
              <p className="text-gray-400 font-bold">Loading owner dashboard...</p>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="mt-8 bg-red-950/40 border border-red-500/30 rounded-3xl p-6">
              <p className="text-red-300 font-black">Could not load dashboard.</p>
              <p className="text-red-200/70 text-sm mt-2">{errorMessage}</p>
            </div>
          )}

          {!loading && !errorMessage && (
            <>
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <StatCard title="Total Orders" value={analytics.totalOrders} />
                <StatCard title="Active Orders" value={analytics.activeOrders} />
                <StatCard title="Completed" value={analytics.completedOrders} />
                <StatCard title="Cancelled" value={analytics.cancelledOrders} />
                <StatCard title="Total Sales" value={`₹${analytics.totalSales}`} />
                <StatCard
                  title="Platform Fee"
                  value={`₹${analytics.platformFeeEarned}`}
                />
                <StatCard
                  title="UPI Ref Submitted"
                  value={analytics.upiReferenceSubmitted}
                />
                <StatCard title="Payment Pending" value={analytics.paymentPending} />
              </section>

              <section className="mt-8 bg-[#111] border border-[#222] rounded-[2rem] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                      Seller Report
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black mt-1">
                      Seller-wise Sales
                    </h2>
                  </div>

                  <p className="text-gray-500 text-sm">
                    {sellerWiseReport.length} sellers
                  </p>
                </div>

                {sellerWiseReport.length === 0 ? (
                  <p className="text-gray-500 mt-6">No seller data found.</p>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left min-w-[760px]">
                      <thead>
                        <tr className="border-b border-[#222] text-gray-500 text-sm">
                          <th className="py-3 pr-4">Seller</th>
                          <th className="py-3 pr-4">Orders</th>
                          <th className="py-3 pr-4">Completed</th>
                          <th className="py-3 pr-4">Cancelled</th>
                          <th className="py-3 pr-4">Gross Sales</th>
                          <th className="py-3 pr-4">Platform Fee</th>
                          <th className="py-3 pr-4">Pending Payments</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sellerWiseReport.map((seller) => (
                          <tr
                            key={seller.sellerId}
                            className="border-b border-[#1a1a1a] text-sm"
                          >
                            <td className="py-4 pr-4 font-black">
                              {seller.sellerName}
                            </td>
                            <td className="py-4 pr-4">{seller.orders}</td>
                            <td className="py-4 pr-4 text-green-400">
                              {seller.completed}
                            </td>
                            <td className="py-4 pr-4 text-red-400">
                              {seller.cancelled}
                            </td>
                            <td className="py-4 pr-4 text-yellow-400 font-black">
                              ₹{seller.grossSales}
                            </td>
                            <td className="py-4 pr-4">₹{seller.platformFee}</td>
                            <td className="py-4 pr-4 text-yellow-400">
                              {seller.pendingPayments}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="mt-8 bg-[#111] border border-[#222] rounded-[2rem] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">
                      Order Register
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black mt-1">
                      Orders + Payments
                    </h2>
                  </div>

                  <p className="text-gray-500 text-sm">
                    {filteredOrders.length} records
                  </p>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="mt-6 bg-black/40 border border-[#222] rounded-3xl p-8 text-center">
                    <p className="text-gray-400 font-bold">
                      No orders found for selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {filteredOrders.map((order) => (
                      <article
                        key={order.id}
                        className="bg-black/40 border border-[#222] rounded-3xl p-4 sm:p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-gray-500 text-sm">
                              Order #{order.id} • {formatDateTime(order.created_at)}
                            </p>

                            <h3 className="text-2xl font-black mt-1">
                              ₹{order.total_amount}
                            </h3>

                            <p className="text-gray-400 text-sm mt-2">
                              {order.customer_name} • {order.phone}
                            </p>

                            <p className="text-gray-500 text-sm mt-1">
                              Seller: {getSellerName(order)}
                            </p>

                            <p className="text-gray-500 text-sm mt-1">
                              {order.delivery_type} • {order.flat}
                            </p>
                          </div>

                          <div className="flex flex-wrap sm:justify-end gap-2">
                            <span
                              className={`w-fit border text-xs font-bold px-3 py-1.5 rounded-full ${getStatusBadgeClass(
                                order.status
                              )}`}
                            >
                              {order.status || "confirmed"}
                            </span>

                            <span
                              className={`w-fit border text-xs font-bold px-3 py-1.5 rounded-full ${getPaymentBadgeClass(
                                order
                              )}`}
                            >
                              {getPaymentLabel(order)}
                            </span>
                          </div>
                        </div>

                        {order.payment_reference && (
                          <div className="mt-4 bg-green-950/30 border border-green-500/20 rounded-2xl p-4">
                            <p className="text-green-400 text-xs font-black uppercase">
                              Payment Reference
                            </p>
                            <p className="text-white font-bold mt-1 break-all">
                              {order.payment_reference}
                            </p>
                          </div>
                        )}

                        {order.scheduled_order && (
                          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                            <p className="text-yellow-400 text-xs font-black uppercase">
                              Scheduled For
                            </p>
                            <p className="text-white font-bold mt-1">
                              {formatDateTime(order.scheduled_for)}
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

function StatCard({ title, value }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-3xl p-5">
      <p className="text-gray-500 text-xs uppercase font-bold">{title}</p>
      <p className="text-2xl sm:text-3xl font-black text-yellow-400 mt-3">
        {value}
      </p>
    </div>
  );
}
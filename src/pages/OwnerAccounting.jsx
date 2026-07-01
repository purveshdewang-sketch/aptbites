import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const PLATFORM_FEE = 10;
const SELLER_COMMISSION_RATE = 0.1;

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-black text-[#181411] outline-none focus:border-[#CF743D] focus:bg-white";

export default function OwnerAccounting() {
  const navigate = useNavigate();

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
        { event: "*", schema: "public", table: "orders" },
        () => fetchAccountingData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAccountingData(showLoading = true) {
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
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, seller_kitchen_name, bank_account_holder, bank_name, bank_account_number, bank_ifsc, bank_upi_id"
        )
        .in("id", sellerIds);

      if (profileError) {
        setErrorMessage(profileError.message);
      }

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

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getSellerProfile(order) {
    return sellerMap[order.seller_id] || {};
  }

  function getSellerName(order) {
    const sellerProfile = getSellerProfile(order);

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
    return getSellerProfile(order)?.email || "";
  }

  function getSellerPhone(order) {
    return getSellerProfile(order)?.phone || "";
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
    return Math.round(getSellerGrossEarning(order) * SELLER_COMMISSION_RATE);
  }

  function getSellerNetPayout(order) {
    return Math.max(
      getSellerGrossEarning(order) - getSellerCommission(order),
      0
    );
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

    if (method === "cash") return "border-blue-200 bg-blue-50 text-blue-700";
    if (paymentStatus === "reference_submitted") {
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

    const grossSales = filteredOrders.reduce(
      (total, order) => total + Number(order.total_amount || 0),
      0
    );

    const foodSales = filteredOrders.reduce(
      (total, order) => total + getOrderSubtotal(order),
      0
    );

    const platformRevenue = filteredOrders.reduce(
      (total, order) => total + getPlatformRevenue(order),
      0
    );

    const sellerGrossEarning = filteredOrders.reduce(
      (total, order) => total + getSellerGrossEarning(order),
      0
    );

    const sellerCommission = filteredOrders.reduce(
      (total, order) => total + getSellerCommission(order),
      0
    );

    const sellerNetPayout = filteredOrders.reduce(
      (total, order) => total + getSellerNetPayout(order),
      0
    );

    const nefoTotalEarning = filteredOrders.reduce(
      (total, order) => total + getNefoTotalEarning(order),
      0
    );

    const paymentPendingOrders = filteredOrders.filter((order) => {
      return normalizePaymentStatus(order.payment_status) === "pending";
    }).length;

    const upiReferenceSubmitted = filteredOrders.filter((order) => {
      return (
        normalizePaymentStatus(order.payment_status) === "reference_submitted"
      );
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
      const sellerProfile = getSellerProfile(order);
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
          bankAccountHolder: sellerProfile.bank_account_holder || "",
          bankName: sellerProfile.bank_name || "",
          bankAccountNumber: sellerProfile.bank_account_number || "",
          bankIfsc: sellerProfile.bank_ifsc || "",
          bankUpiId: sellerProfile.bank_upi_id || "",
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
      "Bank Account Holder",
      "Bank Name",
      "Bank Account Number",
      "Bank IFSC",
      "Bank UPI ID",
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

    const rows = filteredOrders.map((order) => {
      const sellerProfile = getSellerProfile(order);

      return [
        order.id,
        formatDateTime(order.created_at),
        order.customer_name || "",
        order.phone || "",
        getSellerName(order),
        getSellerEmail(order),
        getSellerPhone(order),
        sellerProfile.bank_account_holder || "",
        sellerProfile.bank_name || "",
        sellerProfile.bank_account_number || "",
        sellerProfile.bank_ifsc || "",
        sellerProfile.bank_upi_id || "",
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
      ];
    });

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
              Owner Accounting
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Weekly seller
              <span className="block text-[#181411]">payouts</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Track seller earnings, deduct Nefo commission, view seller bank
              details, and calculate net weekly payout.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <Link
            to="/owner-dashboard"
            className="rounded-2xl border border-[#D8C9B3] bg-white px-4 py-4 text-center text-sm font-black text-[#3F5128] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Owner Dashboard
          </Link>

          <Link
            to="/owner-seller-applications"
            className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
          >
            Applications
          </Link>

          <button
            type="button"
            onClick={downloadAccountingCSV}
            className="col-span-2 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-4 py-4 text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-95"
          >
            Download Payout CSV
          </button>
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

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={INPUT}
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
              Loading accounting data...
            </p>
          </section>
        ) : null}

        {!loading && errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-black text-red-600">
              Could not load accounting page.
            </p>

            <p className="mt-2 text-sm font-semibold text-red-500">
              {errorMessage}
            </p>
          </div>
        ) : null}

        {!loading && !errorMessage ? (
          <>
            <section className="mt-5 grid grid-cols-2 gap-3">
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
                title="Net Payout"
                value={`₹${analytics.sellerNetPayout}`}
              />
              <AccountingCard
                title="Platform Fee"
                value={`₹${analytics.platformRevenue}`}
              />
              <AccountingCard
                title="Nefo Earning"
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

            <section className={`mt-5 p-5 ${CARD}`}>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Weekly Payout Logic
              </p>

              <h2 className="mt-1 text-2xl font-black leading-tight text-[#181411]">
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
            </section>

            <section className="mt-5 rounded-[28px] border border-[#3F5128] bg-[#3F5128] p-5 text-white shadow-xl shadow-[#3F5128]/15">
              <p className="text-xs font-black uppercase tracking-wide text-[#F3C06E]">
                Payout Rule
              </p>

              <h2 className="mt-2 text-2xl font-black leading-tight">
                Weekly payout = seller earning minus commission
              </h2>

              <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">
                For every non-cancelled order, Nefo calculates seller food
                earning, deducts seller commission, and shows the net payout
                amount before weekly settlement.
              </p>

              <p className="mt-5 text-sm font-black text-[#F3C06E]">
                Current commission: {Math.round(SELLER_COMMISSION_RATE * 100)}%
              </p>
            </section>

            <section className={`mt-5 p-5 ${CARD}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                    Weekly Seller Payout Ledger
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-[#181411]">
                    Amount to send
                  </h2>
                </div>

                <p className="shrink-0 text-sm font-black text-[#6B6258]">
                  {sellerLedger.length}
                </p>
              </div>

              {sellerLedger.length === 0 ? (
                <div className={`mt-6 p-8 text-center ${SOFT_CARD}`}>
                  <p className="font-bold text-[#6B6258]">
                    No seller payout data found for selected filters.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {sellerLedger.map((seller) => (
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
                            {seller.phone || seller.email || "No contact"}
                          </p>
                        </div>

                        <p className="shrink-0 text-xl font-black text-[#3F5128]">
                          ₹{seller.sellerNetPayout}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <SmallMetric label="Orders" value={seller.totalOrders} />
                        <SmallMetric
                          label="Done"
                          value={seller.completedOrders}
                        />
                        <SmallMetric
                          label="Pending"
                          value={seller.pendingPayments}
                        />
                      </div>

                      <div className="mt-4 space-y-2 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                        <DetailLine
                          label="Gross Sales"
                          value={`₹${seller.grossSales}`}
                        />
                        <DetailLine
                          label="Seller Earning"
                          value={`₹${seller.sellerGrossEarning}`}
                        />
                        <DetailLine
                          label="Commission"
                          value={`₹${seller.sellerCommission}`}
                        />
                        <DetailLine
                          label="Platform Fee"
                          value={`₹${seller.platformFee}`}
                        />
                        <DetailLine
                          label="Nefo Earning"
                          value={`₹${seller.nefoTotalEarning}`}
                        />
                      </div>

                      <div className="mt-4 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                          Bank Details
                        </p>

                        <div className="mt-3 space-y-2">
                          <DetailLine
                            label="Holder"
                            value={seller.bankAccountHolder || "Not added"}
                          />
                          <DetailLine
                            label="Bank"
                            value={seller.bankName || "Not added"}
                          />
                          <DetailLine
                            label="A/C"
                            value={seller.bankAccountNumber || "Not added"}
                          />
                          <DetailLine
                            label="IFSC"
                            value={seller.bankIfsc || "Not added"}
                          />
                          <DetailLine
                            label="UPI"
                            value={seller.bankUpiId || "-"}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${
                            seller.pendingPayments > 0
                              ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                              : "border-green-200 bg-green-50 text-green-700"
                          }`}
                        >
                          {seller.pendingPayments > 0
                            ? "Hold / Verify"
                            : "Ready to Pay"}
                        </span>
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
                    Accounting Register
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-[#181411]">
                    Order-wise payout
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
                  {filteredOrders.map((order) => {
                    const sellerProfile = getSellerProfile(order);

                    return (
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
                              ₹{Number(order.total_amount || 0)}
                            </h3>
                          </div>

                          <p className="shrink-0 text-right text-xs font-semibold leading-relaxed text-[#6B6258]">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>

                        <div className="mt-4 space-y-2 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                          <DetailLine
                            label="Customer"
                            value={`${order.customer_name || "Unknown"} • ${
                              order.phone || "No phone"
                            }`}
                          />
                          <DetailLine
                            label="Kitchen"
                            value={getSellerName(order)}
                          />
                          <DetailLine
                            label="Delivery"
                            value={`${order.delivery_type || "Delivery"} • ${
                              order.flat || "No flat"
                            }`}
                          />
                          <DetailLine label="Items" value={getItemsText(order)} />
                        </div>

                        <div className="mt-4 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                          <p className="text-sm font-black text-[#3F5128]">
                            Seller Bank Details
                          </p>

                          <div className="mt-3 space-y-2">
                            <DetailLine
                              label="Holder"
                              value={
                                sellerProfile.bank_account_holder || "Not added"
                              }
                            />
                            <DetailLine
                              label="Bank"
                              value={sellerProfile.bank_name || "Not added"}
                            />
                            <DetailLine
                              label="A/C"
                              value={
                                sellerProfile.bank_account_number || "Not added"
                              }
                            />
                            <DetailLine
                              label="IFSC"
                              value={sellerProfile.bank_ifsc || "Not added"}
                            />
                            <DetailLine
                              label="UPI"
                              value={sellerProfile.bank_upi_id || "-"}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <MoneyPill
                            label="Seller"
                            value={`₹${getSellerGrossEarning(order)}`}
                          />
                          <MoneyPill
                            label="Commission"
                            value={`₹${getSellerCommission(order)}`}
                            danger
                          />
                          <MoneyPill
                            label="Net Payout"
                            value={`₹${getSellerNetPayout(order)}`}
                          />
                          <MoneyPill
                            label="Nefo"
                            value={`₹${getNefoTotalEarning(order)}`}
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
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function AccountingCard({ title, value }) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-4 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#6B6258]">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-[#3F5128]">{value}</p>
    </div>
  );
}

function MoneyRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4">
      <p className="text-sm font-bold text-[#6B6258]">{label}</p>
      <p className="shrink-0 text-sm font-black text-[#3F5128]">{value}</p>
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

function MoneyPill({ label, value, danger = false }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-3 ${
        danger ? "border-red-200" : "border-[#D8C9B3]"
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase ${
          danger ? "text-red-500" : "text-[#6B6258]"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-1 font-black ${
          danger ? "text-red-500" : "text-[#3F5128]"
        }`}
      >
        {value}
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
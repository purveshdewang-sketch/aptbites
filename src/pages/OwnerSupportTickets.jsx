import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-black text-[#181411] outline-none focus:border-[#CF743D] focus:bg-white";

const CUSTOMER_TICKET_TYPE = "customer";
const SELLER_TICKET_TYPE = "seller";

export default function OwnerSupportTickets() {
  const navigate = useNavigate();

  const [customerTickets, setCustomerTickets] = useState([]);
  const [sellerTickets, setSellerTickets] = useState([]);
  const [profileMap, setProfileMap] = useState({});
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchTickets();

    const customerChannel = supabase
      .channel("owner-support-customer-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchTickets(false);
        }
      )
      .subscribe();

    const sellerChannel = supabase
      .channel("owner-support-seller-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "seller_support_tickets",
        },
        () => {
          fetchTickets(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(customerChannel);
      supabase.removeChannel(sellerChannel);
    };
  }, []);

  async function fetchTickets(showLoading = true) {
    if (showLoading) setLoading(true);

    setErrorMessage("");
    setSuccessMessage("");

    const [customerResult, sellerResult] = await Promise.all([
      supabase
        .from("support_tickets")
        .select("*")
        .order("id", { ascending: false })
        .limit(100),
      supabase
        .from("seller_support_tickets")
        .select("*")
        .order("id", { ascending: false })
        .limit(100),
    ]);

    if (customerResult.error || sellerResult.error) {
      const message = [
        customerResult.error ? `Customer tickets: ${customerResult.error.message}` : "",
        sellerResult.error ? `Seller tickets: ${sellerResult.error.message}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      setErrorMessage(message || "Could not load support tickets.");
      setCustomerTickets([]);
      setSellerTickets([]);
      setLoading(false);
      return;
    }

    const customerData = customerResult.data || [];
    const sellerData = sellerResult.data || [];

    const userIds = [
      ...new Set(
        [
          ...customerData.map((ticket) => ticket.user_id),
          ...sellerData.map((ticket) => ticket.seller_id),
        ].filter(Boolean)
      ),
    ];

    const nextProfileMap = {};

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, seller_kitchen_name")
        .in("id", userIds);

      (profileData || []).forEach((profile) => {
        nextProfileMap[profile.id] = profile;
      });
    }

    setProfileMap(nextProfileMap);
    setCustomerTickets(customerData);
    setSellerTickets(sellerData);
    setLoading(false);
  }

  function normalizeStatus(status) {
    return String(status || "open").toLowerCase();
  }

  function formatStatusLabel(status) {
    const value = normalizeStatus(status);
    if (value === "in_progress") return "in progress";
    return value;
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

  function getProfileName(profileId) {
    const profile = profileMap[profileId];

    if (!profile) return "Unknown user";
    if (profile.seller_kitchen_name) return profile.seller_kitchen_name;
    if (profile.full_name) return profile.full_name;
    if (profile.email) return profile.email;

    return "Unknown user";
  }

  function getProfileMeta(profileId) {
    const profile = profileMap[profileId];

    if (!profile) return profileId || "-";

    return [profile.email, profile.phone, profile.role]
      .filter(Boolean)
      .join(" • ");
  }

  function getStatusClass(status) {
    const value = normalizeStatus(status);

    if (value === "closed" || value === "resolved") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (value === "in_progress") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }

    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  const allTickets = useMemo(() => {
    const customerRows = customerTickets.map((ticket) => ({
      ...ticket,
      ticketType: CUSTOMER_TICKET_TYPE,
      ownerId: ticket.user_id,
      displayId: `C-${ticket.id}`,
    }));

    const sellerRows = sellerTickets.map((ticket) => ({
      ...ticket,
      ticketType: SELLER_TICKET_TYPE,
      ownerId: ticket.seller_id,
      displayId: `S-${ticket.id}`,
    }));

    return [...customerRows, ...sellerRows].sort((first, second) => {
      return Number(second.id || 0) - Number(first.id || 0);
    });
  }, [customerTickets, sellerTickets]);

  const filteredTickets = useMemo(() => {
    return allTickets.filter((ticket) => {
      const matchesType =
        ticketTypeFilter === "all" || ticket.ticketType === ticketTypeFilter;

      const ticketStatus = normalizeStatus(ticket.status);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? ticketStatus !== "closed" && ticketStatus !== "resolved"
          : ticketStatus === statusFilter);

      return matchesType && matchesStatus;
    });
  }, [allTickets, ticketTypeFilter, statusFilter]);

  const analytics = useMemo(() => {
    const open = allTickets.filter(
      (ticket) => normalizeStatus(ticket.status) === "open"
    ).length;

    const inProgress = allTickets.filter(
      (ticket) => normalizeStatus(ticket.status) === "in_progress"
    ).length;

    const resolved = allTickets.filter((ticket) => {
      const status = normalizeStatus(ticket.status);
      return status === "resolved" || status === "closed";
    }).length;

    return {
      total: allTickets.length,
      customer: customerTickets.length,
      seller: sellerTickets.length,
      open,
      inProgress,
      resolved,
    };
  }, [allTickets, customerTickets, sellerTickets]);

  async function updateTicketStatus(ticket, nextStatus) {
    const actionKey = `${ticket.ticketType}-${ticket.id}-${nextStatus}`;

    setActionLoadingKey(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    const tableName =
      ticket.ticketType === SELLER_TICKET_TYPE
        ? "seller_support_tickets"
        : "support_tickets";

    const { error } = await supabase
      .from(tableName)
      .update({
        status: nextStatus,
      })
      .eq("id", ticket.id);

    if (error) {
      setErrorMessage(error.message);
      setActionLoadingKey("");
      return;
    }

    setSuccessMessage(`Ticket ${ticket.displayId} marked ${formatStatusLabel(nextStatus)}.`);
    setActionLoadingKey("");
    fetchTickets(false);
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
              Owner Support
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Support
              <span className="block text-[#181411]">tickets</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Review customer and seller tickets, track open issues, and close resolved cases.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <StatCard title="Total" value={analytics.total} />
          <StatCard title="Open" value={analytics.open} />
          <StatCard title="In Progress" value={analytics.inProgress} />
          <StatCard title="Resolved" value={analytics.resolved} />
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3">
          <StatCard title="Customer" value={analytics.customer} />
          <StatCard title="Seller" value={analytics.seller} />
        </section>

        <section className={`mt-5 p-4 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Filters
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <select
              value={ticketTypeFilter}
              onChange={(event) => setTicketTypeFilter(event.target.value)}
              className={INPUT}
            >
              <option value="all">All Ticket Types</option>
              <option value="customer">Customer Tickets</option>
              <option value="seller">Seller Tickets</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={INPUT}
            >
              <option value="open">Open Tickets</option>
              <option value="in_progress">In Progress</option>
              <option value="active">All Active</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="all">All Statuses</option>
            </select>

            <button
              type="button"
              onClick={() => fetchTickets()}
              disabled={loading}
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-5 py-4 font-black text-[#3F5128] active:scale-95 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <Link
            to="/owner-dashboard"
            className="rounded-2xl border border-[#D8C9B3] bg-white px-4 py-4 text-center text-sm font-black text-[#3F5128] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Owner Dashboard
          </Link>

          <Link
            to="/owner-seller-applications"
            className="rounded-2xl border border-[#CF743D] bg-[#CF743D] px-4 py-4 text-center text-sm font-black text-white shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Applications
          </Link>
        </section>

        {successMessage ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-black text-green-700">{successMessage}</p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-black text-red-600">{errorMessage}</p>
          </div>
        ) : null}

        {loading ? (
          <section className={`mt-5 p-8 text-center ${CARD}`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#EADFCE] border-t-[#3F5128] animate-spin" />

            <p className="mt-4 font-bold text-[#6B6258]">
              Loading support tickets...
            </p>
          </section>
        ) : (
          <section className={`mt-5 p-5 ${CARD}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                  Ticket Register
                </p>

                <h2 className="mt-1 text-2xl font-black text-[#181411]">
                  Review issues
                </h2>
              </div>

              <p className="shrink-0 text-sm font-black text-[#6B6258]">
                {filteredTickets.length}
              </p>
            </div>

            {filteredTickets.length === 0 ? (
              <div className={`mt-6 p-8 text-center ${SOFT_CARD}`}>
                <p className="font-bold text-[#6B6258]">
                  No support tickets found for this filter.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredTickets.map((ticket) => {
                  const inProgressKey = `${ticket.ticketType}-${ticket.id}-in_progress`;
                  const resolvedKey = `${ticket.ticketType}-${ticket.id}-resolved`;
                  const closedKey = `${ticket.ticketType}-${ticket.id}-closed`;

                  return (
                    <article
                      key={`${ticket.ticketType}-${ticket.id}`}
                      className="rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 flex-1 text-xl font-black leading-tight text-[#3F5128]">
                          Ticket {ticket.displayId}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(ticket.status)}`}
                        >
                          {formatStatusLabel(ticket.status)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                        <DetailLine
                          label={ticket.ticketType === SELLER_TICKET_TYPE ? "Seller" : "Customer"}
                          value={getProfileName(ticket.ownerId)}
                        />

                        <DetailLine
                          label="Profile"
                          value={getProfileMeta(ticket.ownerId)}
                        />

                        <DetailLine
                          label="Issue"
                          value={ticket.issue_type}
                        />

                        {ticket.order_id ? (
                          <DetailLine label="Order" value={`#${ticket.order_id}`} />
                        ) : null}

                        <DetailLine
                          label="Created"
                          value={formatDateTime(ticket.created_at)}
                        />
                      </div>

                      <div className="mt-4 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                          Message
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[#6B6258]">
                          {ticket.message || "-"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => updateTicketStatus(ticket, "in_progress")}
                          disabled={Boolean(actionLoadingKey) || normalizeStatus(ticket.status) === "in_progress"}
                          className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 font-black text-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoadingKey === inProgressKey ? "Working..." : "Mark In Progress"}
                        </button>

                        <button
                          type="button"
                          onClick={() => updateTicketStatus(ticket, "resolved")}
                          disabled={Boolean(actionLoadingKey) || normalizeStatus(ticket.status) === "resolved"}
                          className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 font-black text-green-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoadingKey === resolvedKey ? "Working..." : "Mark Resolved"}
                        </button>

                        <button
                          type="button"
                          onClick={() => updateTicketStatus(ticket, "closed")}
                          disabled={Boolean(actionLoadingKey) || normalizeStatus(ticket.status) === "closed"}
                          className="rounded-2xl border border-[#D8C9B3] bg-white px-5 py-4 font-black text-[#3F5128] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoadingKey === closedKey ? "Working..." : "Close Ticket"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
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

      <p className="mt-2 text-2xl font-black text-[#3F5128]">{value}</p>
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

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const SOFT_CARD =
  "rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-4 text-sm font-black text-[#181411] outline-none focus:border-[#CF743D] focus:bg-white";

export default function OwnerSellerApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchApplications();

    const channel = supabase
      .channel("owner-seller-applications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "seller_applications",
        },
        () => {
          fetchApplications(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchApplications(showLoading = true) {
    if (showLoading) setLoading(true);

    setErrorMessage("");

    const { data, error } = await supabase
      .from("seller_applications")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setApplications([]);
      setLoading(false);
      return;
    }

    setApplications(data || []);
    setLoading(false);
  }

  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applications;

    return applications.filter((application) => {
      return (
        String(application.status || "pending").toLowerCase() === statusFilter
      );
    });
  }, [applications, statusFilter]);

  const analytics = useMemo(() => {
    const pending = applications.filter(
      (application) =>
        String(application.status || "pending").toLowerCase() === "pending"
    ).length;

    const approved = applications.filter(
      (application) =>
        String(application.status || "").toLowerCase() === "approved"
    ).length;

    const rejected = applications.filter(
      (application) =>
        String(application.status || "").toLowerCase() === "rejected"
    ).length;

    return {
      total: applications.length,
      pending,
      approved,
      rejected,
    };
  }, [applications]);

  function formatDate(value) {
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

  function getStatusClass(status) {
    const currentStatus = String(status || "pending").toLowerCase();

    if (currentStatus === "approved") {
      return "border-green-200 bg-green-50 text-green-700";
    }

    if (currentStatus === "rejected") {
      return "border-red-200 bg-red-50 text-red-600";
    }

    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  async function approveApplication(application) {
    if (!user) return;

    const confirmApprove = window.confirm(
      `Approve ${application.kitchen_name || application.full_name} as a seller?`
    );

    if (!confirmApprove) return;

    setActionLoadingId(application.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.rpc("approve_seller_application", {
      target_application_id: application.id,
    });

    if (error) {
      setErrorMessage(error.message);
      setActionLoadingId(null);
      return;
    }

    setSuccessMessage("Seller application approved.");
    setActionLoadingId(null);
    fetchApplications(false);
  }

  async function rejectApplication(application) {
    if (!user) return;

    const reason = window.prompt(
      "Enter rejection reason. This will be saved for owner reference."
    );

    if (reason === null) return;

    setActionLoadingId(application.id);
    setErrorMessage("");
    setSuccessMessage("");

    const cleanReason = reason.trim() || "Application rejected by owner.";

    const { error } = await supabase.rpc("reject_seller_application", {
      target_application_id: application.id,
      rejection_reason_input: cleanReason,
    });

    if (error) {
      setErrorMessage(error.message);
      setActionLoadingId(null);
      return;
    }

    setSuccessMessage("Seller application rejected.");
    setActionLoadingId(null);
    fetchApplications(false);
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
              Seller Review
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Seller
              <span className="block text-[#181411]">applications</span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Review home kitchen applications, approve trusted sellers, and
              control Seller Dashboard access.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <StatCard title="Total" value={analytics.total} />
          <StatCard title="Pending" value={analytics.pending} />
          <StatCard title="Approved" value={analytics.approved} />
          <StatCard title="Rejected" value={analytics.rejected} />
        </section>

        <section className={`mt-5 p-4 ${CARD}`}>
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Filter
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={INPUT}
            >
              <option value="pending">Pending Applications</option>
              <option value="approved">Approved Applications</option>
              <option value="rejected">Rejected Applications</option>
              <option value="all">All Applications</option>
            </select>

            <button
              type="button"
              onClick={() => fetchApplications()}
              className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-5 py-4 font-black text-[#3F5128] active:scale-95"
            >
              Refresh
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
            to="/owner-accounting"
            className="rounded-2xl border border-[#CF743D] bg-[#CF743D] px-4 py-4 text-center text-sm font-black text-white shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)] active:scale-95"
          >
            Accounting
          </Link>
        </section>

        {successMessage ? (
          <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-black text-green-700">
              {successMessage}
            </p>
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
              Loading seller applications...
            </p>
          </section>
        ) : (
          <section className={`mt-5 p-5 ${CARD}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                  Application Register
                </p>

                <h2 className="mt-1 text-2xl font-black text-[#181411]">
                  Review kitchens
                </h2>
              </div>

              <p className="shrink-0 text-sm font-black text-[#6B6258]">
                {filteredApplications.length}
              </p>
            </div>

            {filteredApplications.length === 0 ? (
              <div className={`mt-6 p-8 text-center ${SOFT_CARD}`}>
                <p className="font-bold text-[#6B6258]">
                  No seller applications found.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredApplications.map((application) => {
                  const status = String(
                    application.status || "pending"
                  ).toLowerCase();
                  const isPending = status === "pending";
                  const isWorking = actionLoadingId === application.id;

                  return (
                    <article
                      key={application.id}
                      className="rounded-[24px] border border-[#D8C9B3] bg-[#FFFDF7] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 flex-1 text-xl font-black leading-tight text-[#3F5128]">
                          {application.kitchen_name || "Unnamed Kitchen"}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
                            application.status
                          )}`}
                        >
                          {application.status || "pending"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 rounded-2xl border border-[#D8C9B3] bg-white p-4">
                        <DetailLine
                          label="Applicant"
                          value={`${application.full_name || "-"} • ${
                            application.phone || "-"
                          }`}
                        />
                        <DetailLine label="Email" value={application.email} />
                        <DetailLine
                          label="Address"
                          value={`${application.apartment_name || "-"}${
                            application.block
                              ? ` • Block ${application.block}`
                              : ""
                          }${
                            application.flat
                              ? ` • Flat ${application.flat}`
                              : ""
                          }`}
                        />
                        <DetailLine
                          label="Applied"
                          value={formatDate(application.created_at)}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <InfoBox
                          title="Food Specialty"
                          value={application.food_specialty}
                        />

                        <InfoBox
                          title="Experience"
                          value={application.experience}
                        />

                        <InfoBox
                          title="About Kitchen"
                          value={application.about_kitchen}
                        />

                        <InfoBox
                          title="Hygiene Note"
                          value={application.hygiene_note}
                        />
                      </div>

                      {application.rejection_reason ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-red-600">
                            Rejection Reason
                          </p>

                          <p className="mt-1 text-sm font-bold leading-relaxed text-red-500">
                            {application.rejection_reason}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => approveApplication(application)}
                          disabled={!isPending || isWorking}
                          className="rounded-2xl border border-[#3F5128] bg-[#3F5128] px-5 py-4 font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isWorking ? "Working..." : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectApplication(application)}
                          disabled={!isPending || isWorking}
                          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-black text-red-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Reject
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

function InfoBox({ title, value }) {
  return (
    <div className="rounded-2xl border border-[#D8C9B3] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
        {title}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[#6B6258]">
        {value || "-"}
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
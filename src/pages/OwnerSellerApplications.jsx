import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function OwnerSellerApplications() {
  const { user } = useAuth();

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
      return String(application.status || "pending").toLowerCase() === statusFilter;
    });
  }, [applications, statusFilter]);

  const analytics = useMemo(() => {
    const pending = applications.filter(
      (application) => String(application.status || "pending").toLowerCase() === "pending"
    ).length;

    const approved = applications.filter(
      (application) => String(application.status || "").toLowerCase() === "approved"
    ).length;

    const rejected = applications.filter(
      (application) => String(application.status || "").toLowerCase() === "rejected"
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

    return date.toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getStatusClass(status) {
    const currentStatus = String(status || "pending").toLowerCase();

    if (currentStatus === "approved") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (currentStatus === "rejected") {
      return "bg-red-50 text-red-600 border-red-200";
    }

    return "bg-yellow-50 text-yellow-700 border-yellow-200";
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

    const { error: applicationError } = await supabase
      .from("seller_applications")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", application.id);

    if (applicationError) {
      setErrorMessage(applicationError.message);
      setActionLoadingId(null);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "seller",
        is_seller: true,
        full_name: application.full_name || "",
        phone: application.phone || "",
        apartment_name: application.apartment_name || "",
        block: application.block || "",
        flat: application.flat || "",
        seller_kitchen_name: application.kitchen_name || "",
        seller_specialty: application.food_specialty || "",
        seller_about: application.about_kitchen || "",
        seller_experience: application.experience || "",
        seller_hygiene_note: application.hygiene_note || "",
        seller_application_status: "approved",
        seller_approved_at: new Date().toISOString(),
        seller_rejected_reason: null,
      })
      .eq("id", application.user_id);

    if (profileError) {
      setErrorMessage(profileError.message);
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

    const { error: applicationError } = await supabase
      .from("seller_applications")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: cleanReason,
      })
      .eq("id", application.id);

    if (applicationError) {
      setErrorMessage(applicationError.message);
      setActionLoadingId(null);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: "customer",
        is_seller: false,
        seller_application_status: "rejected",
        seller_rejected_reason: cleanReason,
      })
      .eq("id", application.user_id);

    if (profileError) {
      setErrorMessage(profileError.message);
      setActionLoadingId(null);
      return;
    }

    setSuccessMessage("Seller application rejected.");
    setActionLoadingId(null);
    fetchApplications(false);
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FFFFF2] text-[#111827] px-4 sm:px-6 py-6 sm:py-10 pb-28">
        <div className="max-w-7xl mx-auto">
          <section className="relative overflow-hidden bg-white/90 border border-[#D7F5EF] rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-[#073B35]/5">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#41D3BD]/20 rounded-full blur-[95px]" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#41D3BD]/12 border border-[#41D3BD]/25 text-[#073B35] px-3 py-1.5 rounded-full text-xs font-black">
                  <span>✅</span>
                  <span>Seller Review</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black mt-5 leading-[0.98] tracking-tight text-[#073B35]">
                  Seller
                  <span className="block text-[#111827]">applications</span>
                </h1>

                <p className="text-[#51615D] mt-4 text-sm sm:text-lg max-w-2xl leading-relaxed">
                  Review home kitchen applications, approve trusted sellers, and
                  control who can access the Seller Dashboard.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/owner-dashboard"
                  className="bg-[#FFFFF2] border border-[#D7F5EF] hover:bg-[#D7F5EF] text-[#073B35] font-black px-5 py-3 rounded-2xl transition-all"
                >
                  Owner Dashboard
                </Link>

                <Link
                  to="/owner-accounting"
                  className="bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black px-5 py-3 rounded-2xl transition-all shadow-lg shadow-[#41D3BD]/20"
                >
                  Accounting
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total" value={analytics.total} />
            <StatCard title="Pending" value={analytics.pending} />
            <StatCard title="Approved" value={analytics.approved} />
            <StatCard title="Rejected" value={analytics.rejected} />
          </section>

          <section className="mt-6 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-4 sm:p-5 shadow-lg shadow-[#073B35]/5">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-[#FFFFF2] border border-[#D7F5EF] text-[#111827] rounded-2xl px-5 py-4 outline-none focus:border-[#41D3BD] font-bold"
              >
                <option value="pending">Pending Applications</option>
                <option value="approved">Approved Applications</option>
                <option value="rejected">Rejected Applications</option>
                <option value="all">All Applications</option>
              </select>

              <button
                type="button"
                onClick={() => fetchApplications()}
                className="bg-[#FFFFF2] border border-[#41D3BD]/45 hover:bg-[#D7F5EF] text-[#073B35] font-black px-5 py-4 rounded-2xl transition-all"
              >
                Refresh
              </button>
            </div>
          </section>

          {successMessage && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-3xl p-5 text-green-700 font-bold">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-3xl p-5 text-red-600 font-bold">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-3xl p-8 text-center">
              <p className="text-[#51615D] font-bold">
                Loading seller applications...
              </p>
            </div>
          ) : (
            <section className="mt-8 bg-white/90 border border-[#D7F5EF] rounded-[2rem] p-5 sm:p-6 shadow-xl shadow-[#073B35]/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[#1A9F8D] font-black uppercase tracking-wide text-xs">
                    Application Register
                  </p>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1">
                    Review kitchens
                  </h2>
                </div>

                <p className="text-[#51615D] text-sm font-bold">
                  {filteredApplications.length} records
                </p>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="mt-6 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-8 text-center">
                  <p className="text-[#51615D] font-bold">
                    No seller applications found.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredApplications.map((application) => {
                    const status = String(application.status || "pending").toLowerCase();
                    const isPending = status === "pending";

                    return (
                      <article
                        key={application.id}
                        className="bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl p-4 sm:p-5"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-black text-[#073B35]">
                                {application.kitchen_name || "Unnamed Kitchen"}
                              </h3>

                              <span
                                className={`border text-xs font-black px-3 py-1.5 rounded-full ${getStatusClass(
                                  application.status
                                )}`}
                              >
                                {application.status || "pending"}
                              </span>
                            </div>

                            <p className="text-[#51615D] text-sm font-bold mt-2">
                              Applicant: {application.full_name || "-"} •{" "}
                              {application.phone || "-"}
                            </p>

                            <p className="text-[#51615D] text-sm mt-1">
                              Email: {application.email || "-"}
                            </p>

                            <p className="text-[#51615D] text-sm mt-1">
                              Address: {application.apartment_name || "-"}{" "}
                              {application.block ? `• Block ${application.block}` : ""}{" "}
                              {application.flat ? `• Flat ${application.flat}` : ""}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
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

                            {application.rejection_reason && (
                              <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
                                <p className="text-red-600 text-xs font-black uppercase">
                                  Rejection Reason
                                </p>

                                <p className="text-red-500 text-sm font-bold mt-1">
                                  {application.rejection_reason}
                                </p>
                              </div>
                            )}

                            <p className="text-[#51615D] text-xs font-bold mt-4">
                              Applied: {formatDate(application.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 lg:w-48">
                            <button
                              type="button"
                              onClick={() => approveApplication(application)}
                              disabled={!isPending || actionLoadingId === application.id}
                              className="bg-[#073B35] hover:bg-[#0B5149] disabled:opacity-40 text-white font-black px-5 py-3 rounded-2xl transition-all"
                            >
                              {actionLoadingId === application.id
                                ? "Working..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              onClick={() => rejectApplication(application)}
                              disabled={!isPending || actionLoadingId === application.id}
                              className="bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-600 border border-red-200 font-black px-5 py-3 rounded-2xl transition-all"
                            >
                              Reject
                            </button>
                          </div>
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
    </>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white/90 border border-[#D7F5EF] rounded-3xl p-5 shadow-lg shadow-[#073B35]/5">
      <p className="text-[#51615D] text-xs uppercase font-black">{title}</p>

      <p className="text-2xl sm:text-3xl font-black text-[#073B35] mt-3">
        {value}
      </p>
    </div>
  );
}

function InfoBox({ title, value }) {
  return (
    <div className="bg-white border border-[#D7F5EF] rounded-2xl p-4">
      <p className="text-[#1A9F8D] text-xs font-black uppercase">{title}</p>

      <p className="text-[#51615D] text-sm font-bold mt-2 whitespace-pre-wrap">
        {value || "-"}
      </p>
    </div>
  );
}
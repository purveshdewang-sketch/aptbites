import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const MENU_CARD =
  "rounded-[28px] border border-[#D7F5EF] bg-[#FFFFF2] shadow-[8px_8px_22px_rgba(7,59,53,0.16),-8px_-8px_22px_rgba(255,255,255,0.95)]";

export default function Navbar() {
  const { cartCount } = useCart();
  const { user, signOut, authLoading } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sellerApplicationStatus, setSellerApplicationStatus] =
    useState("not_applied");

  const dropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function checkUserRoles() {
      if (!user) {
        setIsSeller(false);
        setIsAdmin(false);
        setSellerApplicationStatus("not_applied");
        return;
      }

      const metadataRole = String(user?.user_metadata?.role || "").toLowerCase();

      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_seller, seller_application_status")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        const metadataIsAdmin = metadataRole === "admin";
        const metadataIsSeller = metadataRole === "seller";

        setIsAdmin(metadataIsAdmin);
        setIsSeller(metadataIsAdmin || metadataIsSeller);
        setSellerApplicationStatus("not_applied");
        return;
      }

      const profileRole = String(data?.role || "").toLowerCase();
      const applicationStatus = String(
        data?.seller_application_status || "not_applied"
      ).toLowerCase();

      const adminAllowed = profileRole === "admin" || metadataRole === "admin";

      const sellerAllowed =
        adminAllowed ||
        (profileRole === "seller" &&
          data?.is_seller === true &&
          applicationStatus === "approved");

      setIsAdmin(adminAllowed);
      setIsSeller(sellerAllowed);
      setSellerApplicationStatus(applicationStatus);
    }

    checkUserRoles();
  }, [user, location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }

      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSellerAction() {
    setProfileOpen(false);
    setMobileMenuOpen(false);

    if (isSeller) {
      navigate("/seller-dashboard");
      return;
    }

    navigate("/seller-registration");
  }

  async function handleLogout() {
    await signOut();
    setProfileOpen(false);
    setMobileMenuOpen(false);
    setIsSeller(false);
    setIsAdmin(false);
    setSellerApplicationStatus("not_applied");
    navigate("/");
  }

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Marketplace", path: "/marketplace" },
  ];

  function getInitial() {
    if (!user?.email) return "N";
    return user.email.charAt(0).toUpperCase();
  }

  function getAccountLabel() {
    if (isAdmin) return "Admin account";
    if (isSeller) return "Approved seller";
    if (sellerApplicationStatus === "pending") return "Seller review pending";
    if (sellerApplicationStatus === "rejected") {
      return "Seller application rejected";
    }
    return "Customer account";
  }

  function getSellerActionLabel() {
    if (isSeller) return "Seller Dashboard";
    if (sellerApplicationStatus === "pending") {
      return "Seller Application Pending";
    }
    if (sellerApplicationStatus === "rejected") return "Re-apply to Sell";
    return "Apply to Sell on Nefo";
  }

  function isActive(path) {
    return location.pathname === path;
  }

  function LogoMark() {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] shadow-[4px_4px_10px_rgba(7,59,53,0.10),-4px_-4px_10px_rgba(255,255,255,0.95)]">
        {!logoFailed ? (
          <img
            src="/Nefo-logo.png"
            alt="Nefo"
            className="h-full w-full scale-[1.65] object-cover"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-base font-black text-[#073B35]">N</span>
        )}
      </div>
    );
  }

  if (authLoading) {
    return (
      <header className="sticky top-0 z-[900] border-b border-[#D7F5EF] bg-[#FFFFF2]/95 backdrop-blur-xl">
        <div className="mx-auto h-[74px] max-w-md px-4" />
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-[900] border-b border-[#D7F5EF] bg-[#FFFFF2]/95 shadow-[0_8px_24px_rgba(7,59,53,0.06)] backdrop-blur-xl">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-[74px] items-center justify-between gap-3">
            <Link to="/" className="group flex min-w-0 items-center gap-3">
              <LogoMark />

              <div className="min-w-0 leading-none">
                <p className="truncate text-2xl font-black tracking-tight text-[#073B35] transition-all group-hover:text-[#0B8F80] sm:text-xl">
                  Nefo
                </p>

                <p className="mt-2 truncate text-[10px] font-black uppercase tracking-wide text-[#51615D]">
                  Neighbourhood Food
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-7 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-black transition-all duration-200 ${
                    isActive(link.path)
                      ? "text-[#073B35]"
                      : "text-[#51615D] hover:text-[#073B35]"
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {isAdmin ? (
                <>
                  <Link
                    to="/owner-dashboard"
                    className={`text-sm font-black transition-all duration-200 ${
                      isActive("/owner-dashboard")
                        ? "text-[#073B35]"
                        : "text-[#51615D] hover:text-[#073B35]"
                    }`}
                  >
                    Owner Dashboard
                  </Link>

                  <Link
                    to="/owner-accounting"
                    className={`text-sm font-black transition-all duration-200 ${
                      isActive("/owner-accounting")
                        ? "text-[#073B35]"
                        : "text-[#51615D] hover:text-[#073B35]"
                    }`}
                  >
                    Accounting
                  </Link>

                  <Link
                    to="/owner-seller-applications"
                    className={`text-sm font-black transition-all duration-200 ${
                      isActive("/owner-seller-applications")
                        ? "text-[#073B35]"
                        : "text-[#51615D] hover:text-[#073B35]"
                    }`}
                  >
                    Applications
                  </Link>
                </>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!user ? (
                <Link
                  to="/customer-login"
                  className="hidden rounded-2xl border border-[#41D3BD] bg-[#41D3BD] px-5 py-2.5 text-sm font-black text-[#073B35] shadow-lg shadow-[#41D3BD]/20 transition-all duration-200 active:scale-95 md:flex"
                >
                  Sign In
                </Link>
              ) : null}

              <Link
                to="/cart"
                aria-label="Cart"
                className="relative flex h-[52px] w-[52px] items-center justify-center gap-2 rounded-2xl border border-[#BDEFE6] bg-white text-[#073B35] shadow-[4px_4px_12px_rgba(7,59,53,0.08),-4px_-4px_12px_rgba(255,255,255,0.95)] transition-all duration-200 active:scale-95 sm:h-auto sm:w-auto sm:px-4 sm:py-2.5"
              >
                <span className="text-xl">🛒</span>

                <span className="hidden text-sm font-black sm:inline">
                  Cart
                </span>

                {cartCount > 0 ? (
                  <div className="absolute -right-2 -top-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-[#073B35] bg-[#41D3BD] px-1">
                    <span className="text-[11px] font-black text-[#073B35]">
                      {cartCount}
                    </span>
                  </div>
                ) : null}
              </Link>

              {user ? (
                <>
                  <div className="relative hidden md:block" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#41D3BD] bg-[#41D3BD] font-black text-[#073B35] shadow-lg shadow-[#41D3BD]/20 transition-all duration-200 active:scale-95"
                    >
                      {getInitial()}
                    </button>

                    {profileOpen ? (
                      <div
                        className={`absolute right-0 mt-3 w-72 overflow-hidden ${MENU_CARD}`}
                      >
                        <div className="border-b border-[#D7F5EF] p-5">
                          <p className="truncate font-black text-[#111827]">
                            {user.email}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-[#51615D]">
                            {getAccountLabel()}
                          </p>
                        </div>

                        <div className="p-2">
                          <DesktopMenuLinks
                            isAdmin={isAdmin}
                            isSeller={isSeller}
                            handleSellerAction={handleSellerAction}
                            getSellerActionLabel={getSellerActionLabel}
                            handleLogout={handleLogout}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open menu"
                    className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-[#41D3BD] bg-[#41D3BD] text-xl font-black text-[#073B35] shadow-lg shadow-[#41D3BD]/20 transition-all duration-200 active:scale-95 md:hidden"
                  >
                    {getInitial()}
                  </button>
                </>
              ) : (
                <Link
                  to="/customer-login"
                  aria-label="Sign in"
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-[#41D3BD] bg-[#41D3BD] text-xl font-black text-[#073B35] shadow-lg shadow-[#41D3BD]/20 transition-all duration-200 active:scale-95 md:hidden"
                >
                  →
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {mobileMenuOpen && user ? (
        <div className="fixed inset-0 z-[950] bg-[#073B35]/55 backdrop-blur-sm md:hidden">
          <div
            ref={mobileDropdownRef}
            className={`absolute left-3 right-3 top-[86px] max-h-[calc(100vh-104px)] overflow-hidden ${MENU_CARD}`}
          >
            <div className="border-b border-[#D7F5EF] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#41D3BD] bg-[#41D3BD] text-xl font-black text-[#073B35] shadow-lg shadow-[#41D3BD]/20">
                  {getInitial()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-[#111827]">
                    {user.email}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#51615D]">
                    {getAccountLabel()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BDEFE6] bg-white text-[#073B35] font-black"
                  aria-label="Close menu"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-3">
              <div className="grid gap-2">
                <MobileLink to="/" active={isActive("/")} label="Home" />

                <MobileLink
                  to="/marketplace"
                  active={isActive("/marketplace")}
                  label="Marketplace"
                />

                <MobileLink
                  to="/profile"
                  active={isActive("/profile")}
                  label="My Profile"
                />

                {isAdmin ? (
                  <>
                    <MobileDivider />

                    <MobileLink
                      to="/owner-dashboard"
                      active={isActive("/owner-dashboard")}
                      label="Owner Dashboard"
                      highlight
                    />

                    <MobileLink
                      to="/owner-accounting"
                      active={isActive("/owner-accounting")}
                      label="Owner Accounting"
                      highlight
                    />

                    <MobileLink
                      to="/owner-seller-applications"
                      active={isActive("/owner-seller-applications")}
                      label="Seller Applications"
                      highlight
                    />
                  </>
                ) : null}

                <MobileDivider />

                <MobileLink
                  to="/orders"
                  active={isActive("/orders")}
                  label="Active Orders"
                />

                <MobileLink
                  to="/order-history"
                  active={isActive("/order-history")}
                  label="Order History"
                />

                <MobileLink
                  to="/customer-care"
                  active={isActive("/customer-care")}
                  label="Customer Care"
                />

                {isSeller ? (
                  <MobileLink
                    to="/seller-helper"
                    active={isActive("/seller-helper")}
                    label="Seller Assistant"
                    highlight
                  />
                ) : null}

                <button
                  type="button"
                  onClick={handleSellerAction}
                  className="rounded-2xl border border-[#BDEFE6] bg-[#FFFFF2] px-4 py-4 text-left text-sm font-black text-[#073B35]"
                >
                  {getSellerActionLabel()}
                </button>

                <MobileDivider />

                <MobileLink
                  to="/privacy-policy"
                  active={isActive("/privacy-policy")}
                  label="Privacy Policy"
                />

                <MobileLink
                  to="/terms"
                  active={isActive("/terms")}
                  label="Terms & Conditions"
                />

                <MobileLink
                  to="/refund-policy"
                  active={isActive("/refund-policy")}
                  label="Refund Policy"
                />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left text-sm font-black text-red-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DesktopMenuLinks({
  isAdmin,
  isSeller,
  handleSellerAction,
  getSellerActionLabel,
  handleLogout,
}) {
  return (
    <>
      <DesktopLink to="/profile" label="My Profile" />
      <DesktopLink to="/marketplace" label="Marketplace" />
      <DesktopLink to="/orders" label="Active Orders" />
      <DesktopLink to="/order-history" label="Order History" />
      <DesktopLink to="/customer-care" label="Customer Care" />

      {isAdmin ? (
        <>
          <DesktopDivider />
          <DesktopLink to="/owner-dashboard" label="Owner Dashboard" highlight />
          <DesktopLink
            to="/owner-accounting"
            label="Owner Accounting"
            highlight
          />
          <DesktopLink
            to="/owner-seller-applications"
            label="Seller Applications"
            highlight
          />
        </>
      ) : null}

      {isSeller ? (
        <DesktopLink to="/seller-helper" label="Seller Assistant" highlight />
      ) : null}

      <button
        type="button"
        onClick={handleSellerAction}
        className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-black transition-all ${
          isSeller
            ? "text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#073B35]"
            : "text-[#073B35] hover:bg-[#D7F5EF]"
        }`}
      >
        {getSellerActionLabel()}
      </button>

      <DesktopDivider />

      <DesktopLink to="/privacy-policy" label="Privacy Policy" />
      <DesktopLink to="/terms" label="Terms & Conditions" />
      <DesktopLink to="/refund-policy" label="Refund Policy" />

      <button
        type="button"
        onClick={handleLogout}
        className="w-full rounded-2xl px-4 py-3 text-left text-sm font-black text-red-500 transition-all hover:bg-red-50"
      >
        Sign Out
      </button>
    </>
  );
}

function DesktopLink({ to, label, highlight = false }) {
  return (
    <Link
      to={to}
      className={`block rounded-2xl px-4 py-3 text-sm font-black transition-all ${
        highlight
          ? "text-[#073B35] hover:bg-[#D7F5EF]"
          : "text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#073B35]"
      }`}
    >
      {label}
    </Link>
  );
}

function DesktopDivider() {
  return <div className="my-2 h-px bg-[#D7F5EF]" />;
}

function MobileDivider() {
  return <div className="my-2 h-px bg-[#D7F5EF]" />;
}

function MobileLink({ to, active, label, highlight = false }) {
  return (
    <Link
      to={to}
      className={`rounded-2xl border px-4 py-4 text-sm font-black transition-all ${
        active
          ? "border-[#41D3BD] bg-[#41D3BD] text-[#073B35]"
          : highlight
          ? "border-[#BDEFE6] bg-[#FFFFF2] text-[#073B35]"
          : "border-transparent text-[#51615D] hover:border-[#BDEFE6] hover:bg-[#D7F5EF] hover:text-[#073B35]"
      }`}
    >
      {label}
    </Link>
  );
}
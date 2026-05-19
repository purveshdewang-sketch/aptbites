import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { cartCount } = useCart();
  const { user, signOut, authLoading } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [switchingSeller, setSwitchingSeller] = useState(false);

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
        return;
      }

      const metadataRole = String(user?.user_metadata?.role || "").toLowerCase();

      if (metadataRole === "admin") {
        setIsAdmin(true);
      }

      if (metadataRole === "seller") {
        setIsSeller(true);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_seller")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setIsSeller(metadataRole === "seller");
        setIsAdmin(metadataRole === "admin");
        return;
      }

      const profileRole = String(data?.role || "").toLowerCase();

      setIsAdmin(profileRole === "admin" || metadataRole === "admin");
      setIsSeller(
        profileRole === "seller" ||
          profileRole === "admin" ||
          data?.is_seller === true ||
          metadataRole === "seller"
      );
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

  async function handleSwitchToSeller() {
    if (!user) return;

    const confirmSwitch = window.confirm(
      "Switch this account to a seller account? You will get access to Seller Dashboard."
    );

    if (!confirmSwitch) return;

    setSwitchingSeller(true);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      role: "seller",
      is_seller: true,
    });

    if (error) {
      alert(`Could not switch account: ${error.message}`);
      setSwitchingSeller(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        role: "seller",
      },
    });

    setIsSeller(true);
    setProfileOpen(false);
    setMobileMenuOpen(false);
    setSwitchingSeller(false);

    navigate("/seller-dashboard");
  }

  async function handleLogout() {
    await signOut();
    setProfileOpen(false);
    setMobileMenuOpen(false);
    setIsSeller(false);
    setIsAdmin(false);
    navigate("/");
  }

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Customer Care", path: "/customer-care" },
  ];

  function getInitial() {
    if (!user?.email) return "N";
    return user.email.charAt(0).toUpperCase();
  }

  function getAccountLabel() {
    if (isAdmin) return "Admin account";
    if (isSeller) return "Seller account";
    return "Customer account";
  }

  function LogoMark() {
    return (
      <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-[#FFFFF2] border border-[#41D3BD]/35 items-center justify-center overflow-hidden shadow-lg shadow-black/25 shrink-0">
        {!logoFailed ? (
          <img
            src="/Nefo-logo.png"
            alt="Nefo"
            className="w-full h-full object-contain p-1"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-[#073B35] font-black text-base">N</span>
        )}
      </div>
    );
  }

  function navLinkClass(path) {
    const isActive = location.pathname === path;

    return `text-sm font-semibold transition-all duration-200 ${
      isActive ? "text-[#41D3BD]" : "text-[#D7F5EF] hover:text-[#41D3BD]"
    }`;
  }

  function mobileLinkClass(path) {
    const isActive = location.pathname === path;

    return `px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
      isActive
        ? "bg-[#41D3BD] text-[#073B35]"
        : "text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D]"
    }`;
  }

  if (authLoading) {
    return (
      <header className="sticky top-0 z-50 bg-[#073B35] border-b border-[#0F5B51]">
        <div className="h-16 sm:h-[72px]" />
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#073B35]/96 backdrop-blur-2xl border-b border-[#0F5B51] shadow-lg shadow-[#073B35]/25">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 sm:h-[72px] flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group min-w-0">
              <LogoMark />

              <div className="leading-none min-w-0">
                <p className="text-[#FFFFF2] font-bold text-lg tracking-tight group-hover:text-[#41D3BD] transition-all truncate">
                  Nefo
                </p>

                <p className="text-[10px] text-[#BFE8E1] mt-1 tracking-wide uppercase truncate">
                  neighbourhood food
                </p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={navLinkClass(link.path)}
                >
                  {link.name}
                </Link>
              ))}

              {isAdmin && (
                <Link
                  to="/owner-dashboard"
                  className={navLinkClass("/owner-dashboard")}
                >
                  Owner Dashboard
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!user && (
                <Link
                  to="/customer-login"
                  className="hidden md:flex bg-[#41D3BD] hover:bg-[#55E4CF] active:scale-95 text-[#073B35] text-sm font-black px-5 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
                >
                  Sign In
                </Link>
              )}

              <Link
                to="/cart"
                className="relative bg-[#0B4A43] hover:bg-[#0F5B51] border border-[#14796D] hover:border-[#41D3BD] active:scale-95 text-[#FFFFF2] w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="text-lg">🛒</span>

                <span className="hidden sm:inline text-sm font-bold">
                  Cart
                </span>

                {cartCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-[#41D3BD] rounded-full flex items-center justify-center">
                    <span className="text-[#073B35] text-[11px] font-black">
                      {cartCount}
                    </span>
                  </div>
                )}
              </Link>

              {user ? (
                <>
                  <div className="relative hidden md:block" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="w-11 h-11 rounded-2xl bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black flex items-center justify-center transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
                    >
                      {getInitial()}
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 mt-3 w-72 bg-[#FFFFF2] border border-[#D7F5EF] rounded-3xl overflow-hidden shadow-2xl shadow-[#073B35]/25">
                        <div className="p-5 border-b border-[#D7F5EF]">
                          <p className="text-[#111827] font-semibold truncate">
                            {user.email}
                          </p>

                          <p className="text-[#51615D] text-sm mt-1">
                            {getAccountLabel()}
                          </p>
                        </div>

                        <div className="p-2">
                          <Link
                            to="/profile"
                            className="block px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D] transition-all"
                          >
                            My Profile
                          </Link>

                          <Link
                            to="/marketplace"
                            className="block px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D] transition-all"
                          >
                            Marketplace
                          </Link>

                          <Link
                            to="/orders"
                            className="block px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D] transition-all"
                          >
                            Active Orders
                          </Link>

                          <Link
                            to="/order-history"
                            className="block px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D] transition-all"
                          >
                            Order History
                          </Link>

                          <Link
                            to="/customer-care"
                            className="block px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D] transition-all"
                          >
                            Customer Care
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/owner-dashboard"
                              className="block px-4 py-3 rounded-2xl text-[#1A9F8D] hover:bg-[#D7F5EF] transition-all"
                            >
                              Owner Dashboard
                            </Link>
                          )}

                          {isSeller ? (
                            <Link
                              to="/seller-dashboard"
                              className="block px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D] transition-all"
                            >
                              Seller Dashboard
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSwitchToSeller}
                              disabled={switchingSeller}
                              className="w-full text-left px-4 py-3 rounded-2xl text-[#1A9F8D] hover:bg-[#D7F5EF] transition-all disabled:opacity-50"
                            >
                              {switchingSeller
                                ? "Switching..."
                                : "Switch to Seller Account"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden w-11 h-11 rounded-2xl bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black flex items-center justify-center transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
                  >
                    {getInitial()}
                  </button>
                </>
              ) : (
                <Link
                  to="/customer-login"
                  className="md:hidden w-11 h-11 rounded-2xl bg-[#41D3BD] hover:bg-[#55E4CF] text-[#073B35] font-black flex items-center justify-center transition-all duration-200 shadow-lg shadow-[#41D3BD]/20"
                >
                  →
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {mobileMenuOpen && user && (
        <div className="md:hidden fixed inset-0 z-[70] bg-[#073B35]/45 backdrop-blur-sm">
          <div
            ref={mobileDropdownRef}
            className="absolute top-[76px] right-4 left-4 bg-[#FFFFF2] border border-[#D7F5EF] rounded-[2rem] shadow-2xl shadow-[#073B35]/25 overflow-hidden"
          >
            <div className="p-5 border-b border-[#D7F5EF]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#41D3BD] text-[#073B35] font-black flex items-center justify-center shadow-lg shadow-[#41D3BD]/20">
                  {getInitial()}
                </div>

                <div className="min-w-0">
                  <p className="text-[#111827] font-semibold truncate">
                    {user.email}
                  </p>

                  <p className="text-[#51615D] text-sm mt-1">
                    {getAccountLabel()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 max-h-[75vh] overflow-y-auto">
              <div className="grid gap-1">
                <Link to="/" className={mobileLinkClass("/")}>
                  Home
                </Link>

                <Link
                  to="/marketplace"
                  className={mobileLinkClass("/marketplace")}
                >
                  Marketplace
                </Link>

                <Link to="/profile" className={mobileLinkClass("/profile")}>
                  My Profile
                </Link>

                <Link
                  to="/customer-care"
                  className={mobileLinkClass("/customer-care")}
                >
                  Customer Care
                </Link>

                {isAdmin && (
                  <Link
                    to="/owner-dashboard"
                    className={mobileLinkClass("/owner-dashboard")}
                  >
                    Owner Dashboard
                  </Link>
                )}

                <div className="h-px bg-[#D7F5EF] my-2" />

                <Link
                  to="/orders"
                  className="px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D]"
                >
                  Active Orders
                </Link>

                <Link
                  to="/order-history"
                  className="px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D]"
                >
                  Order History
                </Link>

                {isSeller ? (
                  <Link
                    to="/seller-dashboard"
                    className="px-4 py-3 rounded-2xl text-[#51615D] hover:bg-[#D7F5EF] hover:text-[#1A9F8D]"
                  >
                    Seller Dashboard
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleSwitchToSeller}
                    disabled={switchingSeller}
                    className="text-left px-4 py-3 rounded-2xl text-[#1A9F8D] hover:bg-[#D7F5EF] disabled:opacity-50"
                  >
                    {switchingSeller
                      ? "Switching..."
                      : "Switch to Seller Account"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 bg-red-50 text-red-500 font-bold px-4 py-3 rounded-2xl"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
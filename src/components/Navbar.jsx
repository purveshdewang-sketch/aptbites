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
  ];

  function getInitial() {
    if (!user?.email) return "Q";
    return user.email.charAt(0).toUpperCase();
  }

  function getAccountLabel() {
    if (isAdmin) return "Admin account";
    if (isSeller) return "Seller account";
    return "Customer account";
  }

  function LogoMark() {
    return (
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#55F3A5] to-[#A77BE8] flex items-center justify-center overflow-hidden shadow-lg shrink-0">
        {!logoFailed ? (
          <img
            src="/quickbites-logo.png"
            alt="QuickBites"
            className="w-full h-full object-cover"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-[#0F0D1F] font-black text-base">Q</span>
        )}
      </div>
    );
  }

  if (authLoading) {
    return (
      <header className="sticky top-0 z-50 bg-[#0d0b09] border-b border-[#241c16]">
        <div className="h-16 sm:h-[72px]" />
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0d0b09]/90 backdrop-blur-2xl border-b border-[#241c16]">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 sm:h-[72px] flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group min-w-0">
              <LogoMark />

              <div className="leading-none min-w-0">
                <p className="text-white font-bold text-lg tracking-tight group-hover:text-orange-300 transition-all truncate">
                  QuickBites
                </p>

                <p className="text-[10px] text-[#8f8379] mt-1 tracking-wide uppercase truncate">
                  neighbourhood food
                </p>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;

                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-orange-300"
                        : "text-[#9d9186] hover:text-orange-300"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  to="/owner-dashboard"
                  className={`text-sm font-medium transition-all duration-200 ${
                    location.pathname === "/owner-dashboard"
                      ? "text-orange-300"
                      : "text-[#9d9186] hover:text-orange-300"
                  }`}
                >
                  Owner Dashboard
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!user && (
                <Link
                  to="/customer-login"
                  className="hidden md:flex bg-orange-500 hover:bg-orange-400 active:scale-95 text-black text-sm font-bold px-5 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-orange-500/10"
                >
                  Sign In
                </Link>
              )}

              <Link
                to="/cart"
                className="relative bg-[#171310] hover:bg-[#211912] border border-[#2a211b] hover:border-orange-500/40 active:scale-95 text-white w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="text-lg">🛒</span>

                <span className="hidden sm:inline text-sm font-semibold">
                  Cart
                </span>

                {cartCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-black text-[11px] font-black">
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
                      className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black flex items-center justify-center transition-all duration-200 shadow-lg shadow-orange-500/10"
                    >
                      {getInitial()}
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 mt-3 w-72 bg-[#15110e] border border-[#2a211b] rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                        <div className="p-5 border-b border-[#2a211b]">
                          <p className="text-white font-semibold truncate">
                            {user.email}
                          </p>

                          <p className="text-[#8f8379] text-sm mt-1">
                            {getAccountLabel()}
                          </p>
                        </div>

                        <div className="p-2">
                          <Link
                            to="/profile"
                            className="block px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300 transition-all"
                          >
                            My Profile
                          </Link>

                          <Link
                            to="/marketplace"
                            className="block px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300 transition-all"
                          >
                            Marketplace
                          </Link>

                          <Link
                            to="/orders"
                            className="block px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300 transition-all"
                          >
                            Active Orders
                          </Link>

                          <Link
                            to="/order-history"
                            className="block px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300 transition-all"
                          >
                            Order History
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/owner-dashboard"
                              className="block px-4 py-3 rounded-2xl text-orange-300 hover:bg-orange-500/10 transition-all"
                            >
                              Owner Dashboard
                            </Link>
                          )}

                          {isSeller ? (
                            <Link
                              to="/seller-dashboard"
                              className="block px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300 transition-all"
                            >
                              Seller Dashboard
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSwitchToSeller}
                              disabled={switchingSeller}
                              className="w-full text-left px-4 py-3 rounded-2xl text-orange-300 hover:bg-orange-500/10 transition-all disabled:opacity-50"
                            >
                              {switchingSeller
                                ? "Switching..."
                                : "Switch to Seller Account"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all"
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
                    className="md:hidden w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black flex items-center justify-center transition-all duration-200 shadow-lg shadow-orange-500/10"
                  >
                    {getInitial()}
                  </button>
                </>
              ) : (
                <Link
                  to="/customer-login"
                  className="md:hidden w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black flex items-center justify-center transition-all duration-200 shadow-lg shadow-orange-500/10"
                >
                  →
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {mobileMenuOpen && user && (
        <div className="md:hidden fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm">
          <div
            ref={mobileDropdownRef}
            className="absolute top-[76px] right-4 left-4 bg-[#15110e] border border-[#2a211b] rounded-[2rem] shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="p-5 border-b border-[#2a211b]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500 text-black font-black flex items-center justify-center shadow-lg shadow-orange-500/10">
                  {getInitial()}
                </div>

                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">
                    {user.email}
                  </p>

                  <p className="text-[#8f8379] text-sm mt-1">
                    {getAccountLabel()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 max-h-[75vh] overflow-y-auto">
              <div className="grid gap-1">
                <Link
                  to="/"
                  className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    location.pathname === "/"
                      ? "bg-orange-500 text-black"
                      : "text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300"
                  }`}
                >
                  Home
                </Link>

                <Link
                  to="/marketplace"
                  className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    location.pathname === "/marketplace"
                      ? "bg-orange-500 text-black"
                      : "text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300"
                  }`}
                >
                  Marketplace
                </Link>

                <Link
                  to="/profile"
                  className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    location.pathname === "/profile"
                      ? "bg-orange-500 text-black"
                      : "text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300"
                  }`}
                >
                  My Profile
                </Link>

                {isAdmin && (
                  <Link
                    to="/owner-dashboard"
                    className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                      location.pathname === "/owner-dashboard"
                        ? "bg-orange-500 text-black"
                        : "text-orange-300 hover:bg-orange-500/10"
                    }`}
                  >
                    Owner Dashboard
                  </Link>
                )}

                <div className="h-px bg-[#2a211b] my-2" />

                <Link
                  to="/orders"
                  className="px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300"
                >
                  Active Orders
                </Link>

                <Link
                  to="/order-history"
                  className="px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300"
                >
                  Order History
                </Link>

                {isSeller ? (
                  <Link
                    to="/seller-dashboard"
                    className="px-4 py-3 rounded-2xl text-[#b8ada4] hover:bg-[#211912] hover:text-orange-300"
                  >
                    Seller Dashboard
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleSwitchToSeller}
                    disabled={switchingSeller}
                    className="text-left px-4 py-3 rounded-2xl text-orange-300 hover:bg-orange-500/10 disabled:opacity-50"
                  >
                    {switchingSeller
                      ? "Switching..."
                      : "Switch to Seller Account"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 bg-red-500/10 text-red-400 font-bold px-4 py-3 rounded-2xl"
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
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { cartCount } = useCart();
  const { user, signOut, authLoading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [switchingSeller, setSwitchingSeller] = useState(false);

  const dropdownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function checkSellerRole() {
      if (!user) {
        setIsSeller(false);
        return;
      }

      const metadataRole = String(
        user?.user_metadata?.role || ""
      ).toLowerCase();

      const localSellerAccess =
        localStorage.getItem(
          `quickbites_seller_access_${user.id}`
        ) === "yes";

      if (metadataRole === "seller" || localSellerAccess) {
        setIsSeller(true);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_seller")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setIsSeller(false);
        return;
      }

      const profileRole = String(
        data?.role || ""
      ).toLowerCase();

      const sellerAllowed =
        profileRole === "seller" ||
        data?.is_seller === true;

      setIsSeller(sellerAllowed);

      if (sellerAllowed) {
        localStorage.setItem(
          `quickbites_seller_access_${user.id}`,
          "yes"
        );
      }
    }

    checkSellerRole();
  }, [user, location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  async function handleSwitchToSeller() {
    if (!user) return;

    const confirmSwitch = window.confirm(
      "Switch this account to a seller account? You will get access to Seller Dashboard."
    );

    if (!confirmSwitch) return;

    setSwitchingSeller(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        role: "seller",
        is_seller: true,
      });

    if (error) {
      alert(
        `Could not switch account: ${error.message}`
      );

      setSwitchingSeller(false);
      return;
    }

    await supabase.auth.updateUser({
      data: {
        role: "seller",
      },
    });

    localStorage.setItem(
      `quickbites_seller_access_${user.id}`,
      "yes"
    );

    setIsSeller(true);
    setProfileOpen(false);
    setMenuOpen(false);
    setSwitchingSeller(false);

    navigate("/seller-dashboard");
  }

  async function handleLogout() {
    if (user?.id) {
      localStorage.removeItem(
        `quickbites_seller_access_${user.id}`
      );
    }

    await signOut();

    setProfileOpen(false);
    setMenuOpen(false);
    setIsSeller(false);

    navigate("/");
  }

  const navLinks = [
    {
      name: "Home",
      path: "/",
    },
    {
      name: "Marketplace",
      path: "/marketplace",
    },
  ];

  function getInitial() {
    if (!user?.email) return "Q";

    return user.email.charAt(0).toUpperCase();
  }

  if (authLoading) {
    return (
      <header className="sticky top-0 z-50 bg-black border-b border-[#1d1d1d]">
        <div className="h-16 sm:h-[72px]" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-[#1d1d1d]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 sm:h-[72px] flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-2xl bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <span className="text-black font-black text-sm">
                Q
              </span>
            </div>

            <div className="leading-none">
              <p className="text-white font-bold text-lg tracking-tight group-hover:text-yellow-400 transition-all">
                QuickBites
              </p>

              <p className="text-[10px] text-gray-500 mt-1 tracking-wide uppercase">
                Apartment Food
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.path;

              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-yellow-400"
                      : "text-gray-400 hover:text-yellow-400"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {!user && (
              <Link
                to="/customer-login"
                className="hidden md:flex bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black text-sm font-bold px-5 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-yellow-500/10"
              >
                Sign In
              </Link>
            )}

            {user && (
              <div
                className="relative hidden md:block"
                ref={dropdownRef}
              >
                <button
                  type="button"
                  onClick={() =>
                    setProfileOpen(!profileOpen)
                  }
                  className="w-11 h-11 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-black flex items-center justify-center transition-all duration-200"
                >
                  {getInitial()}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-72 bg-[#111111] border border-[#222] rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                    <div className="p-5 border-b border-[#222]">
                      <p className="text-white font-semibold truncate">
                        {user.email}
                      </p>

                      <p className="text-gray-500 text-sm mt-1">
                        {isSeller
                          ? "Seller account"
                          : "Customer account"}
                      </p>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/marketplace"
                        className="block px-4 py-3 rounded-2xl text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all"
                      >
                        Marketplace
                      </Link>

                      <Link
                        to="/orders"
                        className="block px-4 py-3 rounded-2xl text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all"
                      >
                        Active Orders
                      </Link>

                      <Link
                        to="/order-history"
                        className="block px-4 py-3 rounded-2xl text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all"
                      >
                        Order History
                      </Link>

                      {isSeller ? (
                        <Link
                          to="/seller-dashboard"
                          className="block px-4 py-3 rounded-2xl text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all"
                        >
                          Seller Dashboard
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSwitchToSeller}
                          disabled={switchingSeller}
                          className="w-full text-left px-4 py-3 rounded-2xl text-yellow-400 hover:bg-yellow-500/10 transition-all disabled:opacity-50"
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
            )}

            <Link
              to="/cart"
              className="relative bg-[#151515] hover:bg-[#1d1d1d] border border-[#2a2a2a] hover:border-yellow-500/40 active:scale-95 text-white px-3 sm:px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2"
            >
              <span className="text-lg">🛒</span>

              <span className="hidden sm:inline text-sm font-semibold">
                Cart
              </span>

              {cartCount > 0 && (
                <div className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-black text-[11px] font-black">
                    {cartCount}
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-11 h-11 rounded-2xl bg-[#151515] border border-[#2a2a2a] hover:border-yellow-500/40 flex items-center justify-center text-yellow-400 transition-all duration-200"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
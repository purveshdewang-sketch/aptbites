import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { cartCount } = useCart();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);

  const dropdownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    setProfileOpen(false);

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
    {
      name: "Seller",
      path: "/seller-dashboard",
    },
  ];

  function getInitial() {
    if (!user?.email) return "A";

    return user.email.charAt(0).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-[#1d1d1d]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 sm:h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-2xl bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <span className="text-black font-black text-sm">
                A
              </span>
            </div>

            <div className="leading-none">
              <p className="text-white font-bold text-lg tracking-tight group-hover:text-yellow-400 transition-all">
                AptBites
              </p>

              <p className="text-[10px] text-gray-500 mt-1 tracking-wide uppercase">
                Apartment Food
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
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

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Not Logged In */}
            {!user && (
              <Link
                to="/customer-login"
                className="hidden md:flex bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black text-sm font-bold px-5 py-2.5 rounded-2xl transition-all duration-200 shadow-lg shadow-yellow-500/10"
              >
                Sign In
              </Link>
            )}

            {/* Logged In Profile */}
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
                  <div className="absolute right-0 mt-3 w-64 bg-[#111111] border border-[#222] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 animate-[fadeIn_.18s_ease]">
                    <div className="p-5 border-b border-[#222]">
                      <p className="text-white font-semibold truncate">
                        {user.email}
                      </p>

                      <p className="text-gray-500 text-sm mt-1">
                        Logged in
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
                        to="/seller-dashboard"
                        className="block px-4 py-3 rounded-2xl text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all"
                      >
                        Seller Dashboard
                      </Link>

                      <Link
                        to="/orders"
                        className="block px-4 py-3 rounded-2xl text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all"
                      >
                        Order History
                      </Link>

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

            {/* Cart */}
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

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-11 h-11 rounded-2xl bg-[#151515] border border-[#2a2a2a] hover:border-yellow-500/40 flex items-center justify-center text-yellow-400 transition-all duration-200"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 animate-[fadeIn_.2s_ease]">
            <div className="bg-[#111111] border border-[#222] rounded-3xl p-3 shadow-2xl shadow-black/40">
              <div className="grid gap-1">
                {navLinks.map((link) => {
                  const isActive =
                    location.pathname === link.path;

                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-yellow-500 text-black"
                          : "text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}

                <div className="h-px bg-[#222] my-2" />

                {!user ? (
                  <Link
                    to="/customer-login"
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-3 rounded-2xl text-center transition-all duration-200"
                  >
                    Sign In
                  </Link>
                ) : (
                  <>
                    <div className="px-4 py-3">
                      <p className="text-white font-semibold truncate">
                        {user.email}
                      </p>

                      <p className="text-gray-500 text-sm mt-1">
                        Logged in
                      </p>
                    </div>

                    <Link
                      to="/orders"
                      className="px-4 py-3 rounded-2xl text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all"
                    >
                      Order History
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-2 bg-red-500/10 text-red-400 font-bold px-4 py-3 rounded-2xl transition-all duration-200"
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
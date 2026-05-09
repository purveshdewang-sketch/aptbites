import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/customer-login"
                className="text-sm text-gray-400 hover:text-yellow-400 transition-all"
              >
                Login
              </Link>

              <Link
                to="/seller-login"
                className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black text-sm font-bold px-4 py-2 rounded-2xl transition-all duration-200"
              >
                Sign Up
              </Link>
            </div>

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

                <Link
                  to="/customer-login"
                  className="px-4 py-3 rounded-2xl text-sm font-medium text-gray-300 hover:bg-[#1a1a1a] hover:text-yellow-400 transition-all duration-200"
                >
                  Login
                </Link>

                <Link
                  to="/seller-login"
                  className="mt-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-4 py-3 rounded-2xl text-center transition-all duration-200"
                >
                  Become a Seller
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
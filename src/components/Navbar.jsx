import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-[#222]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            onClick={closeMenu}
            className="text-2xl font-bold text-yellow-400 hover:text-yellow-300 transition-all duration-200"
          >
            AptBites
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link className="text-gray-300 hover:text-yellow-400 transition-all" to="/">
              Home
            </Link>

            <Link className="text-gray-300 hover:text-yellow-400 transition-all" to="/marketplace">
              Marketplace
            </Link>

            <Link className="text-gray-300 hover:text-yellow-400 transition-all" to="/seller-dashboard">
              Seller Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              onClick={closeMenu}
              className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200"
            >
              <span className="hidden sm:inline">Cart</span>
              <span className="sm:hidden">🛒</span>

              <span className="bg-black text-yellow-400 text-xs px-2 py-1 rounded-full">
                {cartCount}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden border border-[#333] text-yellow-400 hover:border-yellow-500 hover:bg-[#111] rounded-xl px-3 py-2 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>

            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/customer-login"
                className="text-gray-300 hover:text-yellow-400 transition-all duration-200"
              >
                Login
              </Link>

              <Link
                to="/seller-login"
                className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded-xl font-semibold transition-all duration-200"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden mt-4 bg-[#111111] border border-[#2a2a2a] rounded-3xl p-4 shadow-2xl shadow-yellow-500/10">
            <div className="grid gap-2">
              <Link
                onClick={closeMenu}
                to="/"
                className="px-4 py-3 rounded-2xl text-gray-300 hover:bg-black hover:text-yellow-400 transition-all"
              >
                Home
              </Link>

              <Link
                onClick={closeMenu}
                to="/marketplace"
                className="px-4 py-3 rounded-2xl text-gray-300 hover:bg-black hover:text-yellow-400 transition-all"
              >
                Marketplace
              </Link>

              <Link
                onClick={closeMenu}
                to="/customer-login"
                className="px-4 py-3 rounded-2xl text-gray-300 hover:bg-black hover:text-yellow-400 transition-all"
              >
                Login
              </Link>

              <Link
                onClick={closeMenu}
                to="/seller-login"
                className="px-4 py-3 rounded-2xl text-gray-300 hover:bg-black hover:text-yellow-400 transition-all"
              >
                Sign Up
              </Link>

              <Link
                onClick={closeMenu}
                to="/seller-dashboard"
                className="mt-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-3 rounded-2xl text-center transition-all"
              >
                Seller Dashboard
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { cartCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-[#222]">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
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

        <div className="flex items-center gap-3">
          <Link
            to="/customer-login"
            className="hidden sm:block text-gray-300 hover:text-yellow-400 transition-all duration-200"
          >
            Login
          </Link>

          <Link
            to="/seller-login"
            className="hidden sm:block border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded-xl font-semibold transition-all duration-200"
          >
            Sign Up
          </Link>

          <Link
            to="/cart"
            className="bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200"
          >
            Cart

            <span className="bg-black text-yellow-400 text-xs px-2 py-1 rounded-full">
              {cartCount}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../../../context/CartContext";

export default function BottomNavigation({
  mode = "customer",
  orderCount = 0,
  chatCount = 0,
}) {
  const location = useLocation();
  const { cartCount } = useCart();

  const customerItems = [
    { label: "Home", icon: "🏠", path: "/" },
    { label: "Food", icon: "🍲", path: "/marketplace" },
    { label: "Cart", icon: "🛒", path: "/cart", badge: cartCount },
    { label: "Orders", icon: "📦", path: "/orders", badge: orderCount },
    { label: "Profile", icon: "👤", path: "/profile" },
  ];

  const sellerItems = [
    { label: "Home", icon: "🏠", path: "/" },
    { label: "Orders", icon: "📦", path: "/seller-dashboard", badge: orderCount },
    { label: "Menu", icon: "🍛", path: "/seller-dashboard" },
    { label: "Chat", icon: "💬", path: "/seller-helper", badge: chatCount },
    { label: "Profile", icon: "👤", path: "/profile" },
  ];

  const adminItems = [
    { label: "Home", icon: "🏠", path: "/" },
    { label: "Owner", icon: "📊", path: "/owner-dashboard" },
    { label: "Money", icon: "💰", path: "/owner-accounting" },
    { label: "Sellers", icon: "👨‍🍳", path: "/owner-seller-applications" },
    { label: "Profile", icon: "👤", path: "/profile" },
  ];

  const items =
    mode === "seller" ? sellerItems : mode === "admin" ? adminItems : customerItems;

  function isActive(path) {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white/95 backdrop-blur-xl border-t border-[#D7F5EF] shadow-lg shadow-[#073B35]/10 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 max-w-5xl mx-auto px-1">
          {items.map((item) => {
            const active = isActive(item.path);
            const badge = Number(item.badge || 0);

            return (
              <Link
                key={`${item.label}-${item.path}`}
                to={item.path}
                className="relative h-[68px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <div
                  className={`relative min-w-10 h-8 px-2 rounded-full flex items-center justify-center transition-all ${
                    active ? "bg-[#EFFFFB]" : "bg-transparent"
                  }`}
                >
                  <span className="text-xl leading-none">{item.icon}</span>

                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#41D3BD] text-[#073B35] text-[10px] font-black flex items-center justify-center border border-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[11px] font-black leading-none ${
                    active ? "text-[#073B35]" : "text-[#7A8A86]"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
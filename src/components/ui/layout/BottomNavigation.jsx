import { Link, useLocation } from "react-router-dom";
import { useCart } from "../../../context/CartContext";

export default function BottomNavigation({
  mode = "customer",
  orderCount = 0,
  chatCount = 0,
  className = "",
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
    {
      label: "Orders",
      icon: "📦",
      path: "/seller-dashboard",
      badge: orderCount,
    },
    { label: "Menu", icon: "🍛", path: "/seller-dashboard" },
    { label: "Chat", icon: "💬", path: "/seller-helper", badge: chatCount },
    { label: "Profile", icon: "👤", path: "/profile" },
  ];

  const adminItems = [
    { label: "Home", icon: "🏠", path: "/" },
    { label: "Owner", icon: "📊", path: "/owner-dashboard" },
    { label: "Money", icon: "💰", path: "/owner-accounting" },
    {
      label: "Sellers",
      icon: "👨‍🍳",
      path: "/owner-seller-applications",
    },
    { label: "Profile", icon: "👤", path: "/profile" },
  ];

  const items =
    mode === "seller"
      ? sellerItems
      : mode === "admin"
      ? adminItems
      : customerItems;

  function isActive(path) {
    if (path === "/") return location.pathname === "/";

    if (path === "/seller-dashboard") {
      return location.pathname === "/seller-dashboard";
    }

    return location.pathname.startsWith(path);
  }

  return (
    <nav
      className={`
        fixed
        bottom-0
        left-0
        right-0
        z-[900]
        md:hidden
        ${className}
      `}
    >
      <div className="border-t border-[#D7F5EF] bg-[#FFFFF2]/95 shadow-[0_-8px_24px_rgba(7,59,53,0.08)] backdrop-blur-xl">
        <div className="mx-auto grid h-[72px] max-w-md grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
          {items.map((item) => {
            const active = isActive(item.path);
            const badge = Number(item.badge || 0);

            return (
              <Link
                key={`${item.label}-${item.path}`}
                to={item.path}
                className="relative flex h-[72px] flex-col items-center justify-center gap-1 rounded-2xl transition-all active:scale-95"
                aria-label={item.label}
              >
                <div
                  className={`
                    relative
                    flex
                    h-9
                    min-w-10
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    px-2
                    transition-all
                    ${
                      active
                        ? "border-[#BDEFE6] bg-[#D7F5EF] shadow-[4px_4px_10px_rgba(7,59,53,0.08),-4px_-4px_10px_rgba(255,255,255,0.9)]"
                        : "border-transparent bg-transparent"
                    }
                  `}
                >
                  <span className="text-xl leading-none">{item.icon}</span>

                  {badge > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border border-[#073B35] bg-[#41D3BD] px-1 text-[10px] font-black text-[#073B35]">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </div>

                <span
                  className={`
                    text-[10px]
                    font-black
                    leading-none
                    ${
                      active
                        ? "text-[#073B35]"
                        : "text-[#7A8A86] hover:text-[#073B35]"
                    }
                  `}
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